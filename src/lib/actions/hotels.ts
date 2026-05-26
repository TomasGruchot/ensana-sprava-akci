"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertHotelPermission } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getActorInfo, logAudit } from "@/lib/audit";
import type { ActionState } from "@/types";

const BUCKET = "hotel-images";

async function ensureBucket() {
  const admin = createAdminClient();
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: true });
  }
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nejste přihlášeni");
  return user;
}

export async function uploadHotelImage(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  try {
    await requireUser();
  } catch {
    return { error: "Nejste přihlášeni" };
  }

  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) return { error: "Žádný soubor" };

  try {
    await ensureBucket();
  } catch {
    /* bucket mohl být již vytvořen */
  }

  const admin = createAdminClient();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: "image/webp",
    upsert: true,
  });

  if (error) return { error: error.message };

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(path);

  return { url: publicUrl };
}

const HotelSchema = z.object({
  name: z.string().min(1, "Název je povinný"),
  code: z
    .string()
    .min(1, "Zkratka je povinná")
    .max(6, "Zkratka může mít max. 6 znaků")
    .toUpperCase(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Neplatná barva"),
  imageUrl: z.string().optional(),
  rooms: z.string().optional(),
});

const RoomSchema = z.object({
  hotelId: z.string().min(1, "Vyberte hotel"),
  name: z.string().trim().min(1, "Název místnosti je povinný"),
  color: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^#[0-9a-fA-F]{6}$/.test(value), "Neplatná barva"),
});

type RoomEntry = { id?: string; name: string; color?: string };

export async function saveHotel(
  hotelId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser();
  } catch {
    return { error: "Nejste přihlášeni" };
  }

  const raw = Object.fromEntries(formData);
  const parsed = HotelSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const { name, code, color, imageUrl, rooms: roomsJson } = parsed.data;

  let pendingRooms: RoomEntry[] = [];
  let removedRoomIds: string[] = [];
  if (roomsJson) {
    try {
      const parsed = JSON.parse(roomsJson) as {
        rooms: RoomEntry[];
        removed: string[];
      };
      pendingRooms = parsed.rooms ?? [];
      removedRoomIds = parsed.removed ?? [];
    } catch {
      /* ignoruj neplatný JSON */
    }
  }

  const actor = await getActorInfo(user.id);

  if (hotelId) {
    const allowed = await assertHotelPermission("canUpdateHotels", hotelId);
    if ("error" in allowed) return { error: allowed.error };

    const before = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: { rooms: { select: { id: true, name: true } } },
    });

    await prisma.hotel.update({
      where: { id: hotelId },
      data: { name, code: code.toUpperCase(), color, imageUrl: imageUrl || null },
    });

    if (removedRoomIds.length > 0) {
      await prisma.room.deleteMany({
        where: { id: { in: removedRoomIds }, hotelId },
      });
    }

    const newRooms = pendingRooms.filter((r) => !r.id && r.name.trim());
    if (newRooms.length > 0) {
      await prisma.room.createMany({
        data: newRooms.map((r) => ({
          hotelId,
          name: r.name.trim(),
          color: r.color ?? null,
        })),
        skipDuplicates: true,
      });
    }

    const existingRooms = pendingRooms.filter((r) => r.id && r.name.trim());
    for (const r of existingRooms) {
      await prisma.room.update({
        where: { id: r.id },
        data: { color: r.color ?? null },
      });
    }

    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      action: "HOTEL_UPDATE",
      entityType: "hotel",
      entityId: hotelId,
      entityLabel: name,
      before: before
        ? {
            name: before.name,
            code: before.code,
            color: before.color,
            imageUrl: before.imageUrl,
            rooms: before.rooms.map((r) => r.name),
          }
        : null,
      after: {
        name,
        code: code.toUpperCase(),
        color,
        imageUrl: imageUrl || null,
        addedRooms: newRooms.map((r) => r.name),
        removedRoomIds,
      },
    });
  } else {
    const allowed = await assertHotelPermission("canCreateHotels");
    if ("error" in allowed) return { error: allowed.error };

    const hotel = await prisma.hotel.create({
      data: {
        name,
        code: code.toUpperCase(),
        color,
        imageUrl: imageUrl || null,
      },
    });

    const newRooms = pendingRooms.filter((r) => r.name.trim());
    if (newRooms.length > 0) {
      await prisma.room.createMany({
        data: newRooms.map((r) => ({
          hotelId: hotel.id,
          name: r.name.trim(),
          color: r.color ?? null,
        })),
        skipDuplicates: true,
      });
    }

    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      action: "HOTEL_CREATE",
      entityType: "hotel",
      entityId: hotel.id,
      entityLabel: name,
      after: {
        name,
        code: code.toUpperCase(),
        color,
        imageUrl: imageUrl || null,
        rooms: newRooms.map((r) => r.name),
      },
    });
  }

  revalidatePath("/hotely");
  revalidatePath("/");
  revalidatePath("/akce");
  return { success: true };
}

export async function deleteHotel(id: string): Promise<ActionState> {
  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser();
  } catch {
    return { error: "Nejste přihlášeni" };
  }

  const allowed = await assertHotelPermission("canDeleteHotels", id);
  if ("error" in allowed) return { error: allowed.error };

  const hotel = await prisma.hotel.findUnique({
    where: { id },
    include: { rooms: { select: { name: true } } },
  });

  await prisma.hotel.delete({ where: { id } });

  const actor = await getActorInfo(user.id);
  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    actorName: actor.name,
    action: "HOTEL_DELETE",
    entityType: "hotel",
    entityId: id,
    entityLabel: hotel?.name ?? id,
    before: hotel
      ? {
          name: hotel.name,
          code: hotel.code,
          color: hotel.color,
          rooms: hotel.rooms.map((r) => r.name),
        }
      : null,
  });

  revalidatePath("/hotely");
  revalidatePath("/");
  revalidatePath("/akce");
  return { success: true };
}

export async function saveRoom(
  roomId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser();
  } catch {
    return { error: "Nejste přihlášeni" };
  }

  const raw = Object.fromEntries(formData);
  const parsed = RoomSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { hotelId, name, color } = parsed.data;
  const normalizedColor = color || null;

  const actor = await getActorInfo(user.id);

  if (roomId) {
    const existing = await prisma.room.findUnique({
      where: { id: roomId },
      include: { hotel: true },
    });
    if (!existing) return { error: "Místnost nebyla nalezena" };

    const allowed = await assertHotelPermission("canUpdateHotels", existing.hotelId);
    if ("error" in allowed) return { error: allowed.error };

    if (existing.hotelId !== hotelId) {
      const targetAllowed = await assertHotelPermission("canUpdateHotels", hotelId);
      if ("error" in targetAllowed) return { error: targetAllowed.error };
    }

    const duplicate = await prisma.room.findFirst({
      where: {
        hotelId,
        name,
        NOT: { id: roomId },
      },
      select: { id: true },
    });
    if (duplicate) {
      return {
        fieldErrors: {
          name: ["V tomto hotelu už místnost s tímto názvem existuje"],
        },
      };
    }

    const updated = await prisma.room.update({
      where: { id: roomId },
      data: {
        hotelId,
        name,
        color: normalizedColor,
      },
      include: { hotel: true },
    });

    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      action: "ROOM_UPDATE",
      entityType: "room",
      entityId: updated.id,
      entityLabel: updated.name,
      before: {
        name: existing.name,
        color: existing.color,
        hotelId: existing.hotelId,
        hotelName: existing.hotel.name,
      },
      after: {
        name: updated.name,
        color: updated.color,
        hotelId: updated.hotelId,
        hotelName: updated.hotel.name,
      },
    });
  } else {
    const allowed = await assertHotelPermission("canUpdateHotels", hotelId);
    if ("error" in allowed) return { error: allowed.error };

    const duplicate = await prisma.room.findFirst({
      where: { hotelId, name },
      select: { id: true },
    });
    if (duplicate) {
      return {
        fieldErrors: {
          name: ["V tomto hotelu už místnost s tímto názvem existuje"],
        },
      };
    }

    const room = await prisma.room.create({
      data: {
        hotelId,
        name,
        color: normalizedColor,
      },
      include: { hotel: true },
    });

    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      action: "ROOM_CREATE",
      entityType: "room",
      entityId: room.id,
      entityLabel: room.name,
      after: {
        name: room.name,
        color: room.color,
        hotelId: room.hotelId,
        hotelName: room.hotel.name,
      },
    });
  }

  revalidatePath("/hotely");
  revalidatePath("/");
  revalidatePath("/akce");
  return { success: true };
}

export async function deleteRoom(id: string): Promise<ActionState> {
  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser();
  } catch {
    return { error: "Nejste přihlášeni" };
  }

  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      hotel: true,
      _count: { select: { events: true } },
    },
  });
  if (!room) return { error: "Místnost nebyla nalezena" };

  const allowed = await assertHotelPermission("canUpdateHotels", room.hotelId);
  if ("error" in allowed) return { error: allowed.error };

  await prisma.room.delete({ where: { id } });

  const actor = await getActorInfo(user.id);
  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    actorName: actor.name,
    action: "ROOM_DELETE",
    entityType: "room",
    entityId: id,
    entityLabel: room.name,
    before: {
      name: room.name,
      color: room.color,
      hotelId: room.hotelId,
      hotelName: room.hotel.name,
      eventsCount: room._count.events,
    },
  });

  revalidatePath("/hotely");
  revalidatePath("/");
  revalidatePath("/akce");
  return { success: true };
}

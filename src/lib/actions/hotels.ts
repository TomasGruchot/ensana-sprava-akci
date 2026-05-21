"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertHotelPermission } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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

type RoomEntry = { id?: string; name: string };

export async function saveHotel(
  hotelId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireUser();
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

  if (hotelId) {
    const allowed = await assertHotelPermission("canUpdateHotels", hotelId);
    if ("error" in allowed) return { error: allowed.error };

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
        data: newRooms.map((r) => ({ hotelId, name: r.name.trim() })),
        skipDuplicates: true,
      });
    }
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
        data: newRooms.map((r) => ({ hotelId: hotel.id, name: r.name.trim() })),
        skipDuplicates: true,
      });
    }
  }

  revalidatePath("/hotely");
  revalidatePath("/");
  revalidatePath("/akce");
  return { success: true };
}

export async function deleteHotel(id: string): Promise<ActionState> {
  try {
    await requireUser();
  } catch {
    return { error: "Nejste přihlášeni" };
  }

  const allowed = await assertHotelPermission("canDeleteHotels", id);
  if ("error" in allowed) return { error: allowed.error };

  await prisma.hotel.delete({ where: { id } });

  revalidatePath("/hotely");
  revalidatePath("/");
  revalidatePath("/akce");
  return { success: true };
}

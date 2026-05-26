"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { parseInputDate } from "@/lib/date";
import { assertEventPermission } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getActorInfo, logAudit } from "@/lib/audit";
import type { ActionState } from "@/types";

function parseEventDate(value: string): Date | null {
  return parseInputDate(value);
}

function parseRoomIds(formData: FormData): string[] {
  return [
    ...new Set(
      formData
        .getAll("roomIds")
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  ];
}

const ATTACHMENT_BUCKET = "event-attachments";
const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

type UploadedAttachment = {
  name: string;
  path: string;
  url: string;
  mimeType: string | null;
  size: number;
};

async function ensureAttachmentBucket() {
  const admin = createAdminClient();
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((bucket) => bucket.name === ATTACHMENT_BUCKET)) {
    await admin.storage.createBucket(ATTACHMENT_BUCKET, { public: true });
  }
}

function getAttachmentFile(formData: FormData): File | null {
  const value = formData.get("attachment");
  return value instanceof File && value.size > 0 ? value : null;
}

function parseRemoveAttachment(value: FormDataEntryValue | null): boolean {
  return value === "true" || value === "on";
}

function sanitizeAttachmentName(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "soubor"
  );
}

function toAttachmentFields(attachment: UploadedAttachment | null) {
  return {
    attachmentName: attachment?.name ?? null,
    attachmentPath: attachment?.path ?? null,
    attachmentUrl: attachment?.url ?? null,
    attachmentMimeType: attachment?.mimeType ?? null,
    attachmentSize: attachment?.size ?? null,
  };
}

async function uploadEventAttachment(
  file: File,
  userId: string,
): Promise<{ data?: UploadedAttachment; error?: string }> {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return { error: "Příloha může mít maximálně 25 MB" };
  }

  try {
    await ensureAttachmentBucket();
  } catch {
    /* bucket mohl být již vytvořen */
  }

  const admin = createAdminClient();
  const safeName = sanitizeAttachmentName(file.name || "soubor");
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage.from(ATTACHMENT_BUCKET).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) return { error: error.message };

  const {
    data: { publicUrl },
  } = admin.storage.from(ATTACHMENT_BUCKET).getPublicUrl(path);

  return {
    data: {
      name: file.name || safeName,
      path,
      url: publicUrl,
      mimeType: file.type || null,
      size: file.size,
    },
  };
}

async function cleanupUploadedAttachment(path: string) {
  const admin = createAdminClient();
  await admin.storage.from(ATTACHMENT_BUCKET).remove([path]);
}

async function removeAttachmentIfUnused(path: string) {
  const usageCount = await prisma.event.count({
    where: { attachmentPath: path },
  });
  if (usageCount > 0) return;

  const admin = createAdminClient();
  await admin.storage.from(ATTACHMENT_BUCKET).remove([path]);
}

const EventSchema = z
  .object({
    title: z.string().min(1, "Název akce je povinný"),
    roomIds: z.array(z.string().min(1)).min(1, "Vyberte alespoň jednu místnost"),
    date: z.string().min(1, "Datum je povinné"),
    dateEnd: z.string().optional(),
    allDay: z.string().optional(),
    timeStart: z.string().optional(),
    timeEnd: z.string().optional(),
    contactPerson: z.string().optional(),
    contactInfo: z.string().optional(),
    attendees: z.string().optional(),
    description: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const start = parseEventDate(data.date);
    const end = data.dateEnd?.trim() ? parseEventDate(data.dateEnd) : start;
    if (!start) {
      ctx.addIssue({ code: "custom", message: "Neplatné datum", path: ["date"] });
      return;
    }
    if (data.dateEnd?.trim() && !end) {
      ctx.addIssue({ code: "custom", message: "Neplatné datum", path: ["dateEnd"] });
      return;
    }
    if (end && end < start) {
      ctx.addIssue({
        code: "custom",
        message: "Datum „do“ musí být stejné nebo pozdější než „od“",
        path: ["dateEnd"],
      });
    }
  });

function parseAllDay(value: string | undefined): boolean {
  return value === "true" || value === "on";
}

function normalizeEventTimes(
  allDay: boolean,
  timeStart?: string,
  timeEnd?: string,
): { timeStart: string | null; timeEnd: string | null } {
  if (allDay) return { timeStart: null, timeEnd: null };
  return {
    timeStart: timeStart?.trim() || null,
    timeEnd: timeEnd?.trim() || null,
  };
}

function parseEventDates(
  date: string,
  dateEnd?: string,
): { start: Date; end: Date | null } | null {
  const start = parseEventDate(date);
  if (!start) return null;
  const endRaw = dateEnd?.trim();
  if (!endRaw) return { start, end: null };
  const end = parseEventDate(endRaw);
  if (!end) return null;
  return { start, end };
}

export async function saveEvent(
  prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formData.get("eventId") as string | null;
  if (id) {
    return updateEvent(id, prev, formData);
  }
  return createEvent(prev, formData);
}

export async function createEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni" };

  const raw = {
    ...Object.fromEntries(formData),
    roomIds: parseRoomIds(formData),
  };
  const parsed = EventSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const {
    title,
    roomIds,
    date,
    dateEnd,
    allDay: allDayRaw,
    timeStart,
    timeEnd,
    contactPerson,
    contactInfo,
    attendees,
    description,
  } = parsed.data;
  const attachmentFile = getAttachmentFile(formData);

  for (const roomId of roomIds) {
    const allowed = await assertEventPermission("canCreateEvents", roomId);
    if ("error" in allowed) return { error: allowed.error };
  }

  const dates = parseEventDates(date, dateEnd);
  if (!dates) {
    return { fieldErrors: { date: ["Neplatné datum"] } };
  }

  const allDay = parseAllDay(allDayRaw);
  const times = normalizeEventTimes(allDay, timeStart, timeEnd);
  let uploadedAttachment: UploadedAttachment | null = null;

  if (attachmentFile) {
    const uploadResult = await uploadEventAttachment(attachmentFile, user.id);
    if (uploadResult.error) {
      return { fieldErrors: { attachment: [uploadResult.error] } };
    }
    uploadedAttachment = uploadResult.data ?? null;
  }

  const eventData = {
    title,
    date: dates.start,
    dateEnd: dates.end,
    allDay,
    timeStart: times.timeStart,
    timeEnd: times.timeEnd,
    contactPerson: contactPerson || null,
    contactInfo: contactInfo || null,
    attendees: attendees ? parseInt(attendees) : null,
    description: description || null,
    ...toAttachmentFields(uploadedAttachment),
    createdBy: user.id,
  };

  const created = await (async () => {
    try {
      return await prisma.$transaction(
        roomIds.map((roomId) =>
          prisma.event.create({
            data: { ...eventData, roomId },
            include: { room: { include: { hotel: true } } },
          }),
        ),
      );
    } catch (error) {
      if (uploadedAttachment?.path) {
        await cleanupUploadedAttachment(uploadedAttachment.path);
      }
      throw error;
    }
  })();

  const actor = await getActorInfo(user.id);
  for (const ev of created) {
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      action: "EVENT_CREATE",
      entityType: "event",
      entityId: ev.id,
      entityLabel: ev.title,
      after: {
        title: ev.title,
        date: ev.date.toISOString(),
        dateEnd: ev.dateEnd?.toISOString() ?? null,
        allDay: ev.allDay,
        timeStart: ev.timeStart,
        timeEnd: ev.timeEnd,
        contactPerson: ev.contactPerson,
        contactInfo: ev.contactInfo,
        attendees: ev.attendees,
        description: ev.description,
        attachmentName: ev.attachmentName,
        attachmentUrl: ev.attachmentUrl,
        attachmentMimeType: ev.attachmentMimeType,
        attachmentSize: ev.attachmentSize,
        room: ev.room.name,
        hotel: ev.room.hotel.name,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/akce");
  return { success: true, createdCount: roomIds.length };
}

export async function updateEvent(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni" };

  const existing = await prisma.event.findUnique({
    where: { id },
    include: { room: { include: { hotel: true } } },
  });
  if (!existing) return { error: "Akce nenalezena" };

  const raw = {
    ...Object.fromEntries(formData),
    roomIds: parseRoomIds(formData),
  };
  const parsed = EventSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const {
    title,
    roomIds,
    date,
    dateEnd,
    allDay: allDayRaw,
    timeStart,
    timeEnd,
    contactPerson,
    contactInfo,
    attendees,
    description,
  } = parsed.data;
  const attachmentFile = getAttachmentFile(formData);
  const removeAttachment = parseRemoveAttachment(formData.get("removeAttachment"));

  const primaryRoomId = roomIds.includes(existing.roomId)
    ? existing.roomId
    : roomIds[0];
  const extraRoomIds = roomIds.filter((rid) => rid !== primaryRoomId);

  for (const roomId of [primaryRoomId, ...extraRoomIds]) {
    const key = roomId === primaryRoomId ? "canUpdateEvents" : "canCreateEvents";
    const allowed = await assertEventPermission(key, roomId);
    if ("error" in allowed) return { error: allowed.error };
  }

  const dates = parseEventDates(date, dateEnd);
  if (!dates) {
    return { fieldErrors: { date: ["Neplatné datum"] } };
  }

  const allDay = parseAllDay(allDayRaw);
  const times = normalizeEventTimes(allDay, timeStart, timeEnd);
  let uploadedAttachment: UploadedAttachment | null = null;

  if (attachmentFile) {
    const uploadResult = await uploadEventAttachment(attachmentFile, user.id);
    if (uploadResult.error) {
      return { fieldErrors: { attachment: [uploadResult.error] } };
    }
    uploadedAttachment = uploadResult.data ?? null;
  }

  const attachmentData = uploadedAttachment
    ? toAttachmentFields(uploadedAttachment)
    : removeAttachment
      ? toAttachmentFields(null)
      : {
          attachmentName: existing.attachmentName,
          attachmentPath: existing.attachmentPath,
          attachmentUrl: existing.attachmentUrl,
          attachmentMimeType: existing.attachmentMimeType,
          attachmentSize: existing.attachmentSize,
        };

  const eventData = {
    title,
    date: dates.start,
    dateEnd: dates.end,
    allDay,
    timeStart: times.timeStart,
    timeEnd: times.timeEnd,
    contactPerson: contactPerson || null,
    contactInfo: contactInfo || null,
    attendees: attendees ? parseInt(attendees) : null,
    description: description || null,
    ...attachmentData,
  };

  const beforeSnapshot = {
    title: existing.title,
    date: existing.date.toISOString(),
    dateEnd: existing.dateEnd?.toISOString() ?? null,
    allDay: existing.allDay,
    timeStart: existing.timeStart,
    timeEnd: existing.timeEnd,
    contactPerson: existing.contactPerson,
    contactInfo: existing.contactInfo,
    attendees: existing.attendees,
    description: existing.description,
    attachmentName: existing.attachmentName,
    attachmentUrl: existing.attachmentUrl,
    attachmentMimeType: existing.attachmentMimeType,
    attachmentSize: existing.attachmentSize,
    room: existing.room.name,
    hotel: existing.room.hotel.name,
  };

  const [updated, ...extras] = await (async () => {
    try {
      return await prisma.$transaction([
        prisma.event.update({
          where: { id },
          data: { ...eventData, roomId: primaryRoomId },
          include: { room: { include: { hotel: true } } },
        }),
        ...extraRoomIds.map((roomId) =>
          prisma.event.create({
            data: { ...eventData, roomId, createdBy: user.id },
            include: { room: { include: { hotel: true } } },
          }),
        ),
      ]);
    } catch (error) {
      if (uploadedAttachment?.path) {
        await cleanupUploadedAttachment(uploadedAttachment.path);
      }
      throw error;
    }
  })();

  const actor = await getActorInfo(user.id);
  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    actorName: actor.name,
    action: "EVENT_UPDATE",
    entityType: "event",
    entityId: updated.id,
    entityLabel: updated.title,
    before: beforeSnapshot,
    after: {
      title: updated.title,
      date: updated.date.toISOString(),
      dateEnd: updated.dateEnd?.toISOString() ?? null,
      allDay: updated.allDay,
      timeStart: updated.timeStart,
      timeEnd: updated.timeEnd,
      contactPerson: updated.contactPerson,
      contactInfo: updated.contactInfo,
      attendees: updated.attendees,
      description: updated.description,
      attachmentName: updated.attachmentName,
      attachmentUrl: updated.attachmentUrl,
      attachmentMimeType: updated.attachmentMimeType,
      attachmentSize: updated.attachmentSize,
      room: updated.room.name,
      hotel: updated.room.hotel.name,
    },
  });
  for (const ev of extras) {
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      actorName: actor.name,
      action: "EVENT_CREATE",
      entityType: "event",
      entityId: ev.id,
      entityLabel: ev.title,
      after: {
        title: ev.title,
        date: ev.date.toISOString(),
        dateEnd: ev.dateEnd?.toISOString() ?? null,
        allDay: ev.allDay,
        timeStart: ev.timeStart,
        timeEnd: ev.timeEnd,
        contactPerson: ev.contactPerson,
        contactInfo: ev.contactInfo,
        attendees: ev.attendees,
        description: ev.description,
        attachmentName: ev.attachmentName,
        attachmentUrl: ev.attachmentUrl,
        attachmentMimeType: ev.attachmentMimeType,
        attachmentSize: ev.attachmentSize,
        room: ev.room.name,
        hotel: ev.room.hotel.name,
      },
      metadata: { createdFromUpdateOf: id },
    });
  }

  const shouldRemovePreviousAttachment =
    !!existing.attachmentPath &&
    (removeAttachment ||
      (!!uploadedAttachment && uploadedAttachment.path !== existing.attachmentPath));

  if (shouldRemovePreviousAttachment && existing.attachmentPath) {
    await removeAttachmentIfUnused(existing.attachmentPath);
  }

  revalidatePath("/");
  revalidatePath("/akce");
  return {
    success: true,
    createdCount: extraRoomIds.length > 0 ? extraRoomIds.length : undefined,
  };
}

export async function deleteEvent(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni" };

  const existing = await prisma.event.findUnique({
    where: { id },
    include: { room: { include: { hotel: true } } },
  });
  if (!existing) return { error: "Akce nenalezena" };

  const allowed = await assertEventPermission("canDeleteEvents", existing.roomId);
  if ("error" in allowed) return { error: allowed.error };

  await prisma.event.delete({ where: { id } });

  const actor = await getActorInfo(user.id);
  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    actorName: actor.name,
    action: "EVENT_DELETE",
    entityType: "event",
    entityId: id,
    entityLabel: existing.title,
    before: {
      title: existing.title,
      date: existing.date.toISOString(),
      dateEnd: existing.dateEnd?.toISOString() ?? null,
      allDay: existing.allDay,
      timeStart: existing.timeStart,
      timeEnd: existing.timeEnd,
      contactPerson: existing.contactPerson,
      contactInfo: existing.contactInfo,
      attendees: existing.attendees,
      description: existing.description,
      attachmentName: existing.attachmentName,
      attachmentUrl: existing.attachmentUrl,
      attachmentMimeType: existing.attachmentMimeType,
      attachmentSize: existing.attachmentSize,
      room: existing.room.name,
      hotel: existing.room.hotel.name,
    },
  });

  if (existing.attachmentPath) {
    await removeAttachmentIfUnused(existing.attachmentPath);
  }

  revalidatePath("/");
  revalidatePath("/akce");
  return { success: true };
}

export async function getEventsForCalendar() {
  const events = await prisma.event.findMany({
    include: { room: { include: { hotel: true } } },
    orderBy: { date: "asc" },
  });
  return events;
}

const RECENT_EVENTS_LIMIT = 6;

export async function getRecentEvents(limit = RECENT_EVENTS_LIMIT) {
  const events = await prisma.event.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { room: { include: { hotel: true } } },
  });

  const creatorIds = [
    ...new Set(events.map((e) => e.createdBy).filter((id): id is string => !!id)),
  ];

  const profiles =
    creatorIds.length > 0
      ? await prisma.profile.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  return events.map((event) => ({
    ...event,
    creator: event.createdBy ? (profileById.get(event.createdBy) ?? null) : null,
  }));
}

export async function getEvents(filters?: {
  hotelId?: string;
  roomId?: string;
  from?: Date;
  to?: Date;
}) {
  return prisma.event.findMany({
    where: {
      ...(filters?.roomId
        ? { roomId: filters.roomId }
        : filters?.hotelId
          ? { room: { hotelId: filters.hotelId } }
          : {}),
      ...(filters?.from || filters?.to
        ? {
            AND: [
              ...(filters.to ? [{ date: { lte: filters.to } }] : []),
              ...(filters.from
                ? [
                    {
                      OR: [
                        { dateEnd: { gte: filters.from } },
                        { dateEnd: null, date: { gte: filters.from } },
                      ],
                    },
                  ]
                : []),
            ],
          }
        : {}),
    },
    include: { room: { include: { hotel: true } } },
    orderBy: { date: "asc" },
  });
}

export async function getEventById(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: { room: { include: { hotel: true } } },
  });
}

export async function getHotelsWithRooms() {
  return prisma.hotel.findMany({
    include: { rooms: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });
}

/** Počet akcí podle hotelu (součet přes všechny místnosti hotelu). */
export async function getEventCountsByHotelId(): Promise<Record<string, number>> {
  const rooms = await prisma.room.findMany({
    select: {
      hotelId: true,
      _count: { select: { events: true } },
    },
  });

  const counts: Record<string, number> = {};
  for (const room of rooms) {
    counts[room.hotelId] = (counts[room.hotelId] ?? 0) + room._count.events;
  }
  return counts;
}

export async function getEventCountsByRoomId(): Promise<Record<string, number>> {
  const rooms = await prisma.room.findMany({
    select: {
      id: true,
      _count: { select: { events: true } },
    },
  });

  const counts: Record<string, number> = {};
  for (const room of rooms) {
    counts[room.id] = room._count.events;
  }
  return counts;
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { parseInputDate } from "@/lib/date";
import { assertEventPermission } from "@/lib/permissions-server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types";

function parseEventDate(value: string): Date | null {
  return parseInputDate(value);
}

const EventSchema = z.object({
  title: z.string().min(1, "Název akce je povinný"),
  roomId: z.string().min(1, "Místnost je povinná"),
  date: z.string().min(1, "Datum je povinné"),
  timeStart: z.string().optional(),
  timeEnd: z.string().optional(),
  contactPerson: z.string().optional(),
  attendees: z.string().optional(),
  description: z.string().optional(),
});

export async function createEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni" };

  const raw = Object.fromEntries(formData);
  const parsed = EventSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { title, roomId, date, timeStart, timeEnd, contactPerson, attendees, description } =
    parsed.data;

  const allowed = await assertEventPermission("canCreateEvents", roomId);
  if ("error" in allowed) return { error: allowed.error };

  const eventDate = parseEventDate(date);
  if (!eventDate) {
    return { fieldErrors: { date: ["Neplatné datum"] } };
  }

  await prisma.event.create({
    data: {
      title,
      roomId,
      date: eventDate,
      timeStart: timeStart || null,
      timeEnd: timeEnd || null,
      contactPerson: contactPerson || null,
      attendees: attendees ? parseInt(attendees) : null,
      description: description || null,
      createdBy: user.id,
    },
  });

  revalidatePath("/");
  revalidatePath("/akce");
  return { success: true };
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

  const raw = Object.fromEntries(formData);
  const parsed = EventSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { title, roomId, date, timeStart, timeEnd, contactPerson, attendees, description } =
    parsed.data;

  const allowed = await assertEventPermission("canUpdateEvents", roomId);
  if ("error" in allowed) return { error: allowed.error };

  const eventDate = parseEventDate(date);
  if (!eventDate) {
    return { fieldErrors: { date: ["Neplatné datum"] } };
  }

  await prisma.event.update({
    where: { id },
    data: {
      title,
      roomId,
      date: eventDate,
      timeStart: timeStart || null,
      timeEnd: timeEnd || null,
      contactPerson: contactPerson || null,
      attendees: attendees ? parseInt(attendees) : null,
      description: description || null,
    },
  });

  revalidatePath("/");
  revalidatePath("/akce");
  return { success: true };
}

export async function deleteEvent(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nejste přihlášeni" };

  const existing = await prisma.event.findUnique({
    where: { id },
    select: { roomId: true },
  });
  if (!existing) return { error: "Akce nenalezena" };

  const allowed = await assertEventPermission("canDeleteEvents", existing.roomId);
  if ("error" in allowed) return { error: allowed.error };

  await prisma.event.delete({ where: { id } });

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
            date: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
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

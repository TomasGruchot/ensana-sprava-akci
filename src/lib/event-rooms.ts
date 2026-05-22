import type { EventWithRelations, RoomWithHotel } from "@/types";

export function getEventRooms(event: EventWithRelations): RoomWithHotel[] {
  return event.rooms.map((link) => link.room);
}

export function getEventRoomIds(event: EventWithRelations): string[] {
  return event.rooms.map((link) => link.roomId);
}

export function getEventHotelIds(event: EventWithRelations): string[] {
  return [...new Set(getEventRooms(event).map((r) => r.hotelId))];
}

export function formatEventRoomsLabel(
  rooms: RoomWithHotel[],
  options?: { includeHotels?: boolean },
): string {
  if (rooms.length === 0) return "—";
  const includeHotels = options?.includeHotels ?? false;
  if (includeHotels) {
    return rooms
      .map((r) => `${r.hotel.name} · ${r.name}`)
      .join(", ");
  }
  return rooms.map((r) => r.name).join(", ");
}

export function getEventCalendarColor(rooms: RoomWithHotel[]): string {
  return rooms[0]?.hotel.color ?? "#6366f1";
}

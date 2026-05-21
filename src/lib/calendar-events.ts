import { formatInputDate } from "@/lib/date";
import type { EventWithRelations, CalendarEvent } from "@/types";

export function mapEventsToCalendar(events: EventWithRelations[]): CalendarEvent[] {
  return events.map((event) => {
    const hotel = event.room.hotel;
    const dateStr = formatInputDate(event.date);

    return {
      id: event.id,
      title: event.title,
      start: event.timeStart ? `${dateStr}T${event.timeStart}` : dateStr,
      end: event.timeEnd ? `${dateStr}T${event.timeEnd}` : undefined,
      backgroundColor: hotel.color,
      borderColor: hotel.color,
      extendedProps: {
        eventId: event.id,
        hotelId: hotel.id,
        roomId: event.roomId,
        roomName: event.room.name,
        hotelName: hotel.name,
        hotelCode: hotel.code,
        contactPerson: event.contactPerson,
        attendees: event.attendees,
        description: event.description,
        timeStart: event.timeStart,
        timeEnd: event.timeEnd,
      },
    };
  });
}

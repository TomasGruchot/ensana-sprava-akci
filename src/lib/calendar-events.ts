import { toCalendarRange } from "@/lib/event-schedule";
import type { EventWithRelations, CalendarEvent } from "@/types";

export function mapEventsToCalendar(events: EventWithRelations[]): CalendarEvent[] {
  return events.map((event) => {
    const hotel = event.room.hotel;
    const range = toCalendarRange(event);

    return {
      id: event.id,
      title: event.title,
      start: range.start,
      end: range.end,
      allDay: range.allDay,
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
        allDay: event.allDay,
        dateEnd: event.dateEnd,
        timeStart: event.timeStart,
        timeEnd: event.timeEnd,
      },
    };
  });
}

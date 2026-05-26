import { toCalendarRange } from "@/lib/event-schedule";
import type { EventWithRelations, CalendarEvent } from "@/types";

export function mapEventsToCalendar(events: EventWithRelations[]): CalendarEvent[] {
  return events.map((event) => {
    const hotel = event.room.hotel;
    const range = toCalendarRange(event);

    const roomColor = event.room.color ?? hotel.color;

    return {
      id: event.id,
      title: event.title,
      start: range.start,
      end: range.end,
      allDay: range.allDay,
      backgroundColor: roomColor,
      borderColor: roomColor,
      extendedProps: {
        eventId: event.id,
        hotelId: hotel.id,
        roomId: event.roomId,
        roomName: event.room.name,
        hotelName: hotel.name,
        hotelCode: hotel.code,
        contactPerson: event.contactPerson,
        contactInfo: event.contactInfo,
        attendees: event.attendees,
        description: event.description,
        attachmentName: event.attachmentName,
        attachmentUrl: event.attachmentUrl,
        attachmentMimeType: event.attachmentMimeType,
        attachmentSize: event.attachmentSize,
        allDay: event.allDay,
        dateEnd: event.dateEnd,
        timeStart: event.timeStart,
        timeEnd: event.timeEnd,
      },
    };
  });
}

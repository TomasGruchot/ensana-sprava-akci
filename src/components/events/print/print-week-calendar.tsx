import { format, isSameDay, startOfDay } from "date-fns";
import { cs } from "date-fns/locale";

import { toLocalDate } from "@/lib/date";
import { eachDayInclusive } from "@/lib/print-range";
import type { EventWithRelations } from "@/types";

interface PrintWeekCalendarProps {
  events: EventWithRelations[];
  from: Date;
  to: Date;
}

function isEventOnDay(event: EventWithRelations, day: Date): boolean {
  const startDay = startOfDay(toLocalDate(event.date));
  const endDay = startOfDay(
    event.dateEnd ? toLocalDate(event.dateEnd) : toLocalDate(event.date),
  );
  const target = startOfDay(day);
  return target >= startDay && target <= endDay;
}

function eventTimeLabel(event: EventWithRelations): string {
  if (event.allDay) return "Celý den";
  if (event.timeStart && event.timeEnd) return `${event.timeStart}–${event.timeEnd}`;
  if (event.timeStart) return event.timeStart;
  return "";
}

const WEEKDAY_FORMAT = "EEEE d. M.";

export function PrintWeekCalendar({ events, from, to }: PrintWeekCalendarProps) {
  const days = eachDayInclusive(from, to);
  const today = startOfDay(new Date());

  return (
    <table className="print-week">
      <thead>
        <tr>
          {days.map((day) => (
            <th key={day.toISOString()} style={{ width: `${100 / days.length}%` }}>
              {format(day, WEEKDAY_FORMAT, { locale: cs })}
              {isSameDay(day, today) ? " · dnes" : ""}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {days.map((day) => {
            const dayEvents = events
              .filter((ev) => isEventOnDay(ev, day))
              .sort((a, b) => {
                const tA = a.timeStart ?? "";
                const tB = b.timeStart ?? "";
                return tA.localeCompare(tB);
              });

            return (
              <td key={day.toISOString()}>
                {dayEvents.length === 0 ? (
                  <span style={{ fontSize: "8pt", color: "#a1a1aa" }}>—</span>
                ) : (
                  dayEvents.map((event) => {
                    const color = event.room.color ?? event.room.hotel.color;
                    return (
                      <span
                        key={event.id}
                        className="ev"
                        style={{ background: color }}
                      >
                        {eventTimeLabel(event)
                          ? `${eventTimeLabel(event)} · `
                          : ""}
                        {event.title}
                        <span className="ev-room">
                          {event.room.hotel.name} · {event.room.name}
                        </span>
                      </span>
                    );
                  })
                )}
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}

import { format, isSameDay, isSameMonth, startOfDay } from "date-fns";
import { cs } from "date-fns/locale";

import { toLocalDate } from "@/lib/date";
import { eachDayInclusive } from "@/lib/print-range";
import type { EventWithRelations } from "@/types";

interface PrintMonthCalendarProps {
  events: EventWithRelations[];
  from: Date;
  to: Date;
  /** Měsíc, jehož dny mají být "aktivní" (mimo něj jsou ztlumené) */
  reference: Date;
}

const WEEKDAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

function eventEndDate(event: EventWithRelations): Date {
  return event.dateEnd ? toLocalDate(event.dateEnd) : toLocalDate(event.date);
}

function eventStartDate(event: EventWithRelations): Date {
  return toLocalDate(event.date);
}

function isEventOnDay(event: EventWithRelations, day: Date): boolean {
  const startDay = startOfDay(eventStartDate(event));
  const endDay = startOfDay(eventEndDate(event));
  const target = startOfDay(day);
  return target >= startDay && target <= endDay;
}

function eventTimeLabel(event: EventWithRelations): string {
  if (event.allDay) return "";
  if (event.timeStart && event.timeEnd) return `${event.timeStart}–${event.timeEnd}`;
  if (event.timeStart) return event.timeStart;
  return "";
}

const MAX_EVENTS_PER_CELL = 5;

export function PrintMonthCalendar({
  events,
  from,
  to,
  reference,
}: PrintMonthCalendarProps) {
  const days = eachDayInclusive(from, to);

  // 7 sloupců (Po-Ne), N řádků
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const today = startOfDay(new Date());

  return (
    <table className="print-month">
      <thead>
        <tr>
          {WEEKDAY_LABELS.map((label) => (
            <th key={label}>{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, wi) => (
          <tr key={wi}>
            {week.map((day) => {
              const inMonth = isSameMonth(day, reference);
              const dayEvents = events
                .filter((ev) => isEventOnDay(ev, day))
                .sort((a, b) => {
                  const tA = a.timeStart ?? "";
                  const tB = b.timeStart ?? "";
                  return tA.localeCompare(tB);
                });
              const visible = dayEvents.slice(0, MAX_EVENTS_PER_CELL);
              const hidden = dayEvents.length - visible.length;
              const isToday = isSameDay(day, today);

              return (
                <td
                  key={day.toISOString()}
                  className={[
                    !inMonth ? "is-outside" : "",
                    isToday ? "is-today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className={`day-num ${inMonth ? "" : "muted"}`}>
                    {format(day, "d", { locale: cs })}
                  </span>
                  {visible.map((event) => {
                    const color = event.room.color ?? event.room.hotel.color;
                    const time = eventTimeLabel(event);
                    return (
                      <span
                        key={event.id}
                        className="ev"
                        style={{ background: color }}
                        title={`${event.title} — ${event.room.hotel.name} · ${event.room.name}`}
                      >
                        {time ? `${time} ` : ""}
                        {event.title}
                        <span className="ev-room">{event.room.name}</span>
                      </span>
                    );
                  })}
                  {hidden > 0 ? (
                    <span className="ev-more">+ {hidden} dalších</span>
                  ) : null}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}


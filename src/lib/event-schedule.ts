import { addDays, isSameDay } from "date-fns";

import {
  formatDisplayDate,
  formatInputDate,
  parseInputDate,
  toLocalDate,
} from "@/lib/date";

export type EventScheduleFields = {
  date: Date | string;
  dateEnd?: Date | string | null;
  allDay?: boolean;
  timeStart?: string | null;
  timeEnd?: string | null;
};

function effectiveEndDate(event: EventScheduleFields): Date {
  return event.dateEnd ? toLocalDate(event.dateEnd) : toLocalDate(event.date);
}

function formatTimeRange(timeStart?: string | null, timeEnd?: string | null): string {
  if (!timeStart) return "";
  if (timeEnd) return `${timeStart}–${timeEnd}`;
  return timeStart;
}

/** Jedna řádka: datum (příp. rozsah) a čas od–do, nebo „celý den“. */
export function formatEventSchedule(event: EventScheduleFields): string {
  const start = toLocalDate(event.date);
  const end = effectiveEndDate(event);
  const multiDay = !isSameDay(start, end);

  if (event.allDay) {
    if (multiDay) {
      return `${formatDisplayDate(start)} – ${formatDisplayDate(end)} · celý den`;
    }
    return `${formatDisplayDate(start)} · celý den`;
  }

  const times = formatTimeRange(event.timeStart, event.timeEnd);

  if (multiDay) {
    const startPart = event.timeStart
      ? `${formatDisplayDate(start)} ${event.timeStart}`
      : formatDisplayDate(start);
    const endPart = event.timeEnd
      ? `${formatDisplayDate(end)} ${event.timeEnd}`
      : formatDisplayDate(end);
    return `${startPart} – ${endPart}`;
  }

  if (times) {
    return `${formatDisplayDate(start)} · ${times}`;
  }

  return formatDisplayDate(start);
}

/** FullCalendar: start / end / allDay */
export function toCalendarRange(event: EventScheduleFields): {
  start: string;
  end?: string;
  allDay: boolean;
} {
  const startDate = formatInputDate(event.date);
  const endDate = formatInputDate(effectiveEndDate(event));

  if (event.allDay) {
    const lastDay = parseInputDate(endDate) ?? toLocalDate(event.date);
    return {
      start: startDate,
      end: formatInputDate(addDays(lastDay, 1)),
      allDay: true,
    };
  }

  const start = event.timeStart ? `${startDate}T${event.timeStart}` : startDate;
  let end: string | undefined;
  if (event.timeEnd) {
    end = `${endDate}T${event.timeEnd}`;
  } else if (event.timeStart && !isSameDay(toLocalDate(event.date), effectiveEndDate(event))) {
    end = `${endDate}T${event.timeStart}`;
  }

  return { start, end, allDay: !event.timeStart };
}

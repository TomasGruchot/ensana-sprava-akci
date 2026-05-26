import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";

import { parseInputDate } from "@/lib/date";
import type { CalendarScale } from "@/lib/event-view";

/**
 * Vypočítá rozsah dat pro tiskový kalendář dle scale.
 * Referenční datum: pokud je v URL `ref=YYYY-MM-DD`, použije se, jinak dnešek.
 */
export function getPrintCalendarRange(
  scale: CalendarScale,
  refIso: string | undefined,
): { from: Date; to: Date; reference: Date } {
  const ref = (refIso ? parseInputDate(refIso) : null) ?? startOfDay(new Date());

  switch (scale) {
    case "day": {
      return { from: startOfDay(ref), to: endOfDay(ref), reference: ref };
    }
    case "week": {
      const from = startOfWeek(ref, { weekStartsOn: 1 });
      const to = endOfWeek(ref, { weekStartsOn: 1 });
      return { from, to, reference: ref };
    }
    case "year": {
      return { from: startOfYear(ref), to: endOfYear(ref), reference: ref };
    }
    case "month":
    default: {
      // Měsíc + okrajové dny pro celé tiskové týdny
      const monthStart = startOfMonth(ref);
      const monthEnd = endOfMonth(ref);
      const from = startOfWeek(monthStart, { weekStartsOn: 1 });
      const to = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return { from, to, reference: ref };
    }
  }
}

/** Vrátí pole dnů [from..to] včetně. */
export function eachDayInclusive(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  let current = startOfDay(from);
  const last = startOfDay(to);
  while (current <= last) {
    days.push(current);
    current = addDays(current, 1);
  }
  return days;
}

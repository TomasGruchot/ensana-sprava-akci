export type EventDisplayView = "list" | "calendar";
export type CalendarScale = "day" | "week" | "month" | "year";

export function parseEventDisplayView(value?: string): EventDisplayView {
  if (value === "calendar") return "calendar";
  return "list";
}

export function parseCalendarScale(value?: string): CalendarScale {
  if (value === "day") return "day";
  if (value === "week") return "week";
  if (value === "year") return "year";
  return "month";
}

export function calendarScaleToFcView(scale: CalendarScale): string {
  switch (scale) {
    case "day":
      return "timeGridDay";
    case "week":
      return "timeGridWeek";
    case "year":
      return "listYear";
    case "month":
    default:
      return "dayGridMonth";
  }
}

import { redirect } from "next/navigation";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

import { AutoPrint } from "@/components/events/print/auto-print";
import { PrintEventsTable } from "@/components/events/print/print-events-table";
import { PrintMonthCalendar } from "@/components/events/print/print-month-calendar";
import { PrintWeekCalendar } from "@/components/events/print/print-week-calendar";
import { getAppUser } from "@/lib/actions/auth";
import { getEvents, getHotelsWithRooms } from "@/lib/actions/events";
import { formatDisplayDate, parseInputDate } from "@/lib/date";
import {
  parseCalendarScale,
  parseEventDisplayView,
  type CalendarScale,
} from "@/lib/event-view";
import { getPrintCalendarRange } from "@/lib/print-range";

export const dynamic = "force-dynamic";

interface PrintPageProps {
  searchParams: Promise<{
    hotel?: string;
    room?: string;
    from?: string;
    to?: string;
    view?: string;
    scale?: string;
    ref?: string;
  }>;
}

function scaleTitle(scale: CalendarScale, reference: Date): string {
  switch (scale) {
    case "day":
      return format(reference, "EEEE d. MMMM yyyy", { locale: cs });
    case "week": {
      return `Týden — ${format(reference, "d. MMMM yyyy", { locale: cs })}`;
    }
    case "year":
      return `Rok ${format(reference, "yyyy", { locale: cs })}`;
    case "month":
    default:
      return format(reference, "LLLL yyyy", { locale: cs });
  }
}

export default async function AkceTiskPage({ searchParams }: PrintPageProps) {
  const params = await searchParams;

  const user = await getAppUser();
  if (!user) redirect("/prihlasit");

  const view = parseEventDisplayView(params.view);
  const scale = parseCalendarScale(params.scale);

  const hotels = await getHotelsWithRooms();
  const hotel = params.hotel
    ? hotels.find((h) => h.id === params.hotel)
    : null;
  const room = params.room
    ? hotels.flatMap((h) => h.rooms).find((r) => r.id === params.room)
    : null;

  let from: Date | undefined;
  let to: Date | undefined;
  let reference: Date | null = null;
  let title = "Všechny akce";

  if (view === "calendar") {
    const range = getPrintCalendarRange(scale, params.ref);
    from = range.from;
    to = range.to;
    reference = range.reference;
    title = scaleTitle(scale, reference);
  } else {
    from = params.from ? parseInputDate(params.from) ?? undefined : undefined;
    to = params.to ? parseInputDate(params.to) ?? undefined : undefined;
  }

  const events = await getEvents({
    hotelId: params.hotel,
    roomId: params.room,
    from,
    to,
  });

  const now = new Date();
  const printedAt = format(now, "d. M. yyyy HH:mm", { locale: cs });

  const filterChips: { label: string; color?: string }[] = [];
  if (hotel) {
    filterChips.push({ label: hotel.name, color: hotel.color });
  } else {
    filterChips.push({ label: "Všechny hotely" });
  }
  if (room) {
    filterChips.push({
      label: room.name,
      color: room.color ?? hotel?.color,
    });
  }
  if (view === "list") {
    if (from || to) {
      const rangeLabel = `${from ? formatDisplayDate(from) : "—"} až ${
        to ? formatDisplayDate(to) : "—"
      }`;
      filterChips.push({ label: rangeLabel });
    }
  }

  const showAsList = view === "list" || scale === "year" || scale === "day";
  const showAsMonth = view === "calendar" && scale === "month";
  const showAsWeek = view === "calendar" && scale === "week";

  return (
    <>
      <AutoPrint />
      <main className="print-paper print-no-break">
        <header className="print-header">
          <div>
            <div
              style={{
                fontSize: "8.5pt",
                color: "#71717a",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Ensana — Správa akcí
            </div>
            <h1>{title}</h1>
          </div>
          <div className="meta">
            <div>
              <strong>Vytištěno:</strong> {printedAt}
            </div>
            <div>
              <strong>Akcí celkem:</strong> {events.length}
            </div>
          </div>
        </header>

        {filterChips.length > 0 ? (
          <div className="print-subheader">
            {filterChips.map((chip, i) => (
              <span key={i} className="chip">
                {chip.color ? (
                  <span
                    className="hotel-dot"
                    style={{ background: chip.color, margin: 0 }}
                    aria-hidden
                  />
                ) : null}
                {chip.label}
              </span>
            ))}
          </div>
        ) : null}

        {showAsMonth && reference ? (
          <PrintMonthCalendar
            events={events}
            from={from!}
            to={to!}
            reference={reference}
          />
        ) : showAsWeek ? (
          <PrintWeekCalendar events={events} from={from!} to={to!} />
        ) : showAsList ? (
          <PrintEventsTable events={events} />
        ) : (
          <PrintEventsTable events={events} />
        )}

        <footer className="print-footer">
          <span>Ensana — Správa akcí · interní dokument</span>
          <span>{printedAt}</span>
        </footer>
      </main>
    </>
  );
}

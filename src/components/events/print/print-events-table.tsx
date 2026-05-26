import { formatEventSchedule } from "@/lib/event-schedule";
import type { EventWithRelations } from "@/types";

interface PrintEventsTableProps {
  events: EventWithRelations[];
}

export function PrintEventsTable({ events }: PrintEventsTableProps) {
  if (events.length === 0) {
    return (
      <p className="print-empty">
        Pro zvolené filtry nebyly nalezeny žádné akce.
      </p>
    );
  }

  return (
    <table className="print-table">
      <thead>
        <tr>
          <th style={{ width: "18%" }}>Termín</th>
          <th>Název akce</th>
          <th style={{ width: "14%" }}>Hotel</th>
          <th style={{ width: "14%" }}>Místnost</th>
          <th style={{ width: "12%" }}>Jméno</th>
          <th style={{ width: "14%" }}>Kontakt</th>
          <th className="center" style={{ width: "7%" }}>
            Účastníci
          </th>
          <th>Poznámka</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => {
          const hotel = event.room.hotel;
          return (
            <tr key={event.id} className="print-no-break">
              <td className="nowrap">{formatEventSchedule(event)}</td>
              <td style={{ fontWeight: 600 }}>{event.title}</td>
              <td>
                <span
                  className="hotel-dot"
                  style={{ background: hotel.color }}
                  aria-hidden
                />
                {hotel.name}
              </td>
              <td>{event.room.name}</td>
              <td>{event.contactPerson || "—"}</td>
              <td>{event.contactInfo || "—"}</td>
              <td className="center num">
                {event.attendees != null ? event.attendees : "—"}
              </td>
              <td style={{ color: "#52525b" }}>
                {event.description ? truncate(event.description, 140) : ""}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

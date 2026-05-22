import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EventTable } from "@/components/events/event-table";
import { EventFilters } from "@/components/events/event-filters";
import { EventViewSwitcher } from "@/components/events/event-view-switcher";
import { EventCalendar } from "@/components/events/event-calendar";
import { AkceFiltersRestorer } from "@/components/events/akce-filters-restorer";
import { getEvents, getHotelsWithRooms } from "@/lib/actions/events";
import { mapEventsToCalendar } from "@/lib/calendar-events";
import { parseInputDate } from "@/lib/date";
import {
  calendarScaleToFcView,
  parseCalendarScale,
  parseEventDisplayView,
} from "@/lib/event-view";

interface AkcePageProps {
  searchParams: Promise<{
    hotel?: string;
    room?: string;
    from?: string;
    to?: string;
    view?: string;
    scale?: string;
  }>;
}

export default async function AkcePage({ searchParams }: AkcePageProps) {
  const params = await searchParams;

  return (
    <div className="flex flex-col gap-5">
      <Suspense fallback={null}>
        <AkceFiltersRestorer />
      </Suspense>
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-zinc-900 truncate">Všechny akce</h2>
          <p className="text-xs text-zinc-500 mt-0.5 hidden sm:block">
            Přehled rezervací napříč všemi hotely
          </p>
        </div>
        <div className="shrink-0">
          <EventViewSwitcher />
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-12 rounded-xl" />}>
        <FiltersSection />
      </Suspense>

      <div className="flex flex-col">
        <Suspense fallback={<TableSkeleton />}>
          <EventsSection params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function FiltersSection() {
  const hotels = await getHotelsWithRooms();
  return <EventFilters hotels={hotels} />;
}

async function EventsSection({
  params,
}: {
  params: {
    hotel?: string;
    room?: string;
    from?: string;
    to?: string;
    view?: string;
    scale?: string;
  };
}) {
  const events = await getEvents({
    hotelId: params.hotel,
    roomId: params.room,
    from: params.from ? parseInputDate(params.from) ?? undefined : undefined,
    to: params.to ? parseInputDate(params.to) ?? undefined : undefined,
  });

  const view = parseEventDisplayView(params.view);
  const scale = parseCalendarScale(params.scale);

  if (view === "calendar") {
    return (
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden p-4 min-h-[520px]">
        <EventCalendar
          events={mapEventsToCalendar(events)}
          initialView={calendarScaleToFcView(scale)}
        />
      </div>
    );
  }

  return <EventTable events={events} />;
}

function TableSkeleton() {
  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-3 flex gap-4">
        {[80, 60, 200, 100, 120, 120, 60, 32].map((w, i) => (
          <Skeleton key={i} style={{ width: w }} className="h-4" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="px-4 py-3.5 flex gap-4 border-b border-zinc-100 last:border-0">
          {[80, 60, 200, 100, 120, 120, 60, 32].map((w, j) => (
            <Skeleton key={j} style={{ width: w }} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
}

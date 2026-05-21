"use client";

import dynamic from "next/dynamic";
import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventFormStore } from "@/stores/event-form-store";
import type { CalendarEvent } from "@/types";
import { EventCalendarScaleSwitcher } from "@/components/events/event-calendar-scale-switcher";
import "@/styles/calendar.css";

const FullCalendarComponent = dynamic(
  () => import("./full-calendar-inner"),
  {
    ssr: false,
    loading: () => <CalendarSkeleton />,
  },
);

interface EventCalendarProps {
  events: CalendarEvent[];
  initialView: string;
  toolbarEnd?: ReactNode;
}

export function EventCalendar({
  events,
  initialView,
  toolbarEnd,
}: EventCalendarProps) {
  const openEdit = useEventFormStore((s) => s.openEdit);

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <FullCalendarComponent
        key={initialView}
        events={events}
        initialView={initialView}
        toolbarEnd={
          toolbarEnd ?? (
            <Suspense fallback={<ScaleSwitcherSkeleton />}>
              <EventCalendarScaleSwitcher />
            </Suspense>
          )
        }
        onEventClick={(eventId) => openEdit(eventId)}
      />
    </div>
  );
}

function ScaleSwitcherSkeleton() {
  return <Skeleton className="h-7 w-[190px] rounded-lg" />;
}

function CalendarSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-6" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, row) => (
        <div key={row} className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, col) => (
            <Skeleton key={col} className="h-20" />
          ))}
        </div>
      ))}
    </div>
  );
}

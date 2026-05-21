"use client";

import type { RefObject, ReactNode } from "react";
import type FullCalendar from "@fullcalendar/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarToolbarProps {
  calendarRef: RefObject<FullCalendar | null>;
  title: string;
  isViewingCurrent: boolean;
  end?: ReactNode;
}

export function CalendarToolbar({
  calendarRef,
  title,
  isViewingCurrent,
  end,
}: CalendarToolbarProps) {
  const api = () => calendarRef.current?.getApi();

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="fc-button fc-button-primary px-2!"
            aria-label="Předchozí období"
            onClick={() => api()?.prev()}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            className="fc-button fc-button-primary px-2!"
            aria-label="Další období"
            onClick={() => api()?.next()}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <button
          type="button"
          className={cn(
            "fc-button fc-button-primary calendar-today-btn",
            isViewingCurrent
              ? "calendar-today-btn--current"
              : "calendar-today-btn--away",
          )}
          onClick={() => api()?.today()}
          aria-pressed={isViewingCurrent}
          title={
            isViewingCurrent
              ? "Zobrazeno aktuální období"
              : "Přejít na dnešní datum"
          }
        >
          Nyní
        </button>
      </div>
      <h2 className="fc-toolbar-title text-center truncate px-2">
        {title}
      </h2>
      <div className="flex justify-end">{end}</div>
    </div>
  );
}

"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import csLocale from "@fullcalendar/core/locales/cs";
import type { DatesSetArg } from "@fullcalendar/core";
import type { CalendarEvent } from "@/types";
import { CalendarToolbar } from "./calendar-toolbar";

interface FullCalendarInnerProps {
  events: CalendarEvent[];
  initialView: string;
  onEventClick: (eventId: string) => void;
  toolbarEnd?: ReactNode;
}

export default function FullCalendarInner({
  events,
  initialView,
  onEventClick,
  toolbarEnd,
}: FullCalendarInnerProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [title, setTitle] = useState("");
  const [isViewingCurrent, setIsViewingCurrent] = useState(false);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setTitle(arg.view.title);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setIsViewingCurrent(today >= arg.start && today < arg.end);
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-2">
      <CalendarToolbar
        calendarRef={calendarRef}
        title={title}
        isViewingCurrent={isViewingCurrent}
        end={toolbarEnd}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <FullCalendar
          ref={calendarRef}
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            listPlugin,
            interactionPlugin,
          ]}
          initialView={initialView}
          locale={csLocale}
          headerToolbar={false}
          datesSet={handleDatesSet}
          events={events}
          eventClick={(info) => {
            const eventId = info.event.extendedProps.eventId as string;
            onEventClick(eventId);
          }}
          height="100%"
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          eventDisplay="block"
          dayMaxEvents={3}
          eventMouseEnter={(info) => {
            info.el.style.cursor = "pointer";
          }}
        />
      </div>
    </div>
  );
}

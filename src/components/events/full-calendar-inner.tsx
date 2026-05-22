"use client";

import { useRef, useState, useCallback, type ReactNode } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import csLocale from "@fullcalendar/core/locales/cs";
import type { DatesSetArg, EventContentArg } from "@fullcalendar/core";
import { CalendarToolbar } from "./calendar-toolbar";

function renderEventContent(arg: EventContentArg) {
  return (
    <span className="block truncate text-[11px] font-medium leading-tight px-1">
      {arg.event.title}
    </span>
  );
}

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
    <div className="flex w-full flex-col gap-2">
      <CalendarToolbar
        calendarRef={calendarRef}
        title={title}
        isViewingCurrent={isViewingCurrent}
        end={toolbarEnd}
      />
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
        height="auto"
        slotMinTime="06:00:00"
        slotMaxTime="23:00:00"
        eventDisplay="block"
        eventContent={renderEventContent}
        dayMaxEvents={3}
        eventMouseEnter={(info) => {
          info.el.style.cursor = "pointer";
        }}
      />
    </div>
  );
}

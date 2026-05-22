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
import type { CalendarEvent } from "@/types";

function renderEventContent(arg: EventContentArg) {
  const roomName = arg.event.extendedProps.roomName as string | undefined;
  const viewType = arg.view.type;
  const isList = viewType.startsWith("list");
  const isTimeGrid = viewType.includes("timeGrid");

  if (isList) {
    return (
      <span className="flex min-w-0 flex-col gap-0.5 py-0.5">
        <span className="truncate text-sm font-medium text-zinc-900">
          {arg.event.title}
        </span>
        {roomName ? (
          <span className="truncate text-xs text-zinc-500">{roomName}</span>
        ) : null}
      </span>
    );
  }

  if (isTimeGrid) {
    return (
      <span className="flex min-w-0 flex-col gap-0.5 px-0.5 py-0.5 leading-tight">
        <span className="truncate text-[11px] font-semibold">{arg.event.title}</span>
        {roomName ? (
          <span className="truncate text-[10px] font-normal opacity-90">
            {roomName}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <span className="block min-w-0 leading-tight px-0.5">
      <span className="block truncate text-[11px] font-semibold">{arg.event.title}</span>
      {roomName ? (
        <span className="block truncate text-[10px] font-normal opacity-90">
          {roomName}
        </span>
      ) : null}
    </span>
  );
}

function eventTooltipTitle(title: string, roomName?: string, hotelName?: string) {
  const place = [roomName, hotelName].filter(Boolean).join(" · ");
  return place ? `${title} — ${place}` : title;
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
        eventDidMount={(info) => {
          const { roomName, hotelName } = info.event.extendedProps as CalendarEvent["extendedProps"];
          info.el.title = eventTooltipTitle(
            info.event.title,
            roomName,
            hotelName,
          );
        }}
        eventMouseEnter={(info) => {
          info.el.style.cursor = "pointer";
        }}
      />
    </div>
  );
}

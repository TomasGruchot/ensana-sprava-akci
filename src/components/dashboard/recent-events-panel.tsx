"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import { ArrowRight, CalendarPlus, User } from "lucide-react";

import { formatDisplayDate } from "@/lib/date";
import { useEventFormStore } from "@/stores/event-form-store";
import type { EventWithRelations, Profile } from "@/types";

export type RecentEventItem = EventWithRelations & {
  creator: Pick<Profile, "id" | "name" | "email"> | null;
};

interface RecentEventsPanelProps {
  events: RecentEventItem[];
}

function creatorLabel(creator: RecentEventItem["creator"]): string {
  if (!creator) return "Neznámý uživatel";
  return creator.name?.trim() || creator.email;
}

export function RecentEventsPanel({ events }: RecentEventsPanelProps) {
  const openEdit = useEventFormStore((s) => s.openEdit);

  return (
    <section className="shrink-0 bg-white rounded-2xl border border-zinc-200 p-4">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
            <CalendarPlus className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900">
              Naposledy přidané akce
            </h3>
            <p className="text-xs text-zinc-500 truncate">
              Kdo akci zadal a kdy byla vytvořena v systému
            </p>
          </div>
        </div>
        <Link
          href="/akce"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 shrink-0 transition-colors"
        >
          Všechny akce
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-zinc-500 py-6 text-center">
          Zatím nebyla přidána žádná akce.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {events.map((event) => {
            const hotel = event.room.hotel;
            const addedAgo = formatDistanceToNow(event.createdAt, {
              addSuffix: true,
              locale: cs,
            });

            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => openEdit(event.id)}
                  className="w-full flex items-center gap-4 py-2.5 text-left rounded-lg hover:bg-zinc-50 transition-colors group"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0 mt-0.5"
                    style={{ backgroundColor: hotel.color }}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] sm:gap-x-6 gap-y-0.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate group-hover:text-zinc-950">
                        {event.title}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {hotel.name} · {event.room.name}
                      </p>
                    </div>
                    <p className="text-xs text-zinc-500 sm:text-right whitespace-nowrap">
                      {formatDisplayDate(event.date)}
                      {event.timeStart ? ` · ${event.timeStart}` : ""}
                    </p>
                    <p className="text-xs text-zinc-500 sm:text-right flex items-center sm:justify-end gap-1.5 whitespace-nowrap">
                      <User className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span className="truncate max-w-[140px]">
                        {creatorLabel(event.creator)}
                      </span>
                      <span className="text-zinc-300 hidden sm:inline">·</span>
                      <span className="text-zinc-400 hidden sm:inline">
                        {addedAgo}
                      </span>
                    </p>
                  </div>
                  <span className="text-[11px] text-zinc-400 sm:hidden shrink-0">
                    {addedAgo}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

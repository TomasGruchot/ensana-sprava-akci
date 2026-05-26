"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CalendarDays, ChevronRight, Pencil } from "lucide-react";

import { useCanModifyHotel } from "@/components/layout/permissions-context";
import { useHotelFormStore } from "@/stores/hotel-form-store";
import type { HotelWithRooms } from "@/types";

function formatEventCountLabel(count: number): string {
  if (count === 1) return "1 akce";
  if (count >= 2 && count <= 4) return `${count} akce`;
  return `${count} akcí`;
}

interface HotelCardProps {
  hotel: HotelWithRooms;
  eventCount: number;
}

export function HotelCard({ hotel, eventCount }: HotelCardProps) {
  const [imageError, setImageError] = useState(false);
  const showImage = hotel.imageUrl && !imageError;
  const openEdit = useHotelFormStore((s) => s.openEdit);
  const canEdit = useCanModifyHotel(hotel.id, "update");

  return (
    <div className="relative group">
      <Link
        href={`/akce?hotel=${hotel.id}`}
        className="block bg-white rounded-2xl border border-zinc-200 overflow-hidden transition-shadow hover:shadow-md hover:border-zinc-300"
      >
        <div className="relative aspect-4/3 overflow-hidden bg-zinc-100">
          {showImage ? (
            <Image
              src={hotel.imageUrl!}
              alt={hotel.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: `linear-gradient(145deg, ${hotel.color}22 0%, ${hotel.color}44 50%, ${hotel.color}18 100%)`,
              }}
            >
              <span
                className="text-4xl font-bold tracking-tight opacity-40"
                style={{ color: hotel.color }}
              >
                {hotel.code}
              </span>
            </div>
          )}
          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md text-xs font-semibold bg-white/90 text-zinc-800 shadow-sm backdrop-blur-sm">
            {hotel.code}
          </span>
        </div>

        <div className="p-4 flex items-center gap-3">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: hotel.color }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900 truncate group-hover:text-zinc-700">
              {hotel.name}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {hotel.rooms.length}{" "}
              {hotel.rooms.length === 1
                ? "místnost"
                : hotel.rooms.length < 5
                  ? "místnosti"
                  : "místností"}
            </p>
            <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
              <CalendarDays className="w-3 h-3 shrink-0 text-zinc-400" />
              Naplánováno {formatEventCountLabel(eventCount)}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-300 shrink-0 group-hover:text-zinc-500 transition-colors" />
        </div>
      </Link>

      {canEdit ? (
        <button
          type="button"
          onClick={() => openEdit(hotel)}
          aria-label={`Upravit hotel ${hotel.name}`}
          className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm rounded-lg px-2 py-1 flex items-center gap-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900"
        >
          <Pencil className="size-3" />
          Upravit
        </button>
      ) : null}
    </div>
  );
}

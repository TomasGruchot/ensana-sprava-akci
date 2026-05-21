"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { Button } from "@/components/ui/button";
import type { HotelWithRooms } from "@/types";

interface EventFiltersProps {
  hotels: HotelWithRooms[];
}

const ALL = "__all__";

export function EventFilters({ hotels }: EventFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const hotelId = searchParams.get("hotel") ?? "";
  const roomId = searchParams.get("room") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  const selectedHotel = hotels.find((h) => h.id === hotelId);

  const roomOptions = hotelId
    ? (selectedHotel?.rooms ?? []).map((r) => ({
        id: r.id,
        label: r.name,
      }))
    : hotels.flatMap((h) =>
        h.rooms.map((r) => ({
          id: r.id,
          label: `${h.name} – ${r.name}`,
        }))
      );

  const hasFilters = !!(hotelId || roomId || from || to);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (key === "hotel") params.delete("room");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function clearAll() {
    startTransition(() => router.push(pathname));
  }

  function handleHotelChange(v: string | null) {
    updateParam("hotel", v === ALL || !v ? "" : v);
  }

  function handleRoomChange(v: string | null) {
    updateParam("room", v === ALL || !v ? "" : v);
  }

  const hotelSelectItems = [
    { value: ALL, label: "Všechny hotely" },
    ...hotels.map((h) => ({ value: h.id, label: h.name })),
  ];

  const roomSelectItems = [
    { value: ALL, label: "Všechny místnosti" },
    ...roomOptions.map((r) => ({ value: r.id, label: r.label })),
  ];

  return (
    <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
      <Select
        value={hotelId || ALL}
        onValueChange={handleHotelChange}
        items={hotelSelectItems}
      >
        <SelectTrigger className="w-40 shrink-0 bg-white">
          <SelectValue placeholder="Všechny hotely" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Všechny hotely</SelectItem>
          {hotels.map((h) => (
            <SelectItem key={h.id} value={h.id}>
              <span className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: h.color }}
                />
                {h.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={roomId || ALL}
        onValueChange={handleRoomChange}
        items={roomSelectItems}
      >
        <SelectTrigger className="w-44 shrink-0 bg-white">
          <SelectValue placeholder="Všechny místnosti" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Všechny místnosti</SelectItem>
          {roomOptions.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div
        className="flex items-center gap-1.5 shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 h-8"
        role="group"
        aria-label="Filtr podle období"
      >
        <span className="text-sm font-semibold text-zinc-900 shrink-0">Od</span>
        <DateInput
          value={from}
          onChange={(iso) => updateParam("from", iso)}
          aria-label="Datum od"
          className="w-30 shrink-0"
          inputClassName="border-0 bg-transparent px-0 py-0 h-7 shadow-none focus-visible:ring-0 text-sm text-zinc-600"
        />
        <span className="text-sm font-semibold text-zinc-900 shrink-0">Do</span>
        <DateInput
          value={to}
          onChange={(iso) => updateParam("to", iso)}
          aria-label="Datum do"
          className="w-30 shrink-0"
          inputClassName="border-0 bg-transparent px-0 py-0 h-7 shadow-none focus-visible:ring-0 text-sm text-zinc-600"
        />
      </div>

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={clearAll}
          aria-label="Zrušit filtry"
          title="Zrušit filtry"
          className="shrink-0 text-zinc-500 hover:text-zinc-900"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}

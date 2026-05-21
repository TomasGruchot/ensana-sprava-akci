import { Plus } from "lucide-react";

import { HotelCard } from "@/components/hotels/hotel-card";
import { HotelForm } from "@/components/hotels/hotel-form";
import { HotelAddButton } from "@/components/hotels/hotel-add-button";
import { getEventCountsByHotelId, getHotelsWithRooms } from "@/lib/actions/events";

export default async function HotelyPage() {
  const [hotels, eventCounts] = await Promise.all([
    getHotelsWithRooms(),
    getEventCountsByHotelId(),
  ]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Přehled hotelů</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Všechny provozovny Ensana na jednom místě
            </p>
          </div>
          <HotelAddButton />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {hotels.map((hotel) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              eventCount={eventCounts[hotel.id] ?? 0}
            />
          ))}
          {hotels.length === 0 && (
            <p className="text-sm text-zinc-400 col-span-full py-8 text-center">
              Zatím žádné hotely. Přidejte první pomocí tlačítka výše.
            </p>
          )}
        </div>
      </div>

      <HotelForm />
    </>
  );
}

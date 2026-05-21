"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { DateInput } from "@/components/ui/date-input";
import { formatInputDate } from "@/lib/date";
import { createEvent, updateEvent } from "@/lib/actions/events";
import { useEventFormStore } from "@/stores/event-form-store";
import type { ActionState, EventWithRelations, HotelWithRooms } from "@/types";

interface EventFormProps {
  hotels: HotelWithRooms[];
  editEvent?: EventWithRelations | null;
}

const initialState: ActionState = {};

export function EventForm({ hotels, editEvent }: EventFormProps) {
  const { open, eventId, defaultRoomId, close } = useEventFormStore();
  const router = useRouter();

  const isEdit = !!eventId;
  const boundAction = isEdit ? updateEvent.bind(null, eventId) : createEvent;

  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const getInitialHotelId = () => {
    if (editEvent?.room.hotelId) return editEvent.room.hotelId;
    if (defaultRoomId) {
      return hotels.find((h) => h.rooms.some((r: { id: string }) => r.id === defaultRoomId))?.id ?? "";
    }
    return "";
  };

  const [selectedHotelId, setSelectedHotelId] = useState<string>(getInitialHotelId);

  const rooms = hotels.find((h) => h.id === selectedHotelId)?.rooms ?? [];

  const hotelSelectItems = hotels.map((h) => ({
    value: h.id,
    label: h.name,
  }));

  const roomSelectItems = rooms.map((r: { id: string; name: string }) => ({
    value: r.id,
    label: r.name,
  }));

  useEffect(() => {
    if (state.success) {
      toast.success(isEdit ? "Akce byla upravena" : "Akce byla vytvořena");
      close();
      router.refresh();
    }
    if (state.error) {
      toast.error(state.error);
    }
  }, [state, isEdit, close, router]);

  useEffect(() => {
    if (open) {
      if (editEvent) {
        setSelectedHotelId(editEvent.room.hotelId);
      } else if (defaultRoomId) {
        const hotel = hotels.find((h) => h.rooms.some((r: { id: string }) => r.id === defaultRoomId));
        setSelectedHotelId(hotel?.id ?? "");
      } else {
        setSelectedHotelId("");
      }
    }
  }, [open, editEvent, defaultRoomId, hotels]);

  const defaultDate = editEvent ? formatInputDate(editEvent.date) : "";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && close()}>
      <SheetContent side="right" className="w-full max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-zinc-100">
          <SheetTitle className="text-base font-semibold">
            {isEdit ? "Upravit akci" : "Nová akce"}
          </SheetTitle>
        </SheetHeader>

        <form action={formAction} className="flex flex-col flex-1 overflow-auto">
          <div className="px-6 py-5 space-y-5 flex-1 overflow-y-auto">
            {/* Hotel + Room */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Umístění
              </p>

              <div className="flex items-center gap-3">
                <Label className="text-sm shrink-0 w-24">Hotel</Label>
                <div className="flex-1 min-w-0">
                  <Select
                    value={selectedHotelId}
                    onValueChange={(v: string | null) => setSelectedHotelId(v ?? "")}
                    items={hotelSelectItems}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Vyberte hotel…" />
                    </SelectTrigger>
                    <SelectContent>
                      {hotels.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: h.color }}
                            />
                            {h.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <Label htmlFor="roomId" className="text-sm shrink-0 w-24">
                    Místnost
                  </Label>
                  <div className="flex-1 min-w-0">
                    <Select
                      name="roomId"
                      defaultValue={editEvent?.roomId ?? defaultRoomId ?? ""}
                      items={roomSelectItems}
                      required
                      disabled={!selectedHotelId}
                    >
                      <SelectTrigger id="roomId" className="w-full">
                        <SelectValue placeholder="Vyberte místnost…" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((r: { id: string; name: string }) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {state.fieldErrors?.roomId && (
                  <p className="text-xs text-red-500 pl-27">
                    {state.fieldErrors.roomId[0]}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Event details */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Detail akce
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-sm">
                  Název akce
                </Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={editEvent?.title ?? ""}
                  placeholder="Název akce"
                  required
                />
                {state.fieldErrors?.title && (
                  <p className="text-xs text-red-500">{state.fieldErrors.title[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-sm">
                  Datum
                </Label>
                <DateInput
                  id="date"
                  name="date"
                  defaultValue={defaultDate}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="timeStart" className="text-sm">
                    Čas od
                  </Label>
                  <Input
                    id="timeStart"
                    name="timeStart"
                    type="time"
                    defaultValue={editEvent?.timeStart ?? ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="timeEnd" className="text-sm">
                    Čas do
                  </Label>
                  <Input
                    id="timeEnd"
                    name="timeEnd"
                    type="time"
                    defaultValue={editEvent?.timeEnd ?? ""}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact & capacity */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Ostatní
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="contactPerson" className="text-sm">
                  Kontaktní osoba
                </Label>
                <Input
                  id="contactPerson"
                  name="contactPerson"
                  defaultValue={editEvent?.contactPerson ?? ""}
                  placeholder="Jméno a příjmení"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="attendees" className="text-sm">
                  Počet účastníků
                </Label>
                <Input
                  id="attendees"
                  name="attendees"
                  type="number"
                  min="0"
                  defaultValue={editEvent?.attendees?.toString() ?? ""}
                  placeholder="—"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm">
                  Popis
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editEvent?.description ?? ""}
                  placeholder="Poznámky k akci…"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-zinc-100 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              className="flex-1"
              disabled={pending}
            >
              Zrušit
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {pending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? "Uložit" : "Vytvořit"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

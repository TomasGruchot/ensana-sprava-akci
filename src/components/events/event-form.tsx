"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2 } from "lucide-react";
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
import { formatInputDate, toLocalDate } from "@/lib/date";
import { isSameDay } from "date-fns";
import { createEvent, getEventById, updateEvent } from "@/lib/actions/events";
import { useEventFormStore } from "@/stores/event-form-store";
import type { ActionState, EventWithRelations, HotelWithRooms } from "@/types";

interface EventFormProps {
  hotels: HotelWithRooms[];
}

const initialState: ActionState = {};

export function EventForm({ hotels }: EventFormProps) {
  const { open, eventId, defaultRoomId, close } = useEventFormStore();
  const router = useRouter();

  const isEdit = !!eventId;
  const boundAction = isEdit ? updateEvent.bind(null, eventId!) : createEvent;

  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [editEvent, setEditEvent] = useState<EventWithRelations | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(false);

  const [selectedHotelId, setSelectedHotelId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [multiDay, setMultiDay] = useState(false);

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
    if (!open) {
      setEditEvent(null);
      setLoadingEvent(false);
      return;
    }

    if (!eventId) {
      setEditEvent(null);
      setLoadingEvent(false);
      return;
    }

    let cancelled = false;
    setLoadingEvent(true);
    setEditEvent(null);

    getEventById(eventId)
      .then((event) => {
        if (cancelled) return;
        if (!event) {
          toast.error("Akci se nepodařilo načíst");
          close();
          return;
        }
        setEditEvent(event);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Chyba při načítání akce");
          close();
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingEvent(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, eventId, close]);

  useEffect(() => {
    if (!open) return;

    if (editEvent) {
      setSelectedHotelId(editEvent.room.hotelId);
      setSelectedRoomId(editEvent.roomId);
      setAllDay(editEvent.allDay);
      setMultiDay(
        editEvent.dateEnd
          ? !isSameDay(toLocalDate(editEvent.date), toLocalDate(editEvent.dateEnd))
          : false,
      );
      return;
    }

    if (!eventId && defaultRoomId) {
      const hotel = hotels.find((h) =>
        h.rooms.some((r: { id: string }) => r.id === defaultRoomId),
      );
      setSelectedHotelId(hotel?.id ?? "");
      setSelectedRoomId(defaultRoomId);
      setAllDay(false);
      setMultiDay(false);
      return;
    }

    if (!eventId) {
      setSelectedHotelId("");
      setSelectedRoomId("");
      setAllDay(false);
      setMultiDay(false);
    }
  }, [open, editEvent, eventId, defaultRoomId, hotels]);

  const defaultDate = editEvent ? formatInputDate(editEvent.date) : "";
  const defaultDateEnd =
    editEvent?.dateEnd && multiDay ? formatInputDate(editEvent.dateEnd) : "";

  const formReady = open && (!isEdit || (editEvent && !loadingEvent));
  const formKey = isEdit ? `edit-${eventId}` : `create-${defaultRoomId ?? "new"}`;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && close()}>
      <SheetContent side="right" className="w-full max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-zinc-100">
          <SheetTitle className="text-base font-semibold">
            {isEdit ? "Upravit akci" : "Nová akce"}
          </SheetTitle>
        </SheetHeader>

        {!formReady ? (
          <div className="flex flex-1 items-center justify-center px-6 py-12">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : (
        <form
          key={formKey}
          action={formAction}
          className="flex flex-col flex-1 overflow-auto"
        >
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
                    onValueChange={(v: string | null) => {
                      setSelectedHotelId(v ?? "");
                      setSelectedRoomId("");
                    }}
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
                      value={selectedRoomId}
                      onValueChange={(v: string | null) => setSelectedRoomId(v ?? "")}
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

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={allDay ? "default" : "outline"}
                  size="sm"
                  className={
                    allDay
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : ""
                  }
                  onClick={() => setAllDay((v) => !v)}
                >
                  <CalendarDays className="w-4 h-4" />
                  Celodenní akce
                </Button>
                <Button
                  type="button"
                  variant={multiDay ? "default" : "outline"}
                  size="sm"
                  className={
                    multiDay
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                      : ""
                  }
                  onClick={() => setMultiDay((v) => !v)}
                >
                  Vícedenní akce
                </Button>
              </div>
              <input type="hidden" name="allDay" value={allDay ? "true" : "false"} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="date" className="text-sm">
                    {multiDay ? "Datum od" : "Datum"}
                  </Label>
                  <DateInput
                    id="date"
                    name="date"
                    defaultValue={defaultDate}
                    required
                  />
                  {state.fieldErrors?.date ? (
                    <p className="text-xs text-red-500">{state.fieldErrors.date[0]}</p>
                  ) : null}
                </div>
                {multiDay ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="dateEnd" className="text-sm">
                      Datum do
                    </Label>
                    <DateInput
                      id="dateEnd"
                      name="dateEnd"
                      defaultValue={defaultDateEnd}
                      required
                    />
                    {state.fieldErrors?.dateEnd ? (
                      <p className="text-xs text-red-500">{state.fieldErrors.dateEnd[0]}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {!allDay ? (
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
              ) : (
                <p className="text-xs text-zinc-500">
                  U celodenní akce se časy nevyplňují.
                </p>
              )}
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
        )}
      </SheetContent>
    </Sheet>
  );
}

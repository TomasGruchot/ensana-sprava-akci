"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { usePermissionsContext } from "@/components/layout/permissions-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { hasPermission } from "@/lib/permissions";
import { deleteRoom, saveRoom } from "@/lib/actions/hotels";
import { cn } from "@/lib/utils";
import type { ActionState, HotelWithRooms } from "@/types";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#0ea5e9", "#84cc16",
];

const initialState: ActionState = {};

type RoomListItem = {
  id: string;
  name: string;
  color: string | null;
  hotel: {
    id: string;
    name: string;
    code: string;
    color: string;
  };
  eventCount: number;
};

type RoomFormMode =
  | { type: "create"; defaultHotelId: string | null }
  | { type: "edit"; room: RoomListItem };

function formatEventCountLabel(count: number): string {
  if (count === 1) return "1 akce";
  if (count >= 2 && count <= 4) return `${count} akce`;
  return `${count} akcí`;
}

function formatRoomCountLabel(count: number): string {
  if (count === 1) return "1 místnost";
  if (count >= 2 && count <= 4) return `${count} místnosti`;
  return `${count} místností`;
}

export function RoomsList({
  hotels,
  eventCountsByRoomId,
}: {
  hotels: HotelWithRooms[];
  eventCountsByRoomId: Record<string, number>;
}) {
  const router = useRouter();
  const { role, grants } = usePermissionsContext();
  const [formMode, setFormMode] = useState<RoomFormMode | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<RoomListItem | null>(null);

  const editableHotels = useMemo(
    () =>
      hotels.filter((hotel) =>
        hasPermission({ role, grants }, "canUpdateHotels", { hotelId: hotel.id }),
      ),
    [grants, hotels, role],
  );

  const rooms = useMemo<RoomListItem[]>(
    () =>
      hotels.flatMap((hotel) =>
        hotel.rooms.map((room) => ({
          id: room.id,
          name: room.name,
          color: room.color,
          hotel: {
            id: hotel.id,
            name: hotel.name,
            code: hotel.code,
            color: hotel.color,
          },
          eventCount: eventCountsByRoomId[room.id] ?? 0,
        })),
      ),
    [eventCountsByRoomId, hotels],
  );

  async function handleDeleteRoom(room: RoomListItem) {
    const result = await deleteRoom(room.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Místnost byla odstraněna");
    setDeletingRoom(null);
    router.refresh();
  }

  return (
    <>
      <section className="rounded-2xl border border-zinc-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Seznam místností</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              {rooms.length > 0
                ? `${formatRoomCountLabel(rooms.length)} napříč všemi hotely`
                : "Zatím tu nejsou žádné místnosti"}
            </p>
          </div>
          {editableHotels.length > 0 ? (
            <Button
              type="button"
              onClick={() =>
                setFormMode({
                  type: "create",
                  defaultHotelId: editableHotels[0]?.id ?? null,
                })
              }
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="size-4" />
              Přidat místnost
            </Button>
          ) : null}
        </div>

        <div className="max-h-[50vh] divide-y divide-zinc-100 overflow-y-auto overscroll-contain">
          {rooms.length > 0 ? (
            rooms.map((room) => {
              const canManage = hasPermission(
                { role, grants },
                "canUpdateHotels",
                { hotelId: room.hotel.id },
              );

              return (
                <div
                  key={room.id}
                  className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-zinc-50/80 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                      className="mt-1 size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: room.color ?? room.hotel.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {room.name}
                        </p>
                        <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                          {room.hotel.code}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="size-3.5 text-zinc-400" />
                          {room.hotel.name}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="size-3.5 text-zinc-400" />
                          Naplánováno {formatEventCountLabel(room.eventCount)}
                        </span>
                        {room.color ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: room.color }}
                            />
                            Vlastní barva
                          </span>
                        ) : (
                          <span>Barva dědí z hotelu</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canManage ? (
                    <div className="flex shrink-0 items-center gap-2 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormMode({ type: "edit", room })}
                      >
                        <Pencil className="size-3.5" />
                        Upravit
                      </Button>

                      <AlertDialog
                        open={deletingRoom?.id === room.id}
                        onOpenChange={(open) => setDeletingRoom(open ? room : null)}
                      >
                        <AlertDialogTrigger
                          render={<Button type="button" variant="outline" size="sm" />}
                        >
                          <Trash2 className="size-3.5" />
                          Odstranit
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Odstranit místnost?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Místnost <strong>{room.name}</strong> z hotelu{" "}
                              <strong>{room.hotel.name}</strong> bude odstraněna včetně
                              navázaných akcí.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Zrušit</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteRoom(room)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Odstranit
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-zinc-500">
                Zatím žádné místnosti. Přidejte první místnost a přiřaďte ji k hotelu.
              </p>
            </div>
          )}
        </div>
      </section>

      {formMode ? (
        <RoomFormSheet
          key={formMode.type === "edit" ? formMode.room.id : `create-${formMode.defaultHotelId ?? "none"}`}
          hotels={editableHotels}
          mode={formMode}
          open
          onClose={() => setFormMode(null)}
        />
      ) : null}
    </>
  );
}

function RoomFormSheet({
  hotels,
  mode,
  open,
  onClose,
}: {
  hotels: HotelWithRooms[];
  mode: RoomFormMode;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEdit = mode.type === "edit";
  const initialHotelId =
    mode.type === "edit" ? mode.room.hotel.id : (mode.defaultHotelId ?? hotels[0]?.id ?? "");
  const initialName = mode.type === "edit" ? mode.room.name : "";
  const initialColor = mode.type === "edit" ? (mode.room.color ?? "") : "";

  const [hotelId, setHotelId] = useState(initialHotelId);
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  const selectedHotel = hotels.find((hotel) => hotel.id === hotelId) ?? hotels[0];

  const boundAction = isEdit
    ? saveRoom.bind(null, mode.room.id)
    : saveRoom.bind(null, null);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(isEdit ? "Místnost byla upravena" : "Místnost byla vytvořena");
      onClose();
      router.refresh();
      return;
    }

    if (state.error) {
      toast.error(state.error);
    }
  }, [isEdit, onClose, router, state]);

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent side="right" className="w-full max-w-md p-0">
        <SheetHeader className="border-b border-zinc-100 px-6 pt-6 pb-4">
          <SheetTitle>{isEdit ? "Upravit místnost" : "Přidat místnost"}</SheetTitle>
          <SheetDescription>
            Vyberte hotel, doplňte název místnosti a případně nastavte vlastní barvu.
          </SheetDescription>
        </SheetHeader>

        <form action={formAction} className="flex h-full flex-col">
          <input type="hidden" name="hotelId" value={hotelId} />
          <input type="hidden" name="color" value={color} />

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <Label>Hotel</Label>
              <Select
                items={hotels.map((hotel) => ({ value: hotel.id, label: hotel.name }))}
                value={hotelId}
                onValueChange={(value) => value && setHotelId(value)}
              >
                <SelectTrigger className="w-full bg-white">
                  <SelectValue placeholder="Vyberte hotel" />
                </SelectTrigger>
                <SelectContent>
                  {hotels.map((hotel) => (
                    <SelectItem key={hotel.id} value={hotel.id}>
                      {hotel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.fieldErrors?.hotelId ? (
                <p className="text-xs text-red-500">{state.fieldErrors.hotelId[0]}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-name">Název místnosti</Label>
              <Input
                id="room-name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Např. Salónek Bellevue"
                required
              />
              {state.fieldErrors?.name ? (
                <p className="text-xs text-red-500">{state.fieldErrors.name[0]}</p>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Barva místnosti</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setColor("")}
                >
                  Použít barvu hotelu
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setColor(preset)}
                    className={cn(
                      "size-6 rounded-full transition-all",
                      color === preset
                        ? "ring-2 ring-offset-1 ring-zinc-900 scale-110"
                        : "hover:scale-110",
                    )}
                    style={{ backgroundColor: preset }}
                    aria-label={preset}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                <input
                  type="color"
                  value={color || selectedHotel?.color || "#6366f1"}
                  onChange={(event) => setColor(event.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-md border border-zinc-200 bg-white p-1"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900">
                    {color ? "Vlastní barva místnosti" : "Používá se barva hotelu"}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {color || selectedHotel?.color || "#6366f1"}
                  </p>
                </div>
              </div>

              {state.fieldErrors?.color ? (
                <p className="text-xs text-red-500">{state.fieldErrors.color[0]}</p>
              ) : null}
            </div>
          </div>

          <div className="flex gap-3 border-t border-zinc-100 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={pending}
            >
              Zrušit
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={pending || !hotelId || !name.trim()}
            >
              {isEdit ? "Uložit změny" : "Přidat místnost"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

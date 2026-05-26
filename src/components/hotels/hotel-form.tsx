"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { useCanModifyHotel } from "@/components/layout/permissions-context";
import { usePermissions } from "@/components/layout/permissions-context";
import { saveHotel, deleteHotel, uploadHotelImage } from "@/lib/actions/hotels";
import { useHotelFormStore } from "@/stores/hotel-form-store";
import type { ActionState, Room } from "@/types";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#0ea5e9", "#84cc16",
];

type RoomEntry = { id?: string; name: string; color?: string; isNew?: boolean };

async function convertToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX = 1920;
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > MAX) { h = Math.round((h * MAX) / w); w = MAX; }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Konverze WebP selhala"))),
        "image/webp",
        0.88,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Načtení obrázku selhalo")); };
    img.src = url;
  });
}

const initialState: ActionState = {};

export function HotelForm() {
  const { open, hotel, close } = useHotelFormStore();
  const router = useRouter();
  const isEdit = !!hotel;
  const { canAddHotels } = usePermissions();
  const canUpdateHotel = useCanModifyHotel(hotel?.id ?? "", "update");
  const canDeleteHotel = useCanModifyHotel(hotel?.id ?? "", "delete");
  const canSave = isEdit ? canUpdateHotel : canAddHotels;

  const boundAction = isEdit
    ? saveHotel.bind(null, hotel.id)
    : saveHotel.bind(null, null);

  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const [color, setColor] = useState("#6366f1");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [rooms, setRooms] = useState<RoomEntry[]>([]);
  const [removedRoomIds, setRemovedRoomIds] = useState<string[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomColor, setNewRoomColor] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setColor(hotel?.color ?? "#6366f1");
      setImageUrl(hotel?.imageUrl ?? "");
      setImagePreview(hotel?.imageUrl ?? "");
      setRooms(
        hotel?.rooms.map((r: Room) => ({ id: r.id, name: r.name, color: r.color ?? undefined })) ??
          [],
      );
      setRemovedRoomIds([]);
      setNewRoomName("");
      setNewRoomColor("");
    }
  }, [open, hotel]);

  useEffect(() => {
    if (state.success) {
      toast.success(isEdit ? "Hotel byl upraven" : "Hotel byl vytvořen");
      close();
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, isEdit, close, router]);

  const handleImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Vyberte obrázek (JPEG, PNG, WebP…)");
      return;
    }
    setUploading(true);
    try {
      const webpBlob = await convertToWebP(file);
      const preview = URL.createObjectURL(webpBlob);
      setImagePreview(preview);

      const fd = new FormData();
      fd.append("image", webpBlob, "hotel.webp");
      const result = await uploadHotelImage(fd);
      if (result.error) {
        toast.error(`Nahrávání selhalo: ${result.error}`);
        setImagePreview(imageUrl);
      } else {
        setImageUrl(result.url!);
      }
    } catch (e) {
      toast.error("Chyba při zpracování obrázku");
      setImagePreview(imageUrl);
    } finally {
      setUploading(false);
    }
  }, [imageUrl]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleImageFile(file);
    },
    [handleImageFile],
  );

  function addRoom() {
    const name = newRoomName.trim();
    if (!name) return;
    setRooms((prev) => [
      ...prev,
      { name, color: newRoomColor || undefined, isNew: true },
    ]);
    setNewRoomName("");
    setNewRoomColor("");
  }

  function updateRoomColor(idx: number, roomColor: string) {
    setRooms((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], color: roomColor || undefined };
      return next;
    });
  }

  function removeRoom(idx: number) {
    const room = rooms[idx];
    if (room.id) setRemovedRoomIds((prev) => [...prev, room.id!]);
    setRooms((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleDelete() {
    const result = await deleteHotel(hotel!.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Hotel byl odstraněn");
      close();
      router.refresh();
    }
  }

  const roomsPayload = JSON.stringify({ rooms, removed: removedRoomIds });

  return (
    <Sheet open={open} onOpenChange={(v) => !v && close()}>
      <SheetContent side="right" className="w-full max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-zinc-100 flex-row items-center justify-between">
          <SheetTitle className="text-base font-semibold">
            {isEdit ? "Upravit hotel" : "Nový hotel"}
          </SheetTitle>
          {isEdit && canDeleteHotel ? (
            <AlertDialog>
              <AlertDialogTrigger
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-md text-red-500 hover:text-red-600 hover:bg-red-50"
                aria-label="Odstranit hotel"
              >
                <Trash2 className="size-4" />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Odstranit hotel?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tato akce je nevratná. Budou odstraněny také všechny místnosti
                    a akce spojené s tímto hotelem.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Zrušit</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Odstranit
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </SheetHeader>

        <form action={formAction} className="flex flex-col flex-1 overflow-auto">
          <input type="hidden" name="color" value={color} />
          <input type="hidden" name="imageUrl" value={imageUrl} />
          <input type="hidden" name="rooms" value={roomsPayload} />

          <div className="px-6 py-5 space-y-6 flex-1 overflow-y-auto">
            {/* Základní informace */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Základní informace
              </p>

              <div className="flex items-center gap-3">
                <Label className="text-sm shrink-0 w-24">Název</Label>
                <div className="flex-1 min-w-0">
                  <Input
                    name="name"
                    defaultValue={hotel?.name ?? ""}
                    placeholder="Název hotelu"
                    required
                  />
                  {state.fieldErrors?.name && (
                    <p className="text-xs text-red-500 mt-1">{state.fieldErrors.name[0]}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-sm shrink-0 w-24">Zkratka</Label>
                <div className="flex-1 min-w-0">
                  <Input
                    name="code"
                    defaultValue={hotel?.code ?? ""}
                    placeholder="HV"
                    maxLength={6}
                    required
                    className="uppercase"
                    onChange={(e) => {
                      e.target.value = e.target.value.toUpperCase();
                    }}
                  />
                  {state.fieldErrors?.code && (
                    <p className="text-xs text-red-500 mt-1">{state.fieldErrors.code[0]}</p>
                  )}
                </div>
              </div>

              {/* Barva */}
              <div className="flex items-start gap-3">
                <Label className="text-sm shrink-0 w-24 pt-1">Barva</Label>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn(
                          "w-6 h-6 rounded-md transition-all",
                          color === c
                            ? "ring-2 ring-offset-1 ring-zinc-900 scale-110"
                            : "hover:scale-105",
                        )}
                        style={{ backgroundColor: c }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-zinc-200 p-0.5"
                    />
                    <span className="text-xs text-zinc-500 font-mono">{color}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Fotografie */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Fotografie
              </p>

              <div
                ref={dropZoneRef}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                  "relative rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden",
                  uploading
                    ? "border-zinc-300 bg-zinc-50"
                    : imagePreview
                      ? "border-transparent"
                      : "border-zinc-200 hover:border-zinc-300 bg-zinc-50 hover:bg-zinc-100",
                )}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <div className="relative aspect-4/3">
                    <Image
                      src={imagePreview}
                      alt="Náhled"
                      fill
                      className="object-cover"
                      unoptimized={imagePreview.startsWith("blob:")}
                    />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                      <span className="text-white text-xs font-medium">Změnit obrázek</span>
                    </div>
                    {!uploading && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageUrl("");
                          setImagePreview("");
                        }}
                        className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow"
                        aria-label="Odstranit obrázek"
                      >
                        <X className="size-3.5 text-zinc-600" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="aspect-4/3 flex flex-col items-center justify-center gap-2 p-6">
                    {uploading ? (
                      <>
                        <Loader2 className="size-6 text-zinc-400 animate-spin" />
                        <p className="text-xs text-zinc-500">Nahrávání a konverze do WebP…</p>
                      </>
                    ) : (
                      <>
                        <Upload className="size-6 text-zinc-400" />
                        <p className="text-xs text-zinc-500 text-center">
                          Přetáhněte nebo klikněte pro výběr
                          <br />
                          <span className="text-zinc-400">Automaticky se převede na WebP</span>
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageFile(file);
                  e.target.value = "";
                }}
              />
            </div>

            <Separator />

            {/* Místnosti */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Místnosti
              </p>

              {rooms.length > 0 && (
                <ul className="space-y-1.5">
                  {rooms.map((room, idx) => (
                    <li
                      key={room.id ?? `new-${idx}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 group"
                    >
                      <input
                        type="color"
                        value={room.color ?? color}
                        onChange={(e) => updateRoomColor(idx, e.target.value)}
                        className="w-5 h-5 rounded cursor-pointer border-0 p-0 shrink-0 bg-transparent"
                        title="Barva místnosti"
                      />
                      <span className="flex-1 text-sm text-zinc-800 truncate">
                        {room.name}
                      </span>
                      {room.color && room.color !== color ? (
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: room.color }}
                          title="Vlastní barva"
                        />
                      ) : null}
                      {room.isNew && (
                        <span className="text-xs text-zinc-400 bg-zinc-200 rounded px-1.5 py-0.5 shrink-0">
                          nová
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeRoom(idx)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-red-500"
                        aria-label={`Odstranit místnost ${room.name}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Název místnosti…"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addRoom();
                      }
                    }}
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="color"
                      value={newRoomColor || color}
                      onChange={(e) => setNewRoomColor(e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border border-zinc-200 p-0.5 shrink-0"
                      title="Barva nové místnosti"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={addRoom}
                      aria-label="Přidat místnost"
                      disabled={!newRoomName.trim()}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-zinc-400">
                  Barva místnosti přepíše barvu hotelu v kalendáři a postranním panelu.
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-zinc-100 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              className="flex-1"
              disabled={pending || uploading}
            >
              Zrušit
            </Button>
            <Button
              type="submit"
              disabled={pending || uploading || !canSave}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {(pending || uploading) && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {isEdit ? "Uložit" : "Vytvořit"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

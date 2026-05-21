"use client";

import { useState, useTransition } from "react";
import { formatDisplayDate } from "@/lib/date";
import { Pencil, Trash2, MoreHorizontal, Clock, Users, Phone } from "lucide-react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCanModifyEvent } from "@/components/layout/permissions-context";
import { deleteEvent } from "@/lib/actions/events";
import { useEventFormStore } from "@/stores/event-form-store";
import type { EventWithRelations } from "@/types";

interface EventTableProps {
  events: EventWithRelations[];
}

export function EventTable({ events }: EventTableProps) {
  const openEdit = useEventFormStore((s) => s.openEdit);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteEvent(deleteId);
      if (result.success) {
        toast.success("Akce byla odstraněna");
      } else {
        toast.error(result.error ?? "Chyba při mazání");
      }
      setDeleteId(null);
    });
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
          <Clock className="w-5 h-5 text-zinc-400" />
        </div>
        <p className="text-sm font-medium text-zinc-600">Žádné akce nenalezeny</p>
        <p className="text-xs text-zinc-400 mt-1">Změňte filtry nebo přidejte novou akci</p>
      </div>
    );
  }

  return (
    <>
      <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wider w-32">
                Datum
              </TableHead>
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wider w-28">
                Čas
              </TableHead>
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Název akce
              </TableHead>
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wider w-36">
                Hotel
              </TableHead>
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wider w-40">
                Místnost
              </TableHead>
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wider w-36">
                Kontakt
              </TableHead>
              <TableHead className="text-xs font-semibold text-zinc-500 uppercase tracking-wider w-20 text-center">
                Účastníci
              </TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                onEdit={() => openEdit(event.id)}
                onDelete={() => setDeleteId(event.id)}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odstranit akci?</AlertDialogTitle>
            <AlertDialogDescription>
              Tuto akci nelze obnovit. Opravdu ji chcete smazat?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function EventRow({
  event,
  onEdit,
  onDelete,
}: {
  event: EventWithRelations;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const hotel = event.room.hotel;
  const canUpdate = useCanModifyEvent(hotel.id, event.roomId, "update");
  const canDelete = useCanModifyEvent(hotel.id, event.roomId, "delete");
  const showActions = canUpdate || canDelete;
  const dateLabel = formatDisplayDate(event.date);
  const timeLabel =
    event.timeStart
      ? event.timeEnd
        ? `${event.timeStart} – ${event.timeEnd}`
        : event.timeStart
      : "—";

  return (
    <TableRow className="group hover:bg-zinc-50/80 transition-colors">
      <TableCell className="text-sm text-zinc-900 font-medium">{dateLabel}</TableCell>
      <TableCell className="text-sm text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-zinc-300" />
          {timeLabel}
        </span>
      </TableCell>
      <TableCell className="text-sm font-medium text-zinc-900">{event.title}</TableCell>
      <TableCell>
        <span className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: hotel.color }}
          />
          <span className="text-sm text-zinc-700">{hotel.name}</span>
        </span>
      </TableCell>
      <TableCell className="text-sm text-zinc-600">{event.room.name}</TableCell>
      <TableCell className="text-sm text-zinc-600">
        {event.contactPerson ? (
          <span className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
            {event.contactPerson}
          </span>
        ) : (
          <span className="text-zinc-300">—</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {event.attendees != null ? (
          <span className="flex items-center justify-center gap-1 text-sm text-zinc-600">
            <Users className="w-3.5 h-3.5 text-zinc-300" />
            {event.attendees}
          </span>
        ) : (
          <span className="text-zinc-300 text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        {showActions ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex w-8 h-8 items-center justify-center rounded-md hover:bg-zinc-100 outline-none">
              <MoreHorizontal className="w-4 h-4 text-zinc-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {canUpdate ? (
                <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                  <Pencil className="w-3.5 h-3.5 mr-2" />
                  Upravit
                </DropdownMenuItem>
              ) : null}
              {canUpdate && canDelete ? <DropdownMenuSeparator /> : null}
              {canDelete ? (
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-red-600 cursor-pointer focus:text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Smazat
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

"use client";

import type { ComponentType, ReactNode } from "react";
import {
  Building2,
  Clock,
  Download,
  MapPin,
  Paperclip,
  Pencil,
  Phone,
  Users,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCanModifyEvent } from "@/components/layout/permissions-context";
import { formatEventSchedule } from "@/lib/event-schedule";
import { useEventDetailStore } from "@/stores/event-detail-store";
import { useEventFormStore } from "@/stores/event-form-store";
import type { CalendarEvent } from "@/types";

interface EventDetailDialogProps {
  events: CalendarEvent[];
}

function formatAttachmentSize(size?: number | null) {
  if (!size) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function toScheduleFields(cal: CalendarEvent) {
  return {
    date: cal.start,
    dateEnd: cal.extendedProps.dateEnd,
    allDay: cal.allDay ?? cal.extendedProps.allDay,
    timeStart: cal.extendedProps.timeStart,
    timeEnd: cal.extendedProps.timeEnd,
  };
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <div className="text-sm text-zinc-800">{children}</div>
      </div>
    </div>
  );
}

export function EventDetailDialog({ events }: EventDetailDialogProps) {
  const { open, eventId, closeDetail } = useEventDetailStore();
  const openEdit = useEventFormStore((s) => s.openEdit);

  const cal = eventId ? events.find((e) => e.id === eventId) : undefined;
  const props = cal?.extendedProps;
  const canUpdate = useCanModifyEvent(
    props?.hotelId ?? "",
    props?.roomId ?? "",
    "update",
  );

  function handleEdit() {
    if (!eventId) return;
    closeDetail();
    openEdit(eventId);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && closeDetail()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {cal ? (
          <>
            <DialogHeader className="px-5 pt-5 pb-4 border-b border-zinc-100">
              <div className="flex items-start gap-3 pr-8">
                <span
                  className="w-3 h-3 rounded-full shrink-0 mt-1"
                  style={{ backgroundColor: cal.backgroundColor }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <DialogTitle className="text-base font-semibold text-zinc-900 leading-snug">
                    {cal.title}
                  </DialogTitle>
                  <p className="text-sm text-zinc-500 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {formatEventSchedule(toScheduleFields(cal))}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="px-5 py-4 space-y-4">
              <DetailRow icon={Building2} label="Hotel">
                {props?.hotelName}
              </DetailRow>
              <DetailRow icon={MapPin} label="Místnost">
                {props?.roomName}
              </DetailRow>
              {props?.contactPerson ? (
                <DetailRow icon={User} label="Jméno">
                  {props.contactPerson}
                </DetailRow>
              ) : null}
              {props?.contactInfo ? (
                <DetailRow icon={Phone} label="Kontakt">
                  {props.contactInfo}
                </DetailRow>
              ) : null}
              {props?.attendees != null ? (
                <DetailRow icon={Users} label="Počet účastníků">
                  {props.attendees}
                </DetailRow>
              ) : null}
              {props?.description ? (
                <div className="pt-1">
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                    Popis
                  </p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                    {props.description}
                  </p>
                </div>
              ) : null}
              {props?.attachmentUrl ? (
                <div className="pt-1">
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                    Příloha
                  </p>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-3">
                    <div className="flex items-start gap-2">
                      <Paperclip className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900 break-all">
                          {props.attachmentName ?? "Příloha"}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {props.attachmentMimeType || "Neznámý typ"}
                          {props.attachmentSize
                            ? ` • ${formatAttachmentSize(props.attachmentSize)}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <a
                      href={props.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                    >
                      <Download className="w-4 h-4" />
                      Otevřít přílohu
                    </a>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 px-5 py-4 border-t border-zinc-100 bg-zinc-50/80">
              <Button type="button" variant="outline" onClick={closeDetail}>
                Zavřít
              </Button>
              {canUpdate ? (
                <Button
                  type="button"
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handleEdit}
                >
                  <Pencil className="w-4 h-4" />
                  Upravit
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-zinc-500">
            Akci se nepodařilo zobrazit.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

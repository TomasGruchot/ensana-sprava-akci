"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { cs } from "date-fns/locale";
import { ChevronDown, ChevronRight, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAuditLogs, type AuditLogEntry } from "@/lib/actions/audit";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_COLORS,
  type AuditAction,
} from "@/lib/audit-shared";

interface AuditLogTableProps {
  initialEntries: AuditLogEntry[];
  initialNextCursor: string | null;
}

function actionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action as AuditAction] ?? action;
}

function actionColor(action: string): string {
  return AUDIT_ACTION_COLORS[action as AuditAction] ?? "bg-zinc-100 text-zinc-600";
}

function entityTypeLabel(type: string): string {
  const map: Record<string, string> = {
    event: "Akce",
    hotel: "Hotel",
    user: "Uživatel",
  };
  return map[type] ?? type;
}

function DiffBlock({ before, after }: { before: unknown; after: unknown }) {
  if (!before && !after) return null;

  const renderValue = (val: unknown): string => {
    if (val === null || val === undefined) return "—";
    if (Array.isArray(val)) return val.join(", ") || "—";
    if (typeof val === "object") return JSON.stringify(val, null, 2);
    if (typeof val === "boolean") return val ? "ano" : "ne";
    return String(val);
  };

  const allKeys = [
    ...new Set([
      ...Object.keys((before as Record<string, unknown>) ?? {}),
      ...Object.keys((after as Record<string, unknown>) ?? {}),
    ]),
  ];

  const keyLabels: Record<string, string> = {
    title: "Název",
    date: "Datum od",
    dateEnd: "Datum do",
    allDay: "Celodenní",
    timeStart: "Čas od",
    timeEnd: "Čas do",
    contactPerson: "Jméno",
    contactInfo: "Kontakt",
    attendees: "Počet účastníků",
    description: "Popis",
    room: "Místnost",
    hotel: "Hotel",
    name: "Jméno",
    code: "Zkratka",
    color: "Barva",
    imageUrl: "Obrázek",
    rooms: "Místnosti",
    addedRooms: "Přidané místnosti",
    removedRoomIds: "Smazané místnosti (ID)",
    role: "Role",
    email: "E-mail",
    targetEmail: "Cílový e-mail",
    createdFromUpdateOf: "Zkopírováno z akce ID",
  };

  if (!before) {
    const obj = after as Record<string, unknown>;
    return (
      <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs space-y-1">
        <p className="font-semibold text-emerald-700 mb-1.5">Vytvořeno</p>
        {allKeys.map((k) => (
          <div key={k} className="flex gap-2">
            <span className="w-36 shrink-0 text-zinc-500">{keyLabels[k] ?? k}</span>
            <span className="text-zinc-800 font-medium">{renderValue(obj[k])}</span>
          </div>
        ))}
      </div>
    );
  }

  if (!after) {
    const obj = before as Record<string, unknown>;
    return (
      <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs space-y-1">
        <p className="font-semibold text-red-700 mb-1.5">Smazáno</p>
        {allKeys.map((k) => (
          <div key={k} className="flex gap-2">
            <span className="w-36 shrink-0 text-zinc-500">{keyLabels[k] ?? k}</span>
            <span className="text-zinc-500 line-through">{renderValue(obj[k])}</span>
          </div>
        ))}
      </div>
    );
  }

  const beforeObj = before as Record<string, unknown>;
  const afterObj = after as Record<string, unknown>;
  const changedKeys = allKeys.filter(
    (k) => JSON.stringify(beforeObj[k]) !== JSON.stringify(afterObj[k]),
  );
  const unchangedKeys = allKeys.filter(
    (k) => JSON.stringify(beforeObj[k]) === JSON.stringify(afterObj[k]),
  );

  return (
    <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs space-y-1">
      <p className="font-semibold text-sky-700 mb-1.5">Změny</p>
      {changedKeys.length === 0 && (
        <p className="text-zinc-400 italic">Žádné zjistitelné změny hodnot</p>
      )}
      {changedKeys.map((k) => (
        <div key={k} className="flex gap-2 items-start">
          <span className="w-36 shrink-0 text-zinc-500">{keyLabels[k] ?? k}</span>
          <span className="text-red-600 line-through mr-1">{renderValue(beforeObj[k])}</span>
          <span className="text-zinc-400 mr-1">→</span>
          <span className="text-emerald-700 font-medium">{renderValue(afterObj[k])}</span>
        </div>
      ))}
      {unchangedKeys.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer text-zinc-400 select-none">
            Nezměněné hodnoty ({unchangedKeys.length})
          </summary>
          <div className="mt-1 space-y-1">
            {unchangedKeys.map((k) => (
              <div key={k} className="flex gap-2">
                <span className="w-36 shrink-0 text-zinc-400">{keyLabels[k] ?? k}</span>
                <span className="text-zinc-400">{renderValue(afterObj[k])}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = entry.before !== null || entry.after !== null;

  return (
    <>
      <TableRow
        className={cn(
          "group cursor-default",
          hasDetail && "cursor-pointer hover:bg-zinc-50",
        )}
        onClick={() => hasDetail && setExpanded((v) => !v)}
      >
        <TableCell className="text-xs text-zinc-500 whitespace-nowrap">
          <span title={format(new Date(entry.createdAt), "d. M. yyyy HH:mm:ss")}>
            {formatDistanceToNow(new Date(entry.createdAt), {
              addSuffix: true,
              locale: cs,
            })}
          </span>
        </TableCell>
        <TableCell>
          <Badge className={cn("text-xs font-medium", actionColor(entry.action))}>
            {actionLabel(entry.action)}
          </Badge>
        </TableCell>
        <TableCell className="text-xs">
          <span className="text-zinc-400 mr-1">{entityTypeLabel(entry.entityType)}</span>
          <span className="font-medium text-zinc-800 truncate max-w-[200px] block">
            {entry.entityLabel ?? entry.entityId ?? "—"}
          </span>
        </TableCell>
        <TableCell className="text-xs text-zinc-700">
          {entry.actorName || entry.actorEmail ? (
            <div>
              {entry.actorName && (
                <span className="font-medium block truncate max-w-[140px]">
                  {entry.actorName}
                </span>
              )}
              {entry.actorEmail && (
                <span className="text-zinc-400 block truncate max-w-[140px]">
                  {entry.actorEmail}
                </span>
              )}
            </div>
          ) : (
            <span className="text-zinc-300">—</span>
          )}
        </TableCell>
        <TableCell className="text-center w-8">
          {hasDetail ? (
            expanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 mx-auto" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 mx-auto" />
            )
          ) : null}
        </TableCell>
      </TableRow>
      {expanded && hasDetail && (
        <TableRow>
          <TableCell colSpan={5} className="bg-zinc-50/60 px-4 pb-4 pt-0">
            <DiffBlock before={entry.before} after={entry.after} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function AuditLogTable({
  initialEntries,
  initialNextCursor,
}: AuditLogTableProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>(initialEntries);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isPending, startTransition] = useTransition();

  function loadMore() {
    startTransition(async () => {
      const { entries: more, nextCursor: cursor } = await getAuditLogs(
        nextCursor ?? undefined,
      );
      setEntries((prev) => [...prev, ...more]);
      setNextCursor(cursor);
    });
  }

  return (
    <section className="bg-white rounded-2xl border border-zinc-200">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100">
        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-zinc-500" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Audit log</h2>
          <p className="text-xs text-zinc-500">
            Záznamy všech akcí provedených v systému
          </p>
        </div>
        <span className="ml-auto text-xs text-zinc-400">{entries.length} záznamů</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-10">
          Zatím žádné záznamy.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs w-32">Kdy</TableHead>
                <TableHead className="text-xs w-40">Akce</TableHead>
                <TableHead className="text-xs">Entita</TableHead>
                <TableHead className="text-xs w-44">Uživatel</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <AuditRow key={entry.id} entry={entry} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {nextCursor && (
        <div className="flex justify-center px-5 py-4 border-t border-zinc-100">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={isPending}
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
            Načíst starší záznamy
          </Button>
        </div>
      )}
    </section>
  );
}

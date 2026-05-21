"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { LayoutList, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseEventDisplayView } from "@/lib/event-view";

const VIEW_OPTIONS = [
  { value: "list" as const, label: "Seznam", icon: LayoutList },
  { value: "calendar" as const, label: "Kalendář", icon: CalendarDays },
];

export function EventViewSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const view = parseEventDisplayView(searchParams.get("view") ?? undefined);

  function setView(newView: "list" | "calendar") {
    const params = new URLSearchParams(searchParams.toString());
    if (newView === "list") {
      params.delete("view");
      params.delete("scale");
    } else {
      params.set("view", "calendar");
      if (!params.has("scale")) params.set("scale", "month");
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div
      className="flex items-center gap-0.5 bg-zinc-100 rounded-lg p-0.5"
      role="group"
      aria-label="Zobrazení akcí"
    >
      {VIEW_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = view === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setView(opt.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all",
              active
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700",
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

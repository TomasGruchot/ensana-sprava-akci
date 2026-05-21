"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { parseCalendarScale, type CalendarScale } from "@/lib/event-view";

const SCALE_OPTIONS: { value: CalendarScale; label: string }[] = [
  { value: "day", label: "Den" },
  { value: "week", label: "Týden" },
  { value: "month", label: "Měsíc" },
  { value: "year", label: "Rok" },
];

export function EventCalendarScaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const scale = parseCalendarScale(searchParams.get("scale") ?? undefined);

  function setScale(newScale: CalendarScale) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scale", newScale);
    if (pathname.startsWith("/akce")) {
      params.set("view", "calendar");
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex items-center gap-0.5 bg-zinc-100 rounded-lg p-0.5">
      {SCALE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setScale(opt.value)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
            scale === opt.value
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

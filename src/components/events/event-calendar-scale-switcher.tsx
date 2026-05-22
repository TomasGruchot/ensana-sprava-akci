"use client";

import { useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { parseCalendarScale, type CalendarScale } from "@/lib/event-view";

const SCALE_OPTIONS: { value: CalendarScale; label: string }[] = [
  { value: "day", label: "Den" },
  { value: "week", label: "Týden" },
  { value: "month", label: "Měsíc" },
  { value: "year", label: "Rok" },
];

const LS_KEY = "calendar-scale-v1";

function saveScale(scale: CalendarScale) {
  try {
    localStorage.setItem(LS_KEY, scale);
  } catch {}
}

function loadScale(): CalendarScale | null {
  try {
    return parseCalendarScale(localStorage.getItem(LS_KEY) ?? undefined) ?? null;
  } catch {
    return null;
  }
}

export function EventCalendarScaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const scaleParam = searchParams.get("scale");
  const scale = parseCalendarScale(scaleParam ?? undefined);

  // Při prvním načtení — pokud URL neobsahuje scale, načti z localStorage
  useEffect(() => {
    if (scaleParam) return;
    const saved = loadScale();
    if (!saved || saved === "month") return; // month je výchozí, není třeba přepsat URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("scale", saved);
    if (pathname.startsWith("/akce")) {
      params.set("view", "calendar");
    }
    router.replace(`${pathname}?${params.toString()}`);
  // Záměrně spustíme jen při prvním render — deps jsou stabilní refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setScale(newScale: CalendarScale) {
    saveScale(newScale);
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

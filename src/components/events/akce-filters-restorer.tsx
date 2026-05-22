"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

const STORAGE_KEY = "akce-filters-v1";

type StoredFilters = {
  state?: {
    hotel?: string;
    room?: string;
    view?: string;
    scale?: string;
  };
};

/**
 * Na prvním renderu bez URL params obnoví poslední uložené filtry z localStorage.
 * Čte přímo z localStorage aby nespouštěl zustand subscription loop.
 */
export function AkceFiltersRestorer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    if (searchParams.toString() !== "") return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: StoredFilters = JSON.parse(raw);
      const s = parsed?.state ?? {};

      const params = new URLSearchParams();
      if (s.hotel) params.set("hotel", s.hotel);
      if (s.room) params.set("room", s.room);
      if (s.view) params.set("view", s.view);
      if (s.scale) params.set("scale", s.scale);

      if (params.toString()) {
        router.replace(`${pathname}?${params.toString()}`);
      }
    } catch {
      // poškozená data — ignorujeme
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

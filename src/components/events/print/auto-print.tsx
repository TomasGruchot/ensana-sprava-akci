"use client";

import { useEffect, useRef } from "react";
import { Printer, X } from "lucide-react";

interface AutoPrintProps {
  /** Automaticky spustit print dialog po načtení */
  autoPrint?: boolean;
}

export function AutoPrint({ autoPrint = true }: AutoPrintProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (!autoPrint || fired.current) return;
    fired.current = true;
    // Malé zpoždění, aby se v některých prohlížečích stihl načíst font a layout
    const t = window.setTimeout(() => {
      try {
        window.print();
      } catch {
        /* no-op */
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [autoPrint]);

  return (
    <div className="print-hide print-screen-bar bg-white/95 backdrop-blur border-b border-zinc-200 shadow-sm">
      <div className="max-w-[277mm] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <div className="text-sm text-zinc-600">
          <span className="font-semibold text-zinc-900">Náhled tisku</span>
          <span className="hidden sm:inline text-zinc-400">
            {" · "}V dialogu prohlížeče vypněte „záhlaví a zápatí“ pro čistý
            výstup.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            <Printer className="w-4 h-4" />
            Tisknout
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
          >
            <X className="w-4 h-4" />
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
}

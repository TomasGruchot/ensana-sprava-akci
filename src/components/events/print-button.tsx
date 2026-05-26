"use client";

import { Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCalendarStateStore } from "@/stores/calendar-state-store";

export function PrintButton() {
  const searchParams = useSearchParams();
  const referenceDate = useCalendarStateStore((s) => s.referenceDate);

  function openPrint() {
    const params = new URLSearchParams(searchParams.toString());
    if (referenceDate) {
      params.set("ref", referenceDate);
    }
    const qs = params.toString();
    const url = qs ? `/akce/tisk?${qs}` : "/akce/tisk";

    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win) {
      // Pokud popup blocker zablokoval okno, otevřeme v aktuálním tabu
      window.location.href = url;
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={openPrint}
      className="gap-1.5"
      title="Otevřít náhled tisku v novém okně"
    >
      <Printer className="size-4" />
      <span className="hidden sm:inline">Tisk</span>
    </Button>
  );
}

"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/components/layout/permissions-context";
import { useHotelFormStore } from "@/stores/hotel-form-store";

export function HotelAddButton() {
  const openCreate = useHotelFormStore((s) => s.openCreate);
  const { canAddHotels } = usePermissions();

  if (!canAddHotels) return null;

  return (
    <Button
      type="button"
      onClick={openCreate}
      className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
    >
      <Plus className="size-4" />
      Přidat hotel
    </Button>
  );
}

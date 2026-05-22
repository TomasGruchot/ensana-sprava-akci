import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AkceFiltersState = {
  hotel: string;
  room: string;
  from: string;
  to: string;
  view: string;
  scale: string;
};

type AkceFiltersStore = AkceFiltersState & {
  setFilters: (partial: Partial<AkceFiltersState>) => void;
  clearFilters: () => void;
};

const DEFAULTS: AkceFiltersState = {
  hotel: "",
  room: "",
  from: "",
  to: "",
  view: "",
  scale: "",
};

export const useAkceFiltersStore = create<AkceFiltersStore>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setFilters: (partial) => set((s) => ({ ...s, ...partial })),
      clearFilters: () => set(DEFAULTS),
    }),
    {
      name: "akce-filters-v1",
      partialize: (s) => ({
        hotel: s.hotel,
        room: s.room,
        from: s.from,
        to: s.to,
        view: s.view,
        scale: s.scale,
      }),
    },
  ),
);

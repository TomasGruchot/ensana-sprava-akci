import { create } from "zustand";

/**
 * Stav kalendáře sdílený mezi FullCalendar a PrintButton — drží referenční datum,
 * které uživatel aktuálně prohlíží (start aktuálního období).
 */
export type CalendarStateStore = {
  /** ISO datum YYYY-MM-DD aktuálně zobrazeného období */
  referenceDate: string | null;
  setReferenceDate: (iso: string | null) => void;
};

export const useCalendarStateStore = create<CalendarStateStore>((set) => ({
  referenceDate: null,
  setReferenceDate: (iso) => set({ referenceDate: iso }),
}));

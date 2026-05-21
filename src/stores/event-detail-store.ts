import { create } from "zustand";

type EventDetailStore = {
  open: boolean;
  eventId: string | null;
  openDetail: (eventId: string) => void;
  closeDetail: () => void;
};

export const useEventDetailStore = create<EventDetailStore>((set) => ({
  open: false,
  eventId: null,
  openDetail: (eventId) => set({ open: true, eventId }),
  closeDetail: () => set({ open: false, eventId: null }),
}));

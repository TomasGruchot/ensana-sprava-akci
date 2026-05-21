import { create } from "zustand";

type EventFormStore = {
  open: boolean;
  eventId: string | null;
  defaultRoomId: string | null;
  openCreate: (defaultRoomId?: string) => void;
  openEdit: (eventId: string) => void;
  close: () => void;
};

export const useEventFormStore = create<EventFormStore>((set) => ({
  open: false,
  eventId: null,
  defaultRoomId: null,
  openCreate: (defaultRoomId) =>
    set({ open: true, eventId: null, defaultRoomId: defaultRoomId ?? null }),
  openEdit: (eventId) =>
    set({ open: true, eventId, defaultRoomId: null }),
  close: () =>
    set({ open: false, eventId: null, defaultRoomId: null }),
}));

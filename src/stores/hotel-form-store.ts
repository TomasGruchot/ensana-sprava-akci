import { create } from "zustand";
import type { HotelWithRooms } from "@/types";

type HotelFormStore = {
  open: boolean;
  hotel: HotelWithRooms | null;
  openCreate: () => void;
  openEdit: (hotel: HotelWithRooms) => void;
  close: () => void;
};

export const useHotelFormStore = create<HotelFormStore>((set) => ({
  open: false,
  hotel: null,
  openCreate: () => set({ open: true, hotel: null }),
  openEdit: (hotel) => set({ open: true, hotel }),
  close: () => set({ open: false, hotel: null }),
}));

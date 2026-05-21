import type {
  HotelModel as Hotel,
  RoomModel as Room,
  EventModel as Event,
  ProfileModel as Profile,
  RoomManagerModel as RoomManager,
} from "@/generated/prisma/models";
import type { Role } from "@/generated/prisma/enums";

export type { Hotel, Room, Event, Profile, RoomManager, Role };

export type HotelWithRooms = Hotel & {
  rooms: Room[];
};

export type RoomWithHotel = Room & {
  hotel: Hotel;
};

export type EventWithRelations = Event & {
  room: RoomWithHotel;
};

export type ProfileWithManagers = Profile & {
  managers: (RoomManager & {
    room: RoomWithHotel;
  })[];
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    eventId: string;
    roomName: string;
    hotelName: string;
    hotelCode: string;
    contactPerson?: string | null;
    attendees?: number | null;
    description?: string | null;
    timeStart?: string | null;
    timeEnd?: string | null;
  };
};

export type ActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

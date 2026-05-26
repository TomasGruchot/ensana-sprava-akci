import type {
  HotelModel as Hotel,
  RoomModel as Room,
  EventModel as Event,
  ProfileModel as Profile,
  RoomManagerModel as RoomManager,
  PermissionGrantModel as PermissionGrant,
} from "@/generated/prisma/models";
import type { Role } from "@/generated/prisma/enums";

export type { Hotel, Room, Event, Profile, RoomManager, PermissionGrant, Role };

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

export type ProfileWithGrants = Profile & {
  grants: PermissionGrant[];
};

export type ProfileWithAccess = Profile & {
  grants: PermissionGrant[];
  managers: (RoomManager & {
    room: RoomWithHotel;
  })[];
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    eventId: string;
    hotelId: string;
    roomId: string;
    roomName: string;
    hotelName: string;
    hotelCode: string;
    contactPerson?: string | null;
    contactInfo?: string | null;
    attendees?: number | null;
    description?: string | null;
    attachmentName?: string | null;
    attachmentUrl?: string | null;
    attachmentMimeType?: string | null;
    attachmentSize?: number | null;
    allDay?: boolean;
    dateEnd?: Date | null;
    timeStart?: string | null;
    timeEnd?: string | null;
  };
};

export type ActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  createdCount?: number;
  fieldErrors?: Record<string, string[]>;
};

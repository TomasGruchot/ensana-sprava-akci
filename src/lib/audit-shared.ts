export type AuditAction =
  | "EVENT_CREATE"
  | "EVENT_UPDATE"
  | "EVENT_DELETE"
  | "HOTEL_CREATE"
  | "HOTEL_UPDATE"
  | "HOTEL_DELETE"
  | "ROOM_CREATE"
  | "ROOM_UPDATE"
  | "ROOM_DELETE"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_DELETE"
  | "PASSWORD_RESET";

export type AuditEntityType = "event" | "hotel" | "room" | "user";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  EVENT_CREATE: "Akce vytvořena",
  EVENT_UPDATE: "Akce upravena",
  EVENT_DELETE: "Akce smazána",
  HOTEL_CREATE: "Hotel vytvořen",
  HOTEL_UPDATE: "Hotel upraven",
  HOTEL_DELETE: "Hotel smazán",
  ROOM_CREATE: "Místnost vytvořena",
  ROOM_UPDATE: "Místnost upravena",
  ROOM_DELETE: "Místnost smazána",
  USER_CREATE: "Uživatel vytvořen",
  USER_UPDATE: "Uživatel upraven",
  USER_DELETE: "Uživatel smazán",
  PASSWORD_RESET: "Reset hesla",
};

export const AUDIT_ACTION_COLORS: Record<AuditAction, string> = {
  EVENT_CREATE: "bg-emerald-100 text-emerald-700",
  EVENT_UPDATE: "bg-sky-100 text-sky-700",
  EVENT_DELETE: "bg-red-100 text-red-700",
  HOTEL_CREATE: "bg-violet-100 text-violet-700",
  HOTEL_UPDATE: "bg-indigo-100 text-indigo-700",
  HOTEL_DELETE: "bg-red-100 text-red-700",
  ROOM_CREATE: "bg-teal-100 text-teal-700",
  ROOM_UPDATE: "bg-cyan-100 text-cyan-700",
  ROOM_DELETE: "bg-red-100 text-red-700",
  USER_CREATE: "bg-emerald-100 text-emerald-700",
  USER_UPDATE: "bg-amber-100 text-amber-700",
  USER_DELETE: "bg-red-100 text-red-700",
  PASSWORD_RESET: "bg-orange-100 text-orange-700",
};

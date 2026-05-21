import { Role } from "@/generated/prisma/enums";
import type { PermissionGrant, Profile } from "@/types";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Hlavní administrátor",
  IT: "IT správa",
  USER: "Uživatel",
  MANAGER: "Správce místností",
  VIEWER: "Pouze čtení",
};

export const PERMISSION_LABELS = {
  canCreateEvents: "Přidávat akce",
  canUpdateEvents: "Upravovat akce",
  canDeleteEvents: "Odstraňovat akce",
  canCreateHotels: "Přidávat hotely",
  canUpdateHotels: "Upravovat hotely",
  canDeleteHotels: "Odstraňovat hotely",
  canManageUsers: "Spravovat účty",
} as const;

export type PermissionKey = keyof typeof PERMISSION_LABELS;

export const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS) as PermissionKey[];

export type PermissionFlags = Pick<PermissionGrant, PermissionKey>;

export const EMPTY_PERMISSIONS: PermissionFlags = {
  canCreateEvents: false,
  canUpdateEvents: false,
  canDeleteEvents: false,
  canCreateHotels: false,
  canUpdateHotels: false,
  canDeleteHotels: false,
  canManageUsers: false,
};

export type ProfileWithGrants = Profile & {
  grants: PermissionGrant[];
};

export function isMainAdmin(role: Role): boolean {
  return role === Role.ADMIN;
}

export function isItStaff(role: Role): boolean {
  return role === Role.IT;
}

export function hasItAccess(role: Role): boolean {
  return role === Role.ADMIN || role === Role.IT;
}

export function hasFullDataAccess(role: Role): boolean {
  return hasItAccess(role);
}

export function canManageAllAccounts(role: Role): boolean {
  return hasItAccess(role);
}

export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === Role.ADMIN) return true;
  if (actorRole === Role.IT) return targetRole !== Role.ADMIN;
  return false;
}

export function canGrantCreateHotels(actorRole: Role): boolean {
  return actorRole === Role.ADMIN;
}

function mergeFlags(a: PermissionFlags, b: PermissionFlags): PermissionFlags {
  const out = { ...EMPTY_PERMISSIONS };
  for (const key of PERMISSION_KEYS) {
    out[key] = a[key] || b[key];
  }
  return out;
}

export function resolveScopedPermissions(
  grants: PermissionGrant[],
  hotelId: string,
  roomId?: string | null,
): PermissionFlags {
  const hotelGrant = grants.find((g) => g.hotelId === hotelId && g.roomId == null);
  const roomGrant =
    roomId != null
      ? grants.find((g) => g.hotelId === hotelId && g.roomId === roomId)
      : undefined;

  if (hotelGrant && roomGrant) {
    return mergeFlags(pickFlags(hotelGrant), pickFlags(roomGrant));
  }
  if (roomGrant) return pickFlags(roomGrant);
  if (hotelGrant) return pickFlags(hotelGrant);
  return { ...EMPTY_PERMISSIONS };
}

function pickFlags(grant: PermissionGrant): PermissionFlags {
  const flags = { ...EMPTY_PERMISSIONS };
  for (const key of PERMISSION_KEYS) {
    flags[key] = grant[key];
  }
  return flags;
}

export function hasPermission(
  profile: Pick<Profile, "role"> & { grants?: PermissionGrant[] },
  key: PermissionKey,
  scope?: { hotelId: string; roomId?: string | null },
): boolean {
  if (hasFullDataAccess(profile.role)) {
    if (key === "canCreateHotels") return isMainAdmin(profile.role);
    return true;
  }

  if (!scope?.hotelId) return false;

  const grants = profile.grants ?? [];
  const flags = resolveScopedPermissions(grants, scope.hotelId, scope.roomId);
  return flags[key];
}

/** Všichni přihlášení vidí všechny hotely/akce; bez grantu jen jako čtenář. */
export function canReadAll(): boolean {
  return true;
}

/** Migrace starých rolí MANAGER/VIEWER na USER + granty z RoomManager. */
export function normalizeRole(role: Role): Role {
  if (role === Role.MANAGER || role === Role.VIEWER) return Role.USER;
  return role;
}

export type UserCapabilities = {
  canManageAccounts: boolean;
  canAddHotels: boolean;
  canCreateEvents: boolean;
  canUpdateEvents: boolean;
  canDeleteEvents: boolean;
  canUpdateHotels: boolean;
  canDeleteHotels: boolean;
};

export function buildUserCapabilities(
  profile: Pick<Profile, "role"> & { grants?: PermissionGrant[] },
): UserCapabilities {
  if (hasFullDataAccess(profile.role)) {
    return {
      canManageAccounts: canManageAllAccounts(profile.role),
      canAddHotels: isMainAdmin(profile.role),
      canCreateEvents: true,
      canUpdateEvents: true,
      canDeleteEvents: true,
      canUpdateHotels: true,
      canDeleteHotels: true,
    };
  }

  const grants = profile.grants ?? [];
  const caps = {
    canManageAccounts: false,
    canAddHotels: false,
    canCreateEvents: false,
    canUpdateEvents: false,
    canDeleteEvents: false,
    canUpdateHotels: false,
    canDeleteHotels: false,
  };

  for (const g of grants) {
    if (g.canManageUsers) caps.canManageAccounts = true;
    if (g.canCreateHotels) caps.canAddHotels = true;
    if (g.canCreateEvents) caps.canCreateEvents = true;
    if (g.canUpdateEvents) caps.canUpdateEvents = true;
    if (g.canDeleteEvents) caps.canDeleteEvents = true;
    if (g.canUpdateHotels) caps.canUpdateHotels = true;
    if (g.canDeleteHotels) caps.canDeleteHotels = true;
  }

  return caps;
}

export function canModifyEventInScope(
  profile: Pick<Profile, "role"> & { grants?: PermissionGrant[] },
  hotelId: string,
  roomId: string,
  action: "create" | "update" | "delete",
): boolean {
  const key =
    action === "create"
      ? "canCreateEvents"
      : action === "update"
        ? "canUpdateEvents"
        : "canDeleteEvents";
  return hasPermission(profile, key, { hotelId, roomId });
}

export function grantsFromLegacyManagers(
  managers: { roomId: string; room: { hotelId: string } }[],
): Omit<PermissionGrant, "id" | "profileId" | "createdAt" | "updatedAt">[] {
  const byRoom = new Map<string, { hotelId: string; roomId: string }>();
  for (const m of managers) {
    byRoom.set(m.roomId, { hotelId: m.room.hotelId, roomId: m.roomId });
  }
  return [...byRoom.values()].map(({ hotelId, roomId }) => ({
    hotelId,
    roomId,
    canCreateEvents: true,
    canUpdateEvents: true,
    canDeleteEvents: true,
    canCreateHotels: false,
    canUpdateHotels: false,
    canDeleteHotels: false,
    canManageUsers: false,
  }));
}

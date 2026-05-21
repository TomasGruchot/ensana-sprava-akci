import "server-only";

import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import {
  canManageAllAccounts,
  hasItAccess,
  hasPermission,
  isMainAdmin,
  type PermissionKey,
  type ProfileWithGrants,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ensureSessionProfileWithGrants } from "@/lib/supabase/session";
import type { Profile } from "@/types";

export async function getSessionProfile(): Promise<Profile | null> {
  const profile = await ensureSessionProfileWithGrants();
  return profile;
}

export async function getSessionProfileWithGrants(): Promise<ProfileWithGrants | null> {
  return ensureSessionProfileWithGrants();
}

export async function requireAdminProfile(): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== Role.ADMIN) {
    redirect("/");
  }
  return profile;
}

export async function requireItProfile(): Promise<ProfileWithGrants> {
  const profile = await getSessionProfileWithGrants();
  if (!profile || !hasItAccess(profile.role)) {
    redirect("/");
  }
  return profile;
}

export async function assertCanManageUsers(): Promise<
  { profile: ProfileWithGrants } | { error: string }
> {
  const profile = await getSessionProfileWithGrants();
  if (!profile) return { error: "Nejste přihlášeni" };
  if (canManageAllAccounts(profile.role)) {
    return { profile };
  }
  return { error: "Nemáte oprávnění spravovat uživatele" };
}

export async function assertEventPermission(
  key: Extract<PermissionKey, "canCreateEvents" | "canUpdateEvents" | "canDeleteEvents">,
  roomId: string,
): Promise<{ profile: ProfileWithGrants } | { error: string }> {
  const profile = await getSessionProfileWithGrants();
  if (!profile) return { error: "Nejste přihlášeni" };

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { hotelId: true },
  });
  if (!room) return { error: "Místnost nenalezena" };

  if (hasPermission(profile, key, { hotelId: room.hotelId, roomId })) {
    return { profile };
  }

  return { error: "Nemáte oprávnění k této akci" };
}

export async function assertHotelPermission(
  key: Extract<PermissionKey, "canCreateHotels" | "canUpdateHotels" | "canDeleteHotels">,
  hotelId?: string | null,
): Promise<{ profile: ProfileWithGrants } | { error: string }> {
  const profile = await getSessionProfileWithGrants();
  if (!profile) return { error: "Nejste přihlášeni" };

  if (key === "canCreateHotels") {
    if (isMainAdmin(profile.role)) return { profile };
    return { error: "Přidávat hotely může pouze hlavní administrátor" };
  }

  if (!hotelId) return { error: "Hotel nenalezen" };

  if (hasPermission(profile, key, { hotelId })) {
    return { profile };
  }

  return { error: "Nemáte oprávnění k tomuto hotelu" };
}

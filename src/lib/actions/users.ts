"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  canAssignRole,
  canGrantCreateHotels,
  canManageAllAccounts,
  grantsFromLegacyManagers,
  hasItAccess,
  normalizeRole,
} from "@/lib/permissions";
import {
  getSessionProfileWithGrants,
  requireItProfile,
} from "@/lib/permissions-server";
import { dedupeGrants, parseGrantsJson } from "@/lib/permission-grants";
import { generateActivationCode, activationExpiry } from "@/lib/activation";
import { logAudit } from "@/lib/audit";
import type { ActionState, ProfileWithAccess } from "@/types";

const RoleSchema = z.enum(["ADMIN", "IT", "USER", "MANAGER", "VIEWER"]);

const CreateUserSchema = z.object({
  email: z.string().email("Neplatný e-mail"),
  name: z.string().min(1, "Jméno je povinné"),
  role: RoleSchema,
  grantsJson: z.string().optional(),
});

const UpdateUserSchema = z.object({
  profileId: z.string().min(1),
  name: z.string().min(1, "Jméno je povinné"),
  role: RoleSchema,
  grantsJson: z.string().optional(),
});

async function assertAccountManager(): Promise<
  { actor: NonNullable<Awaited<ReturnType<typeof getSessionProfileWithGrants>>> } | ActionState
> {
  const actor = await getSessionProfileWithGrants();
  if (!actor || !canManageAllAccounts(actor.role)) {
    return { error: "Nemáte oprávnění spravovat uživatele" };
  }
  return { actor };
}

function isActionError(
  result: { actor: NonNullable<Awaited<ReturnType<typeof getSessionProfileWithGrants>>> } | ActionState,
): result is ActionState {
  return "error" in result && !!result.error;
}

async function syncPermissionGrants(
  profileId: string,
  role: Role,
  grantsJson: string | undefined,
  legacyManagers?: { roomId: string; room: { hotelId: string } }[],
) {
  await prisma.roomManager.deleteMany({ where: { profileId } });
  await prisma.permissionGrant.deleteMany({ where: { profileId } });

  const normalized = normalizeRole(role);
  if (normalized === Role.IT) return;

  let grants = parseGrantsJson(grantsJson);
  if (grants.length === 0 && legacyManagers?.length) {
    grants = grantsFromLegacyManagers(legacyManagers);
  }

  const actor = await getSessionProfileWithGrants();
  const deduped = dedupeGrants(grants).map((g) => {
    if (!canGrantCreateHotels(actor?.role ?? Role.USER)) {
      return { ...g, canCreateHotels: false };
    }
    return g;
  });

  if (deduped.length === 0) return;

  const hotelIds = [...new Set(deduped.map((g) => g.hotelId))];
  const roomIds = [
    ...new Set(deduped.map((g) => g.roomId).filter((roomId): roomId is string => !!roomId)),
  ];

  const [existingHotels, existingRooms] = await Promise.all([
    prisma.hotel.findMany({
      where: { id: { in: hotelIds } },
      select: { id: true },
    }),
    roomIds.length > 0
      ? prisma.room.findMany({
          where: { id: { in: roomIds } },
          select: { id: true, hotelId: true },
        })
      : Promise.resolve([]),
  ]);

  const validHotelIds = new Set(existingHotels.map((hotel) => hotel.id));
  const roomHotelById = new Map(existingRooms.map((room) => [room.id, room.hotelId]));
  const sanitized = deduped.filter((grant) => {
    if (!validHotelIds.has(grant.hotelId)) return false;
    if (!grant.roomId) return true;
    return roomHotelById.get(grant.roomId) === grant.hotelId;
  });

  if (sanitized.length === 0) return;

  await prisma.permissionGrant.createMany({
    data: sanitized.map((g) => ({
      profileId,
      hotelId: g.hotelId,
      roomId: g.roomId,
      canCreateEvents: g.canCreateEvents,
      canUpdateEvents: g.canUpdateEvents,
      canDeleteEvents: g.canDeleteEvents,
      canCreateHotels: g.canCreateHotels,
      canUpdateHotels: g.canUpdateHotels,
      canDeleteHotels: g.canDeleteHotels,
      canManageUsers: g.canManageUsers,
    })),
  });
}

function validateRoleChange(
  actorRole: Role,
  targetRole: Role,
  actorId: string,
  targetId: string,
): ActionState | null {
  if (!canAssignRole(actorRole, targetRole)) {
    return { error: "Nemůžete přiřadit tuto roli" };
  }
  if (actorId === targetId && targetRole !== actorRole && actorRole === Role.ADMIN) {
    return { error: "Nemůžete si odebrat roli hlavního administrátora" };
  }
  return null;
}

export async function getUsersForIt(): Promise<ProfileWithAccess[]> {
  await requireItProfile();

  const users = await prisma.profile.findMany({
    include: {
      grants: { include: { hotel: true, room: true } },
      managers: { include: { room: { include: { hotel: true } } } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }, { email: "asc" }],
  });

  return users;
}

export async function createUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const check = await assertAccountManager();
  if (isActionError(check)) return check;
  const { actor } = check;

  const parsed = CreateUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    grantsJson: formData.get("grantsJson"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const role = normalizeRole(parsed.data.role as Role);
  const roleErr = validateRoleChange(actor!.role, role, actor!.id, "");
  if (roleErr) return roleErr;

  const email = parsed.data.email.trim().toLowerCase();
  const { name } = parsed.data;

  const existing = await prisma.profile.findUnique({ where: { email } });
  if (existing) {
    return { error: "Uživatel s tímto e-mailem již existuje" };
  }

  const activationCode = generateActivationCode();

  const created = await prisma.profile.create({
    data: {
      email,
      name,
      role,
      activationCode,
      activationExpiresAt: activationExpiry(),
    },
  });

  await syncPermissionGrants(created.id, role, parsed.data.grantsJson);

  await logAudit({
    actorId: actor!.id,
    actorEmail: actor!.email,
    actorName: actor!.name ?? null,
    action: "USER_CREATE",
    entityType: "user",
    entityId: created.id,
    entityLabel: `${name} (${email})`,
    after: { email, name, role },
  });

  revalidatePath("/it");
  revalidatePath("/uzivatele");
  return {
    success: true,
    message: "Účet vytvořen. Předejte uživateli aktivační kód.",
    activationCode,
    activationEmail: email,
  };
}

/** Vygeneruje nový aktivační kód (např. při zapomenutém hesle). */
export async function regenerateActivationCode(profileId: string): Promise<ActionState> {
  const check = await assertAccountManager();
  if (isActionError(check)) return check;
  const { actor } = check;

  const target = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!target) return { error: "Uživatel nenalezen" };

  const activationCode = generateActivationCode();
  await prisma.profile.update({
    where: { id: profileId },
    data: {
      activationCode,
      activationExpiresAt: activationExpiry(),
    },
  });

  await logAudit({
    actorId: actor!.id,
    actorEmail: actor!.email,
    actorName: actor!.name ?? null,
    action: "PASSWORD_RESET",
    entityType: "user",
    entityId: target.id,
    entityLabel: target.name ? `${target.name} (${target.email})` : target.email,
    metadata: { targetEmail: target.email },
  });

  return {
    success: true,
    message: "Nový aktivační kód byl vygenerován.",
    activationCode,
    activationEmail: target.email,
  };
}

export async function updateUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const check = await assertAccountManager();
  if (isActionError(check)) return check;
  const { actor } = check;

  const parsed = UpdateUserSchema.safeParse({
    profileId: formData.get("profileId"),
    name: formData.get("name"),
    role: formData.get("role"),
    grantsJson: formData.get("grantsJson"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { profileId, name } = parsed.data;
  const role = normalizeRole(parsed.data.role as Role);

  const target = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!target) return { error: "Uživatel nenalezen" };

  const roleErr = validateRoleChange(actor!.role, role, actor!.id, profileId);
  if (roleErr) return roleErr;

  await prisma.profile.update({
    where: { id: profileId },
    data: { name, role },
  });

  await syncPermissionGrants(profileId, role, parsed.data.grantsJson);

  await logAudit({
    actorId: actor!.id,
    actorEmail: actor!.email,
    actorName: actor!.name ?? null,
    action: "USER_UPDATE",
    entityType: "user",
    entityId: profileId,
    entityLabel: target.name ? `${target.name} (${target.email})` : target.email,
    before: { name: target.name, role: target.role, email: target.email },
    after: { name, role, email: target.email },
  });

  revalidatePath("/it");
  revalidatePath("/uzivatele");
  return { success: true };
}

export async function deleteUser(profileId: string): Promise<ActionState> {
  const check = await assertAccountManager();
  if (isActionError(check)) return check;
  const { actor } = check;

  if (profileId === actor!.id) {
    return { error: "Nemůžete smazat vlastní účet" };
  }

  const target = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!target) return { error: "Uživatel nenalezen" };

  await prisma.profile.delete({ where: { id: profileId } });

  await logAudit({
    actorId: actor!.id,
    actorEmail: actor!.email,
    actorName: actor!.name ?? null,
    action: "USER_DELETE",
    entityType: "user",
    entityId: profileId,
    entityLabel: target.name ? `${target.name} (${target.email})` : target.email,
    before: { name: target.name, role: target.role, email: target.email },
  });

  revalidatePath("/it");
  revalidatePath("/uzivatele");
  return { success: true };
}

/** Zachováno pro starou stránku /uzivatele — přesměruje na IT data. */
export async function getUsersForAdmin(): Promise<ProfileWithAccess[]> {
  const profile = await getSessionProfileWithGrants();
  if (!profile || !hasItAccess(profile.role)) {
    await requireItProfile();
  }
  return getUsersForIt();
}

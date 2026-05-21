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
import { buildAuthCallbackUrl } from "@/lib/auth-url";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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
  if (normalized === Role.ADMIN || normalized === Role.IT) return;

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

  await prisma.permissionGrant.createMany({
    data: deduped.map((g) => ({
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
  if (actorRole === Role.IT && targetRole === Role.ADMIN) {
    return { error: "Roli hlavního administrátora může přiřadit pouze hlavní administrátor" };
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

  const { email, name } = parsed.data;
  const admin = createAdminClient();
  const redirectTo = buildAuthCallbackUrl("/nastavit-heslo");

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { name, full_name: name },
  });

  if (error || !data.user) {
    const msg = error?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) {
      return { error: "Uživatel s tímto e-mailem již existuje" };
    }
    return { error: error?.message ?? "Nepodařilo se odeslat pozvánku" };
  }

  await prisma.profile.create({
    data: {
      id: data.user.id,
      email,
      name,
      role,
    },
  });

  await syncPermissionGrants(data.user.id, role, parsed.data.grantsJson);

  revalidatePath("/it");
  revalidatePath("/uzivatele");
  return { success: true, message: "Pozvánka byla odeslána na e-mail" };
}

export async function sendPasswordResetEmail(profileId: string): Promise<ActionState> {
  const check = await assertAccountManager();
  if (isActionError(check)) return check;
  const { actor } = check;

  const target = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!target) return { error: "Uživatel nenalezen" };

  if (actor!.role === Role.IT && target.role === Role.ADMIN) {
    return { error: "U tohoto účtu nelze odeslat reset hesla" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(target.email, {
    redirectTo: buildAuthCallbackUrl("/nastavit-heslo"),
  });

  if (error) {
    return { error: error.message ?? "Nepodařilo se odeslat e-mail" };
  }

  return { success: true, message: "E-mail pro nastavení hesla byl odeslán" };
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

  if (actor!.role === Role.IT && target.role === Role.ADMIN) {
    return { error: "Účet hlavního administrátora nemůže upravit IT role" };
  }

  await prisma.profile.update({
    where: { id: profileId },
    data: { name, role },
  });

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(profileId, {
    user_metadata: { name, full_name: name },
  });

  await syncPermissionGrants(profileId, role, parsed.data.grantsJson);

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

  if (actor!.role === Role.IT && target.role === Role.ADMIN) {
    return { error: "Účet hlavního administrátora nelze smazat" };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) {
    return { error: error.message ?? "Nepodařilo se smazat uživatele" };
  }

  await prisma.profile.delete({ where: { id: profileId } });

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

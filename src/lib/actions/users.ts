"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getSessionProfile, requireAdminProfile } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionState, ProfileWithManagers } from "@/types";

const CreateUserSchema = z.object({
  email: z.string().email("Neplatný e-mail"),
  name: z.string().min(1, "Jméno je povinné"),
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků"),
  role: z.enum(["ADMIN", "MANAGER", "VIEWER"]),
  roomIds: z.array(z.string()).optional(),
});

const UpdateUserSchema = z.object({
  profileId: z.string().min(1),
  name: z.string().min(1, "Jméno je povinné"),
  role: z.enum(["ADMIN", "MANAGER", "VIEWER"]),
  roomIds: z.array(z.string()).optional(),
});

async function assertAdmin(): Promise<ActionState | null> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== Role.ADMIN) {
    return { error: "Nemáte oprávnění spravovat uživatele" };
  }
  return null;
}

async function syncRoomAccess(profileId: string, role: Role, roomIds: string[]) {
  await prisma.roomManager.deleteMany({ where: { profileId } });

  if (role !== Role.MANAGER || roomIds.length === 0) return;

  await prisma.roomManager.createMany({
    data: roomIds.map((roomId) => ({ profileId, roomId })),
    skipDuplicates: true,
  });
}

export async function getUsersForAdmin(): Promise<ProfileWithManagers[]> {
  await requireAdminProfile();

  return prisma.profile.findMany({
    include: {
      managers: {
        include: { room: { include: { hotel: true } } },
      },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }, { email: "asc" }],
  });
}

export async function createUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await assertAdmin();
  if (denied) return denied;

  const roomIds = formData.getAll("roomIds").map(String);
  const parsed = CreateUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role"),
    roomIds,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { email, name, password, role } = parsed.data;
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, full_name: name },
  });

  if (error || !data.user) {
    const msg = error?.message?.toLowerCase() ?? "";
    if (msg.includes("already") || msg.includes("registered")) {
      return { error: "Uživatel s tímto e-mailem již existuje" };
    }
    return { error: error?.message ?? "Nepodařilo se vytvořit uživatele" };
  }

  await prisma.profile.create({
    data: {
      id: data.user.id,
      email,
      name,
      role: role as Role,
    },
  });

  await syncRoomAccess(data.user.id, role as Role, parsed.data.roomIds ?? []);

  revalidatePath("/uzivatele");
  return { success: true };
}

export async function updateUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await assertAdmin();
  if (denied) return denied;

  const roomIds = formData.getAll("roomIds").map(String);
  const parsed = UpdateUserSchema.safeParse({
    profileId: formData.get("profileId"),
    name: formData.get("name"),
    role: formData.get("role"),
    roomIds,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { profileId, name, role } = parsed.data;
  const currentAdmin = await requireAdminProfile();

  if (profileId === currentAdmin.id && role !== Role.ADMIN) {
    return { error: "Nemůžete si odebrat roli administrátora" };
  }

  await prisma.profile.update({
    where: { id: profileId },
    data: { name, role: role as Role },
  });

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(profileId, {
    user_metadata: { name, full_name: name },
  });

  await syncRoomAccess(profileId, role as Role, parsed.data.roomIds ?? []);

  revalidatePath("/uzivatele");
  return { success: true };
}

export async function deleteUser(profileId: string): Promise<ActionState> {
  const denied = await assertAdmin();
  if (denied) return denied;

  const currentAdmin = await requireAdminProfile();
  if (profileId === currentAdmin.id) {
    return { error: "Nemůžete smazat vlastní účet" };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) {
    return { error: error.message ?? "Nepodařilo se smazat uživatele" };
  }

  await prisma.profile.delete({ where: { id: profileId } });

  revalidatePath("/uzivatele");
  return { success: true };
}

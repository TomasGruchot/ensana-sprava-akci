"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";

import { Role } from "@/generated/prisma/enums";
import { buildUserCapabilities, type UserCapabilities } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getSessionProfileId } from "@/lib/session";
import { normalizeActivationCode } from "@/lib/activation";
import type { ActionState } from "@/types";

export type AppUser = {
  email: string;
  name: string;
  avatarUrl?: string;
  role: Role;
  capabilities: UserCapabilities;
};

export async function signIn(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email a heslo jsou povinné" };
  }

  const profile = await prisma.profile.findUnique({ where: { email } });

  if (!profile || !profile.passwordHash) {
    return { error: "Nesprávný email nebo heslo" };
  }

  const valid = await bcrypt.compare(password, profile.passwordHash);
  if (!valid) {
    return { error: "Nesprávný email nebo heslo" };
  }

  await createSession(profile.id);
  redirect("/");
}

export async function signOut() {
  await destroySession();
  redirect("/prihlasit");
}

/** Aktivace účtu pomocí e-mailu, aktivačního kódu a nového hesla. */
export async function activateAccount(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const code = normalizeActivationCode((formData.get("code") as string) ?? "");
  const password = (formData.get("password") as string) ?? "";
  const confirm = (formData.get("confirm") as string) ?? "";

  if (!email || !code) {
    return { error: "Vyplňte e-mail i aktivační kód" };
  }
  if (password.length < 8) {
    return { error: "Heslo musí mít alespoň 8 znaků" };
  }
  if (password !== confirm) {
    return { error: "Hesla se neshodují" };
  }

  const profile = await prisma.profile.findUnique({ where: { email } });
  if (!profile || !profile.activationCode) {
    return { error: "Neplatný e-mail nebo aktivační kód" };
  }
  if (normalizeActivationCode(profile.activationCode) !== code) {
    return { error: "Neplatný e-mail nebo aktivační kód" };
  }
  if (profile.activationExpiresAt && profile.activationExpiresAt.getTime() < Date.now()) {
    return { error: "Aktivační kód vypršel. Požádejte IT správu o nový." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      passwordHash,
      activationCode: null,
      activationExpiresAt: null,
      activatedAt: new Date(),
    },
  });

  await createSession(profile.id);
  redirect("/");
}

export async function getAppUser(): Promise<AppUser | null> {
  const profileId = await getSessionProfileId();
  if (!profileId) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: { grants: true },
  });
  if (!profile) return null;

  const name = profile.name?.trim() || formatNameFromEmail(profile.email);

  return {
    email: profile.email,
    name,
    avatarUrl: profile.avatarUrl ?? undefined,
    role: profile.role,
    capabilities: buildUserCapabilities(profile),
  };
}

function formatNameFromEmail(email: string) {
  const local = email.split("@")[0] ?? email;
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

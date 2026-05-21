"use server";

import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import { buildUserCapabilities, type UserCapabilities } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
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
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email a heslo jsou povinné" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Nesprávný email nebo heslo" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    await prisma.profile.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email,
        name: formatNameFromEmail(user.email),
        role: Role.USER,
      },
      update: {},
    });
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/prihlasit");
}

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getAppUser(): Promise<AppUser | null> {
  const user = await getSession();
  if (!user) return null;

  const email = user.email ?? "";
  const profile = email
    ? await prisma.profile.findUnique({
        where: { id: user.id },
        include: { grants: true },
      })
    : null;

  const meta = user.user_metadata ?? {};
  const metaName =
    typeof meta.full_name === "string"
      ? meta.full_name
      : typeof meta.name === "string"
        ? meta.name
        : null;
  const avatarUrl =
    typeof meta.avatar_url === "string" ? meta.avatar_url : undefined;

  const name = profile?.name?.trim() || metaName?.trim() || formatNameFromEmail(email);

  return {
    email: profile?.email ?? email,
    name,
    avatarUrl,
    role: profile?.role ?? Role.USER,
    capabilities: buildUserCapabilities(
      profile ?? { role: Role.USER, grants: [] },
    ),
  };
}

function formatNameFromEmail(email: string) {
  const local = email.split("@")[0] ?? email;
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

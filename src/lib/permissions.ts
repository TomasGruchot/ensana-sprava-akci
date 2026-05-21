import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrátor",
  MANAGER: "Správce místností",
  VIEWER: "Pouze čtení",
};

export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return prisma.profile.findUnique({ where: { id: user.id } });
}

export async function requireAdminProfile(): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile || profile.role !== Role.ADMIN) {
    redirect("/");
  }
  return profile;
}

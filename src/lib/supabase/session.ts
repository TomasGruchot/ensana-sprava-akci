import "server-only";

import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { ProfileWithGrants } from "@/lib/permissions";

function formatNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export async function ensureProfileForUser(user: {
  id: string;
  email: string;
}): Promise<ProfileWithGrants> {
  return prisma.profile.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email,
      name: formatNameFromEmail(user.email),
      role: Role.USER,
    },
    update: { email: user.email },
    include: { grants: true },
  });
}

/** Zajistí řádek Profile pro přihlášeného Supabase uživatele (např. po prvním loginu na produkci). */
export async function ensureSessionProfileWithGrants(): Promise<ProfileWithGrants | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  return ensureProfileForUser({ id: user.id, email: user.email });
}

"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/types";

const BUCKET = "avatars";
const MAX_BYTES = 5 * 1024 * 1024;

async function requireSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nejste přihlášeni");
  return user;
}

async function ensureAvatarsBucket() {
  const admin = createAdminClient();
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: true });
  }
}

export async function uploadProfileAvatar(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  try {
    const user = await requireSessionUser();
    const file = formData.get("image") as File | null;
    if (!file || file.size === 0) return { error: "Vyberte obrázek" };
    if (!file.type.startsWith("image/")) return { error: "Soubor musí být obrázek" };
    if (file.size > MAX_BYTES) return { error: "Obrázek je příliš velký (max. 5 MB)" };

    try {
      await ensureAvatarsBucket();
    } catch {
      /* bucket mohl být již vytvořen */
    }

    const admin = createAdminClient();
    const path = `${user.id}/avatar.webp`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, {
      contentType: "image/webp",
      upsert: true,
    });
    if (uploadError) return { error: uploadError.message };

    const {
      data: { publicUrl },
    } = admin.storage.from(BUCKET).getPublicUrl(path);

    const avatarUrl = `${publicUrl}?v=${Date.now()}`;

    await prisma.profile.update({
      where: { id: user.id },
      data: { avatarUrl },
    });

    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { avatar_url: avatarUrl },
    });

    revalidatePath("/", "layout");
    return { url: avatarUrl };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Nahrávání selhalo";
    return { error: message };
  }
}

export async function removeProfileAvatar(): Promise<ActionState> {
  try {
    const user = await requireSessionUser();

    const admin = createAdminClient();
    await admin.storage.from(BUCKET).remove([`${user.id}/avatar.webp`]);

    await prisma.profile.update({
      where: { id: user.id },
      data: { avatarUrl: null },
    });

    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { avatar_url: null },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Odstranění selhalo";
    return { error: message };
  }
}

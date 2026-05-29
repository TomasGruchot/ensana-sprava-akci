"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireSessionProfile } from "@/lib/permissions-server";
import { deleteFile, saveFile } from "@/lib/storage";
import type { ActionState } from "@/types";

const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadProfileAvatar(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  try {
    const user = await requireSessionProfile();
    const file = formData.get("image") as File | null;
    if (!file || file.size === 0) return { error: "Vyberte obrázek" };
    if (!file.type.startsWith("image/")) return { error: "Soubor musí být obrázek" };
    if (file.size > MAX_BYTES) return { error: "Obrázek je příliš velký (max. 5 MB)" };

    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveFile("avatars", buffer, "avatar.webp", user.id);
    const avatarUrl = `${saved.url}?v=${Date.now()}`;

    await prisma.profile.update({
      where: { id: user.id },
      data: { avatarUrl },
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
    const user = await requireSessionProfile();

    await deleteFile(`avatars/${user.id}/avatar.webp`);

    await prisma.profile.update({
      where: { id: user.id },
      data: { avatarUrl: null },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Odstranění selhalo";
    return { error: message };
  }
}

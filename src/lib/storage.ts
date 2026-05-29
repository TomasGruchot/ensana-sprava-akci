import "server-only";

import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";

/** Povolené podsložky úložiště (odpovídají původním Supabase bucketům). */
export type StorageBucket = "avatars" | "event-attachments" | "hotel-images";

/** Kořenová složka pro nahrané soubory. Mimo repozitář, konfigurovatelná přes env. */
function getUploadsRoot(): string {
  const configured = process.env.UPLOADS_DIR;
  if (configured && configured.trim()) {
    return path.resolve(configured.trim());
  }
  return path.join(process.cwd(), "uploads");
}

/** Veřejná URL, přes kterou se soubor servíruje (route handler /api/files). */
function toPublicUrl(relativePath: string): string {
  const normalized = relativePath.split(path.sep).join("/");
  return `/api/files/${normalized}`;
}

function sanitizeSegment(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\x00-\x7F]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "soubor"
  );
}

export type SavedFile = {
  /** Relativní cesta v rámci úložiště, např. "avatars/abc/avatar.webp". */
  path: string;
  /** Veřejná URL pro <img src> / odkazy. */
  url: string;
};

/**
 * Uloží soubor do dané podsložky úložiště.
 * @param bucket podsložka
 * @param buffer obsah souboru
 * @param fileName cílový název (bude sanitizován); pokud neuveden, vygeneruje se náhodný
 * @param subPath volitelná podcesta uvnitř bucketu (např. userId)
 */
export async function saveFile(
  bucket: StorageBucket,
  buffer: Buffer,
  fileName?: string,
  subPath?: string,
): Promise<SavedFile> {
  const safeName = sanitizeSegment(
    fileName || `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`,
  );
  const safeSub = subPath ? sanitizeSegment(subPath) : "";

  const relativeDir = safeSub ? path.join(bucket, safeSub) : bucket;
  const relativePath = path.join(relativeDir, safeName);
  const absoluteDir = path.join(getUploadsRoot(), relativeDir);
  const absolutePath = path.join(getUploadsRoot(), relativePath);

  await fs.mkdir(absoluteDir, { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  return { path: relativePath.split(path.sep).join("/"), url: toPublicUrl(relativePath) };
}

/** Smaže soubor podle relativní cesty (z `SavedFile.path`). Tiše ignoruje neexistující. */
export async function deleteFile(relativePath: string): Promise<void> {
  if (!relativePath) return;
  const safe = safeResolve(relativePath);
  if (!safe) return;
  try {
    await fs.unlink(safe);
  } catch {
    /* soubor nemusí existovat */
  }
}

/**
 * Bezpečně přeloží relativní cestu na absolutní uvnitř úložiště.
 * Vrací null při pokusu o únik z úložiště (path traversal).
 */
export function safeResolve(relativePath: string): string | null {
  const root = getUploadsRoot();
  const target = path.resolve(root, relativePath);
  const rel = path.relative(root, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return null;
  }
  return target;
}

/** Načte soubor pro servírování. Vrací null, pokud neexistuje nebo je cesta neplatná. */
export async function readFile(
  relativePath: string,
): Promise<Buffer | null> {
  const safe = safeResolve(relativePath);
  if (!safe) return null;
  try {
    return await fs.readFile(safe);
  } catch {
    return null;
  }
}

import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "ensana_session";
const SESSION_TTL_DAYS = 30;

function ttlDate(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/** Vytvoří DB relaci a uloží token do httpOnly cookie. */
export async function createSession(profileId: string): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = ttlDate();

  await prisma.session.create({
    data: { token, profileId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

/** Smaže aktuální relaci z DB i cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  cookieStore.delete(COOKIE_NAME);
}

/** Vrátí profileId z platné relace, nebo null. Mažeme prošlé relace. */
export async function getSessionProfileId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({ where: { token } });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.deleteMany({ where: { token } });
    return null;
  }

  return session.profileId;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

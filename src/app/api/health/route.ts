import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checks: Record<string, boolean | string> = {
    databaseUrl: Boolean(process.env.DATABASE_URL),
    supabasePublic: isSupabaseConfigured(),
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, checks, error: "Chybí DATABASE_URL" },
      { status: 503 },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    const [profileAvatar, eventDateEnd] = await Promise.all([
      prisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Profile'
          AND column_name = 'avatarUrl'
      `,
      prisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Event'
          AND column_name = 'dateEnd'
      `,
    ]);

    checks.profileAvatarUrl = profileAvatar.length > 0;
    checks.eventDateEnd = eventDateEnd.length > 0;

    const schemaOk = checks.profileAvatarUrl && checks.eventDateEnd;

    return NextResponse.json({
      ok: schemaOk,
      checks,
      hint: schemaOk
        ? undefined
        : "Spusťte npm run db:push proti produkční DATABASE_URL",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Neznámá chyba";
    return NextResponse.json({ ok: false, checks, error: message }, { status: 500 });
  }
}

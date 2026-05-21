import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL není nastaven na serveru" },
      { status: 503 },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    const eventColumns = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Event'
        AND column_name = 'dateEnd'
    `;

    return NextResponse.json({
      ok: true,
      dateEndColumn: eventColumns.length > 0,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Neznámá chyba";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import "server-only";

/**
 * Supabase na Vercelu vyžaduje pooler (port 6543 + pgbouncer=true).
 * Port 5432 / db.*.supabase.co funguje lokálně, z serverless často ne.
 */
export function getDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error("DATABASE_URL není nastaven");
  }

  let url = raw;

  if (url.includes("pooler.supabase.com:6543") && !url.includes("pgbouncer=")) {
    url += url.includes("?") ? "&pgbouncer=true" : "?pgbouncer=true";
  }

  return url;
}

export function getDatabaseUrlDiagnostics(): {
  ok: boolean;
  hint?: string;
  usesPooler: boolean;
  usesDirectPort: boolean;
} {
  const raw = process.env.DATABASE_URL?.trim() ?? "";
  if (!raw) {
    return { ok: false, hint: "Chybí DATABASE_URL", usesPooler: false, usesDirectPort: false };
  }

  const usesPooler = raw.includes("pooler.supabase.com") && raw.includes(":6543");
  const usesDirectPort =
    raw.includes(":5432") ||
    (raw.includes(".supabase.co") && !raw.includes("pooler.supabase.com"));

  if (process.env.VERCEL && usesDirectPort && !usesPooler) {
    return {
      ok: false,
      usesPooler,
      usesDirectPort,
      hint:
        "Na Vercelu nastavte DATABASE_URL na Connection pooling (Transaction, port 6543, ?pgbouncer=true), ne na Direct connection :5432.",
    };
  }

  return { ok: true, usesPooler, usesDirectPort };
}

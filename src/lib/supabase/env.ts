function getPublicApiKey() {
  // Preferuj publishable key (nový formát Supabase), fallback na anon JWT
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && getPublicApiKey(),
  );
}

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = getPublicApiKey();

  if (!url || !apiKey) {
    throw new Error(
      "Chybí NEXT_PUBLIC_SUPABASE_URL a klíč (NEXT_PUBLIC_SUPABASE_ANON_KEY nebo NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
    );
  }

  return { url, apiKey };
}

export function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Chybí SUPABASE_SERVICE_ROLE_KEY (pouze server, nikdy NEXT_PUBLIC_).",
    );
  }
  return key;
}

import { createClient } from "@supabase/supabase-js";

import { getServiceRoleKey, getSupabaseEnv } from "./env";

/** Admin klient — obchází RLS. Používej jen v server actions / API routes. */
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  return createClient(url, getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

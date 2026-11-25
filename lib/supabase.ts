import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type GlobalWithSupabase = typeof globalThis & {
  marketplaceSupabase?: SupabaseClient;
};

const globalSupabase = globalThis as GlobalWithSupabase;

export function getSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Marketplace database is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in the server environment.",
    );
  }
  if (globalSupabase.marketplaceSupabase) return globalSupabase.marketplaceSupabase;

  const client = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  globalSupabase.marketplaceSupabase = client;
  return client;
}

export function assertSupabaseResult<T>(
  result: { data: T; error: { message: string } | null },
): T {
  if (result.error) {
    throw new Error(`Supabase request failed: ${result.error.message}`);
  }
  return result.data;
}

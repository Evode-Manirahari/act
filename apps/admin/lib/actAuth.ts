/**
 * Server-side Supabase service login for the admin app (pilot auth Phase 4).
 *
 * The admin acts as ONE provisioned act-api user (an ACT admin creates the
 * Supabase login and the matching `users` row, e.g. role lead_tech): with
 * SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY + ADMIN_SUPABASE_EMAIL +
 * ADMIN_SUPABASE_PASSWORD set, every act-api call carries that user's access
 * token, and act-api attributes reviews/answers/publishes to it. Any of the
 * four unset (today's state): headers are `{}` and the admin talks to act-api
 * anonymously, exactly as before.
 *
 * Session handling is deliberately minimal for a server runtime: no cookie
 * storage, no refresh-token dance — the access token is cached in module
 * scope and we re-run the password sign-in shortly before it expires. A
 * failed sign-in throws rather than silently falling back to anonymous:
 * against an AUTH_REQUIRED backend anonymous would just be a wall of 401s,
 * and the thrown error names the actual problem.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? '';
const ADMIN_SUPABASE_EMAIL = process.env.ADMIN_SUPABASE_EMAIL ?? '';
const ADMIN_SUPABASE_PASSWORD = process.env.ADMIN_SUPABASE_PASSWORD ?? '';

export const isActAuthConfigured = Boolean(
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY && ADMIN_SUPABASE_EMAIL && ADMIN_SUPABASE_PASSWORD,
);

// Re-sign-in this long before the token's expiry so a request never goes out
// with a token that dies mid-flight.
const EXPIRY_MARGIN_MS = 60_000;

let client: SupabaseClient | null = null;
let cached: { token: string; expiresAtMs: number } | null = null;

function getClient(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

export async function getActAuthHeaders(): Promise<Record<string, string>> {
  if (!isActAuthConfigured) return {};

  if (cached && cached.expiresAtMs - EXPIRY_MARGIN_MS > Date.now()) {
    return { Authorization: `Bearer ${cached.token}` };
  }

  const { data, error } = await getClient().auth.signInWithPassword({
    email: ADMIN_SUPABASE_EMAIL,
    password: ADMIN_SUPABASE_PASSWORD,
  });
  if (error || !data.session) {
    cached = null;
    throw new Error(`admin Supabase sign-in failed: ${error?.message ?? 'no session returned'}`);
  }
  cached = {
    token: data.session.access_token,
    expiresAtMs: (data.session.expires_at ?? 0) * 1000,
  };
  return { Authorization: `Bearer ${cached.token}` };
}

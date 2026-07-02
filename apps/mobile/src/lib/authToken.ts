/**
 * Bearer-token plumbing for the API clients (pilot auth Phase 4).
 *
 * While the login gate is inactive (no Supabase project configured) both
 * helpers resolve to "anonymous" and every request looks exactly like it did
 * before — the demo-session flow stays untouched. Once a session exists, its
 * access token rides along on every API call; supabase-js refreshes the token
 * in the background and getSession() hands back the current one.
 *
 * `./supabase` is imported lazily and only when the gate is configured: it
 * pulls in the URL polyfill / AsyncStorage / AppState at module scope, which
 * plain-node jest (and any unconfigured build) should never have to load.
 */
import { computeSupabaseConfig } from './supabaseConfig';

const isConfigured =
  computeSupabaseConfig(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ) === 'configured';

async function currentAccessToken(): Promise<string | null> {
  if (!isConfigured) return null;
  try {
    const { supabase } = await import('./supabase');
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    // Fail open to anonymous — the backend decides whether anonymous is
    // acceptable (AUTH_REQUIRED). A broken storage read must not brick calls.
    return null;
  }
}

export async function hasAuthSession(): Promise<boolean> {
  return (await currentAccessToken()) !== null;
}

/** Headers to merge into an API request: `{ Authorization: Bearer … }` with a
 * live session, `{}` otherwise. */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await currentAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Pure config predicate for the Supabase auth gate, extracted so it's unit
 * testable (lib/supabase.ts builds the client at module scope, which jest
 * can't exercise per-case without resetModules gymnastics).
 *
 * 'misconfigured' covers the states that must fail closed rather than fall
 * back to the ungated demo flow: exactly one of the two env vars set (a typo
 * or a forgotten EAS profile entry), or a URL that isn't parseable (e.g. the
 * .env.example placeholder `https://<project>.supabase.co`, which would
 * otherwise crash createClient at import).
 */
export type SupabaseConfigStatus = 'configured' | 'unconfigured' | 'misconfigured';

export function computeSupabaseConfig(
  url: string | undefined,
  publishableKey: string | undefined,
): SupabaseConfigStatus {
  const trimmedUrl = url?.trim() ?? '';
  const trimmedKey = publishableKey?.trim() ?? '';

  if (!trimmedUrl && !trimmedKey) return 'unconfigured';
  if (!trimmedUrl || !trimmedKey) return 'misconfigured';

  try {
    // eslint-disable-next-line no-new
    new URL(trimmedUrl);
  } catch {
    return 'misconfigured';
  }
  return 'configured';
}

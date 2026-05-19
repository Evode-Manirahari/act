/**
 * Runtime config. The API base URL is read in this order:
 *   1. EXPO_PUBLIC_API_BASE_URL (set in eas.json or .env)
 *   2. expo-constants extra.apiBaseUrl (set in app.json)
 *   3. The deployed Fly endpoint as a final fallback.
 *
 * Centralizing this here is the prerequisite for the PR 1 build plan's
 * "Move to Expo env vars before pilots" cleanup — every fetch call should
 * import API_BASE from this module rather than hardcoding the host.
 */

const PROD_FALLBACK = 'https://act-api-evode.fly.dev';

function readPublicEnv(): string | undefined {
  // EXPO_PUBLIC_* env vars are inlined at bundle time and exposed on
  // process.env in JS. Accessing process.env is safe in React Native; the
  // Metro bundler statically replaces these references.
  const fromEnv = (process.env as Record<string, string | undefined>)
    .EXPO_PUBLIC_API_BASE_URL;
  return typeof fromEnv === 'string' && fromEnv.length > 0 ? fromEnv : undefined;
}

export const API_BASE: string = readPublicEnv() ?? PROD_FALLBACK;

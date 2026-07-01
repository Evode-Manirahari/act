import type { SupabaseConfigStatus } from '../lib/supabaseConfig';

export type AuthGateState = 'stack' | 'loading' | 'login' | 'config-error';

export interface AuthGateInputs {
  configStatus: SupabaseConfigStatus;
  /** EXPO_PUBLIC_REQUIRE_AUTH: pilot/production builds set this so a build
   * accidentally cut without Supabase env vars fails closed instead of
   * silently shipping ungated. */
  requireAuth: boolean;
  loading: boolean;
  hasSession: boolean;
}

/**
 * The pilot auth gate, as a pure function so every branch is testable
 * (same pattern as screens/learnScreenModel.ts).
 *
 * - misconfigured (partial env vars / unparseable URL) always fails closed
 * - unconfigured fails open to the demo flow only when the build doesn't
 *   demand auth; with requireAuth it fails closed
 */
export function resolveAuthGate(inputs: AuthGateInputs): AuthGateState {
  if (inputs.configStatus === 'misconfigured') return 'config-error';
  if (inputs.configStatus === 'unconfigured') {
    return inputs.requireAuth ? 'config-error' : 'stack';
  }
  if (inputs.loading) return 'loading';
  return inputs.hasSession ? 'stack' : 'login';
}

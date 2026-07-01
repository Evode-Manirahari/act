import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '../lib/supabase';

export interface AuthSessionState {
  /** Null until the initial session check resolves, or forever if Supabase isn't configured. */
  session: Session | null;
  /** True only during the initial session check after the hook mounts. */
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
}

/**
 * Tracks the Supabase auth session for the pilot login gate.
 *
 * When Supabase isn't configured (no project set up yet — see
 * lib/supabase.ts), this resolves immediately with session=null and
 * loading=false so PilotNavigator can fall back to the demo-session flow
 * without waiting on anything.
 */
export function useAuthSession(): AuthSessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let cancelled = false;
    // Set when any auth event lands before getSession() resolves — its fresher
    // session must not be clobbered by the older getSession() snapshot.
    let sawAuthEvent = false;

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled && !sawAuthEvent) setSession(data.session);
      })
      .catch(() => {
        // Lock timeout / corrupted storage: fail to LoginScreen, not a spinner.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      sawAuthEvent = true;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Auth is not configured for this build yet.' };
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    } catch (e) {
      // auth-js rethrows non-AuthErrors (e.g. storage failures in _saveSession);
      // surface them as a form error instead of stranding the submit button.
      return { error: e instanceof Error ? e.message : 'Sign in failed. Check your connection and try again.' };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return { error: null };
    try {
      // On network/server errors auth-js returns { error } without clearing
      // the local session — the caller needs to know the user is still signed in.
      const { error } = await supabase.auth.signOut();
      return { error: error?.message ?? null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Sign out failed.' };
    }
  }, []);

  return { session, loading, signInWithPassword, signOut };
}

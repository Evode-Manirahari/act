import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '../lib/supabase';

export interface AuthSessionState {
  /** Null until the initial session check resolves, or forever if Supabase isn't configured. */
  session: Session | null;
  /** True only during the one-time initial session check on app boot. */
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
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
    void supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Auth is not configured for this build yet.' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.auth.signOut();
  }, []);

  return { session, loading, signInWithPassword, signOut };
}

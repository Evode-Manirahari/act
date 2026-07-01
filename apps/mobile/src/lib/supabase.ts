/**
 * Supabase client for ACT Capture's invite-only pilot auth.
 *
 * `isSupabaseConfigured` gates the whole auth flow: until a real Supabase
 * project's URL/key are set (see .env.example), this stays false and
 * PilotNavigator falls back to the existing demo-session flow untouched —
 * so wiring this in can't break local dev or the current pilot before a
 * real project exists. Once the env vars are set, the login gate activates
 * automatically with no further code changes.
 *
 * Session persistence uses AsyncStorage on native (there's no localStorage);
 * `detectSessionInUrl: false` is deliberate — the pilot login is email +
 * password, not a magic-link/OAuth redirect, so there's no URL to parse a
 * session out of. `lock: processLock` serializes concurrent refresh calls so
 * two screens racing to refresh the same token don't corrupt the stored
 * session (recommended by Supabase for React Native).
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL as string, SUPABASE_PUBLISHABLE_KEY as string, {
      auth: {
        ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    })
  : null;

if (Platform.OS !== 'web' && supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}

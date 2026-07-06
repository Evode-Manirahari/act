/**
 * Encrypted session storage for the Supabase client (pilot auth hardening).
 *
 * Raw AsyncStorage is world-readable on a rooted/jailbroken device; the
 * session JSON holds live access + refresh tokens. This adapter keeps the
 * AES-256 key in the OS keychain (expo-secure-store) and only the ciphertext
 * in AsyncStorage — SecureStore itself caps values at ~2KB, so the session
 * JSON can't live there directly (Supabase's documented "LargeSecureStore"
 * pattern).
 *
 * Failure posture: any decrypt/keychain error resolves to null — the tech
 * re-signs in. A storage error must never brick the app (same rule as
 * lib/authToken.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// SecureStore keys must match [A-Za-z0-9._-]; Supabase storage keys
// ("sb-<ref>-auth-token") already do.
const KEY_PREFIX = 'act-session-key.';

function keychainKeyFor(storageKey: string): string {
  return KEY_PREFIX + storageKey.replace(/[^A-Za-z0-9._-]/g, '_');
}

async function encrypt(plaintext: string): Promise<{ keyHex: string; cipherHex: string }> {
  const key = Crypto.getRandomValues(new Uint8Array(32));
  // CTR with a fresh random key per write; counter can start at 1.
  const cipher = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(1));
  const cipherBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(plaintext));
  return {
    keyHex: aesjs.utils.hex.fromBytes(key),
    cipherHex: aesjs.utils.hex.fromBytes(cipherBytes),
  };
}

function decrypt(keyHex: string, cipherHex: string): string {
  const cipher = new aesjs.ModeOfOperation.ctr(
    aesjs.utils.hex.toBytes(keyHex),
    new aesjs.Counter(1),
  );
  return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(cipherHex)));
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const [cipherHex, keyHex] = await Promise.all([
        AsyncStorage.getItem(key),
        SecureStore.getItemAsync(keychainKeyFor(key)),
      ]);
      if (!cipherHex || !keyHex) return null;
      return decrypt(keyHex, cipherHex);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      const { keyHex, cipherHex } = await encrypt(value);
      // Key first: a crash between the writes must not leave ciphertext
      // pointing at a stale key (getItem would return garbage instead of null).
      await SecureStore.setItemAsync(keychainKeyFor(key), keyHex);
      await AsyncStorage.setItem(key, cipherHex);
    } catch {
      // Swallow: persistence is best-effort; the in-memory session still works
      // and the tech re-signs in on next launch.
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(key),
        SecureStore.deleteItemAsync(keychainKeyFor(key)),
      ]);
    } catch {
      // Best-effort — nothing actionable on a failed delete.
    }
  },
};

/** Encrypted session storage (pilot auth hardening).
 *
 * expo modules are mocked (native); aes-js is pure JS and runs for real, so
 * the round-trip test exercises the actual encryption path.
 */

const asyncStore = new Map<string, string>();
const keychain = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => asyncStore.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => void asyncStore.set(k, v)),
    removeItem: jest.fn(async (k: string) => void asyncStore.delete(k)),
  },
}), { virtual: true });

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => keychain.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void keychain.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void keychain.delete(k)),
}), { virtual: true });

jest.mock('expo-crypto', () => ({
  getRandomValues: (arr: Uint8Array) => {
    // Deterministic bytes are fine for tests; production uses the OS CSPRNG.
    for (let i = 0; i < arr.length; i += 1) arr[i] = (i * 7 + 13) % 256;
    return arr;
  },
}), { virtual: true });

import { secureSessionStorage } from '../secureSessionStorage';

const KEY = 'sb-testref-auth-token';
const SESSION = JSON.stringify({ access_token: 'tok', refresh_token: 'ref', user: { id: 'u1' } });

afterEach(() => {
  asyncStore.clear();
  keychain.clear();
});

describe('secureSessionStorage', () => {
  it('round-trips a session and never stores the plaintext', async () => {
    await secureSessionStorage.setItem(KEY, SESSION);

    expect(await secureSessionStorage.getItem(KEY)).toBe(SESSION);
    // AsyncStorage holds only ciphertext; the AES key lives in the keychain.
    expect(asyncStore.get(KEY)).toBeDefined();
    expect(asyncStore.get(KEY)).not.toContain('tok');
    expect(keychain.size).toBe(1);
  });

  it('returns null when nothing is stored', async () => {
    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
  });

  it('returns null when the keychain entry is missing (cannot decrypt)', async () => {
    await secureSessionStorage.setItem(KEY, SESSION);
    keychain.clear();
    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
  });

  it('removeItem clears both stores', async () => {
    await secureSessionStorage.setItem(KEY, SESSION);
    await secureSessionStorage.removeItem(KEY);
    expect(asyncStore.size).toBe(0);
    expect(keychain.size).toBe(0);
  });
});

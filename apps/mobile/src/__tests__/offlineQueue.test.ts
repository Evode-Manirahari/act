import {
  enqueueMessage,
  loadQueue,
  clearQueue,
  removeFromQueue,
  backupSessionMessages,
  loadSessionBackup,
} from '../utils/offlineQueue';

// ── Mock AsyncStorage ──────────────────────────────────────────────────────────
const store: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => store[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => { store[key] = value; }),
  removeItem: jest.fn(async (key: string) => { delete store[key]; }),
}));

beforeEach(() => {
  // Clear in-memory store between tests
  for (const key of Object.keys(store)) delete store[key];
  jest.clearAllMocks();
});

// ── Queue operations ────────────────────────────────────────────────────────────

describe('loadQueue', () => {
  it('returns empty array when nothing stored', async () => {
    const q = await loadQueue();
    expect(q).toEqual([]);
  });

  it('returns empty array on corrupt data', async () => {
    store['actober:offline:queue'] = 'NOT_JSON{{{';
    const q = await loadQueue();
    expect(q).toEqual([]);
  });
});

describe('enqueueMessage', () => {
  it('adds a message to an empty queue', async () => {
    await enqueueMessage('sess1', 'how do I wire a GFCI?');
    const q = await loadQueue();
    expect(q).toHaveLength(1);
    expect(q[0].sessionId).toBe('sess1');
    expect(q[0].message).toBe('how do I wire a GFCI?');
    expect(q[0].id).toMatch(/^q_/);
    expect(typeof q[0].timestamp).toBe('number');
  });

  it('appends to existing queue without overwriting', async () => {
    await enqueueMessage('sess1', 'first message');
    await enqueueMessage('sess1', 'second message');
    const q = await loadQueue();
    expect(q).toHaveLength(2);
    expect(q[0].message).toBe('first message');
    expect(q[1].message).toBe('second message');
  });

  it('generates unique IDs for each entry', async () => {
    await enqueueMessage('s', 'msg A');
    await enqueueMessage('s', 'msg B');
    const q = await loadQueue();
    expect(q[0].id).not.toBe(q[1].id);
  });
});

describe('removeFromQueue', () => {
  it('removes the matching entry and leaves others', async () => {
    await enqueueMessage('sess1', 'keep this');
    await enqueueMessage('sess1', 'remove this');
    const q = await loadQueue();
    const toRemove = q.find((e) => e.message === 'remove this')!;

    await removeFromQueue(toRemove.id);

    const after = await loadQueue();
    expect(after).toHaveLength(1);
    expect(after[0].message).toBe('keep this');
  });

  it('is a no-op when ID does not exist', async () => {
    await enqueueMessage('sess1', 'stay');
    await removeFromQueue('nonexistent_id');
    const q = await loadQueue();
    expect(q).toHaveLength(1);
  });
});

describe('clearQueue', () => {
  it('empties the queue', async () => {
    await enqueueMessage('s', 'a');
    await enqueueMessage('s', 'b');
    await clearQueue();
    const q = await loadQueue();
    expect(q).toEqual([]);
  });

  it('is safe to call on an already empty queue', async () => {
    await expect(clearQueue()).resolves.not.toThrow();
  });
});

// ── Session backup ──────────────────────────────────────────────────────────────

describe('backupSessionMessages', () => {
  const sample = [
    { id: 'm1', role: 'USER', content: 'hello', isSafetyAlert: false, createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'm2', role: 'ASSISTANT', content: 'hi there', isSafetyAlert: false, createdAt: '2026-01-01T00:00:01.000Z' },
  ];

  it('stores and retrieves session messages', async () => {
    await backupSessionMessages('sess_abc', sample);
    const restored = await loadSessionBackup('sess_abc');
    expect(restored).toEqual(sample);
  });

  it('overwrites previous backup for the same session', async () => {
    await backupSessionMessages('sess_abc', sample);
    const updated = [...sample, { id: 'm3', role: 'USER', content: 'new msg', isSafetyAlert: false, createdAt: '2026-01-01T00:00:02.000Z' }];
    await backupSessionMessages('sess_abc', updated);
    const restored = await loadSessionBackup('sess_abc');
    expect(restored).toHaveLength(3);
  });

  it('keeps separate backups per session ID', async () => {
    await backupSessionMessages('sess_A', [sample[0]]);
    await backupSessionMessages('sess_B', [sample[1]]);
    const a = await loadSessionBackup('sess_A');
    const b = await loadSessionBackup('sess_B');
    expect(a[0].id).toBe('m1');
    expect(b[0].id).toBe('m2');
  });
});

describe('loadSessionBackup', () => {
  it('returns empty array when no backup exists', async () => {
    const result = await loadSessionBackup('no_such_session');
    expect(result).toEqual([]);
  });

  it('returns empty array on corrupt backup data', async () => {
    store['actober:session:bad_sess:messages'] = 'CORRUPT';
    const result = await loadSessionBackup('bad_sess');
    expect(result).toEqual([]);
  });
});

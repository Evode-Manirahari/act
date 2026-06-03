/**
 * Tests for the offline upload queue. The big property this exercises is
 * the PR 2 acceptance gate: record + mark, kill the app (simulated by
 * constructing a fresh queue against the same storage), reopen, drain.
 */

// The default queue instance imports from `expo-file-system/legacy`, which is
// shipped as untransformed TS. We never call its real handlers (tests inject
// mocks via the constructor), so mocking the module to empty is enough.
jest.mock('expo-file-system/legacy', () => ({}), { virtual: true });
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}), { virtual: true });

import { OfflineUploadQueue, QueueItem, QueueStorage } from '../offlineUploadQueue';


class MemoryStorage implements QueueStorage {
  store = new Map<string, string>();
  async getItem(key: string) {
    return this.store.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}


function makeHandlers(overrides: Partial<{
  postMark: jest.Mock;
  uploadRecordingFile: jest.Mock;
  completeRecording: jest.Mock;
  startProcessing: jest.Mock;
}> = {}) {
  return {
    postMark: overrides.postMark ?? jest.fn().mockResolvedValue({ id: 'm-1' }),
    uploadRecordingFile: overrides.uploadRecordingFile ?? jest.fn().mockResolvedValue(123456),
    completeRecording: overrides.completeRecording ?? jest.fn().mockResolvedValue({ id: 'r-1' }),
    startProcessing: overrides.startProcessing ?? jest.fn().mockResolvedValue({ recording_id: 'r-1', status: 'queued' }),
  };
}


describe('OfflineUploadQueue', () => {
  it('enqueues and flushes a mark', async () => {
    const storage = new MemoryStorage();
    const handlers = makeHandlers();
    const q = new OfflineUploadQueue({ storage, handlers });

    await q.enqueueMark({
      recordingId: 'r-1',
      timestampSeconds: 12.5,
      markType: 'safety',
    });

    expect((await q.items())).toHaveLength(1);

    const result = await q.flush();
    expect(result.succeeded).toBe(1);
    expect(result.remaining).toBe(0);
    expect(handlers.postMark).toHaveBeenCalledWith(
      expect.objectContaining({
        recordingId: 'r-1',
        timestampSeconds: 12.5,
        markType: 'safety',
      }),
    );
    expect(await q.items()).toHaveLength(0);
  });

  it('preserves marks across a simulated app kill and replays them', async () => {
    const storage = new MemoryStorage();

    // Session 1: tech records and marks, but goes offline so flushes fail.
    const failingHandlers = makeHandlers({
      postMark: jest.fn().mockRejectedValue(new Error('Network error')),
    });
    const q1 = new OfflineUploadQueue({ storage, handlers: failingHandlers, maxAttempts: 5 });
    await q1.enqueueMark({ recordingId: 'r-1', timestampSeconds: 12.4 });
    await q1.enqueueMark({ recordingId: 'r-1', timestampSeconds: 47.0 });
    await q1.enqueueMark({ recordingId: 'r-1', timestampSeconds: 121.8 });

    const failed = await q1.flush();
    expect(failed.failed).toBe(3);
    expect(failed.remaining).toBe(3);

    // Storage retains the items with bumped attempt counts.
    const persisted = JSON.parse(storage.store.get('act_capture_queue_v1')!) as QueueItem[];
    expect(persisted).toHaveLength(3);
    expect(persisted.every((item) => item.attempts === 1)).toBe(true);

    // Session 2: app reopens with the same storage. Network is back.
    const goodHandlers = makeHandlers();
    const q2 = new OfflineUploadQueue({ storage, handlers: goodHandlers });
    const result = await q2.flush();
    expect(result.succeeded).toBe(3);
    expect(result.remaining).toBe(0);
    expect(goodHandlers.postMark).toHaveBeenCalledTimes(3);
    expect(await q2.items()).toHaveLength(0);
  });

  it('processes an upload + auto-stamps complete with the byte count', async () => {
    const storage = new MemoryStorage();
    const handlers = makeHandlers();
    const q = new OfflineUploadQueue({ storage, handlers });

    await q.enqueueUpload({
      recordingId: 'r-9',
      fileUri: 'file:///tmp/clip.mp4',
      presignedUrl: 'https://r2.example/upload-here',
    });
    const result = await q.flush();
    expect(result.succeeded).toBe(1);
    expect(handlers.uploadRecordingFile).toHaveBeenCalledWith(
      'r-9',
      'file:///tmp/clip.mp4',
      'https://r2.example/upload-here',
      'video/mp4',
    );
    expect(handlers.completeRecording).toHaveBeenCalledWith(
      expect.objectContaining({ recordingId: 'r-9', bytesUploaded: 123456 }),
    );
  });

  it('carries duration through the upload auto-complete (no separate complete)', async () => {
    // Regression: duration_s used to be enqueued as a standalone complete
    // that lost a 409 race against the upload auto-complete and was dropped.
    const storage = new MemoryStorage();
    const handlers = makeHandlers();
    const q = new OfflineUploadQueue({ storage, handlers });

    await q.enqueueUpload({
      recordingId: 'r-dur',
      fileUri: 'file:///tmp/clip.mp4',
      presignedUrl: 'https://r2.example/upload-here',
      durationSeconds: 184.5,
      endedAt: '2026-06-02T10:00:00.000Z',
    });
    const result = await q.flush();
    expect(result.succeeded).toBe(1);
    expect(handlers.completeRecording).toHaveBeenCalledTimes(1);
    expect(handlers.completeRecording).toHaveBeenCalledWith(
      expect.objectContaining({
        recordingId: 'r-dur',
        bytesUploaded: 123456,
        durationSeconds: 184.5,
        endedAt: '2026-06-02T10:00:00.000Z',
      }),
    );
  });

  it('does not run complete/process before the upload lands', async () => {
    // Ordering guarantee: when the upload fails (offline), the dependent
    // process item must NOT execute out of order — it waits, untouched.
    const storage = new MemoryStorage();
    const handlers = makeHandlers({
      uploadRecordingFile: jest.fn().mockRejectedValue(new Error('offline')),
    });
    const q = new OfflineUploadQueue({ storage, handlers });

    await q.enqueueUpload({
      recordingId: 'r-ord',
      fileUri: 'file:///tmp/clip.mp4',
      presignedUrl: 'https://r2.example/upload-here',
    });
    await q.enqueueProcess({ recordingId: 'r-ord' });

    const result = await q.flush();

    expect(handlers.uploadRecordingFile).toHaveBeenCalledTimes(1);
    expect(handlers.completeRecording).not.toHaveBeenCalled();
    expect(handlers.startProcessing).not.toHaveBeenCalled();
    expect(result.remaining).toBe(2);

    const persisted = JSON.parse(
      storage.store.get('act_capture_queue_v1')!,
    ) as QueueItem[];
    const upload = persisted.find((i) => i.kind === 'upload')!;
    const process = persisted.find((i) => i.kind === 'process')!;
    expect(upload.attempts).toBe(1);
    expect(process.attempts).toBe(0); // held intact, no attempt consumed
  });

  it('does not block independent marks on the same recording', async () => {
    // Marks carry no ordering dependency: a failed mark must not stall a
    // sibling mark for the same recording.
    const storage = new MemoryStorage();
    const postMark = jest
      .fn()
      .mockRejectedValueOnce(new Error('flaky'))
      .mockResolvedValue({ id: 'm-ok' });
    const handlers = makeHandlers({ postMark });
    const q = new OfflineUploadQueue({ storage, handlers });

    await q.enqueueMark({ recordingId: 'r-mk', timestampSeconds: 1 });
    await q.enqueueMark({ recordingId: 'r-mk', timestampSeconds: 2 });

    await q.flush();

    expect(postMark).toHaveBeenCalledTimes(2);
  });

  it('treats a 409 on complete as success (recording already advanced)', async () => {
    const storage = new MemoryStorage();
    const handlers = makeHandlers({
      completeRecording: jest.fn().mockRejectedValue(
        new Error('POST /recordings/r-2/complete -> 409: status uploaded'),
      ),
    });
    const q = new OfflineUploadQueue({ storage, handlers });

    await q.enqueueComplete({ recordingId: 'r-2', durationSeconds: 184.5 });
    const result = await q.flush();
    expect(result.succeeded).toBe(1);
    expect(result.remaining).toBe(0);
  });

  it('drops items that exceed maxAttempts so the queue stays unblocked', async () => {
    const storage = new MemoryStorage();
    const handlers = makeHandlers({
      postMark: jest.fn().mockRejectedValue(new Error('boom')),
    });
    const q = new OfflineUploadQueue({ storage, handlers, maxAttempts: 2 });

    await q.enqueueMark({ recordingId: 'r-3', timestampSeconds: 1 });

    // First flush -> attempts 0 -> 1, item survives.
    await q.flush();
    expect(await q.items()).toHaveLength(1);

    // Second flush -> attempts 1 -> 2 (>= max), item is dropped.
    await q.flush();
    expect(await q.items()).toHaveLength(0);
  });

  it('enqueueProcess + flush calls startProcessing exactly once', async () => {
    const storage = new MemoryStorage();
    const handlers = makeHandlers();
    const q = new OfflineUploadQueue({ storage, handlers });

    await q.enqueueProcess({ recordingId: 'r-7' });
    const result = await q.flush();
    expect(result.succeeded).toBe(1);
    expect(result.remaining).toBe(0);
    expect(handlers.startProcessing).toHaveBeenCalledTimes(1);
    expect(handlers.startProcessing).toHaveBeenCalledWith('r-7');
  });

  it('treats a 409 on process as success (server already advanced)', async () => {
    const storage = new MemoryStorage();
    const handlers = makeHandlers({
      startProcessing: jest.fn().mockRejectedValue(
        new Error('POST /recordings/r-8/process -> 409: status processing'),
      ),
    });
    const q = new OfflineUploadQueue({ storage, handlers });

    await q.enqueueProcess({ recordingId: 'r-8' });
    const result = await q.flush();
    expect(result.succeeded).toBe(1);
    expect(result.remaining).toBe(0);
  });

  it('subscribers receive queue snapshots', async () => {
    const storage = new MemoryStorage();
    const handlers = makeHandlers();
    const q = new OfflineUploadQueue({ storage, handlers });

    const seen: QueueItem[][] = [];
    const unsub = q.subscribe((items) => seen.push(items));

    await q.enqueueMark({ recordingId: 'r-4', timestampSeconds: 1 });
    await q.enqueueMark({ recordingId: 'r-4', timestampSeconds: 2 });

    expect(seen.length).toBe(2);
    expect(seen[1]).toHaveLength(2);

    unsub();
    await q.enqueueMark({ recordingId: 'r-4', timestampSeconds: 3 });
    expect(seen.length).toBe(2);
  });
});

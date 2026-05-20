/**
 * Offline-first upload queue for ACT Capture.
 *
 * The PR 2 acceptance test says: record 60 seconds, add 3 marks, kill the
 * app, reopen, upload still works. To make that true, every mutation that
 * crosses the network (mark, finalize, upload) is persisted to AsyncStorage
 * with a stable client-generated id BEFORE we attempt to send it. On app
 * resume, the queue is replayed in order. Each item is removed only after
 * the server has acknowledged it.
 *
 * The queue is intentionally simple — JSON in AsyncStorage, in-process
 * mutex. It is good enough for the first pilot (one tech, one phone, tens
 * of marks per job) and does not require SQLite.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  completeRecording,
  postMark,
  startProcessing,
  uploadRecordingFile,
} from '../api/captureApi';

const QUEUE_KEY = 'act_capture_queue_v1';

export type QueueItem =
  | {
      kind: 'mark';
      id: string;
      recordingId: string;
      timestampSeconds: number;
      markType: string;
      note?: string;
      createdBy?: string;
      enqueuedAt: number;
      attempts: number;
    }
  | {
      kind: 'upload';
      id: string;
      recordingId: string;
      fileUri: string;
      presignedUrl: string | null;
      contentType: string;
      enqueuedAt: number;
      attempts: number;
    }
  | {
      kind: 'complete';
      id: string;
      recordingId: string;
      durationSeconds?: number;
      bytesUploaded?: number;
      endedAt?: string;
      enqueuedAt: number;
      attempts: number;
    }
  | {
      kind: 'process';
      id: string;
      recordingId: string;
      enqueuedAt: number;
      attempts: number;
    };

export interface QueueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface QueueHandlers {
  postMark: typeof postMark;
  uploadRecordingFile: typeof uploadRecordingFile;
  completeRecording: typeof completeRecording;
  startProcessing: typeof startProcessing;
}

export interface QueueOptions {
  storage?: QueueStorage;
  handlers?: QueueHandlers;
  maxAttempts?: number;
}

const defaultHandlers: QueueHandlers = {
  postMark,
  uploadRecordingFile,
  completeRecording,
  startProcessing,
};


export class OfflineUploadQueue {
  private readonly storage: QueueStorage;
  private readonly handlers: QueueHandlers;
  private readonly maxAttempts: number;
  private flushing = false;
  private listeners = new Set<(items: QueueItem[]) => void>();

  constructor(options: QueueOptions = {}) {
    this.storage = options.storage ?? AsyncStorage;
    this.handlers = options.handlers ?? defaultHandlers;
    this.maxAttempts = options.maxAttempts ?? 5;
  }

  subscribe(listener: (items: QueueItem[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async items(): Promise<QueueItem[]> {
    const raw = await this.storage.getItem(QUEUE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as QueueItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async enqueueMark(input: {
    recordingId: string;
    timestampSeconds: number;
    markType?: string;
    note?: string;
    createdBy?: string;
  }): Promise<QueueItem> {
    const item: QueueItem = {
      kind: 'mark',
      id: generateId(),
      recordingId: input.recordingId,
      timestampSeconds: input.timestampSeconds,
      markType: input.markType ?? 'teachable',
      note: input.note,
      createdBy: input.createdBy,
      enqueuedAt: Date.now(),
      attempts: 0,
    };
    await this.append(item);
    return item;
  }

  async enqueueUpload(input: {
    recordingId: string;
    fileUri: string;
    presignedUrl: string | null;
    contentType?: string;
  }): Promise<QueueItem> {
    const item: QueueItem = {
      kind: 'upload',
      id: generateId(),
      recordingId: input.recordingId,
      fileUri: input.fileUri,
      presignedUrl: input.presignedUrl,
      contentType: input.contentType ?? 'video/mp4',
      enqueuedAt: Date.now(),
      attempts: 0,
    };
    await this.append(item);
    return item;
  }

  async enqueueComplete(input: {
    recordingId: string;
    durationSeconds?: number;
    bytesUploaded?: number;
    endedAt?: string;
  }): Promise<QueueItem> {
    const item: QueueItem = {
      kind: 'complete',
      id: generateId(),
      recordingId: input.recordingId,
      durationSeconds: input.durationSeconds,
      bytesUploaded: input.bytesUploaded,
      endedAt: input.endedAt,
      enqueuedAt: Date.now(),
      attempts: 0,
    };
    await this.append(item);
    return item;
  }

  async enqueueProcess(input: { recordingId: string }): Promise<QueueItem> {
    const item: QueueItem = {
      kind: 'process',
      id: generateId(),
      recordingId: input.recordingId,
      enqueuedAt: Date.now(),
      attempts: 0,
    };
    await this.append(item);
    return item;
  }

  /** Process pending items in FIFO order. Safe to call repeatedly. */
  async flush(): Promise<{ succeeded: number; failed: number; remaining: number }> {
    if (this.flushing) return { succeeded: 0, failed: 0, remaining: (await this.items()).length };
    this.flushing = true;
    let succeeded = 0;
    let failed = 0;
    try {
      // Work off a snapshot, but write back the mutated list when done.
      let pending = await this.items();
      const survivors: QueueItem[] = [];
      for (const item of pending) {
        try {
          await this.executeOne(item);
          succeeded += 1;
        } catch (err) {
          const attempts = item.attempts + 1;
          if (attempts >= this.maxAttempts) {
            failed += 1;
            // Drop poisoned items after maxAttempts to keep the queue
            // unblocked. The mobile UI surfaces the failure separately.
            continue;
          }
          survivors.push({ ...item, attempts });
          failed += 1;
        }
      }
      await this.replace(survivors);
      return { succeeded, failed, remaining: survivors.length };
    } finally {
      this.flushing = false;
    }
  }

  private async executeOne(item: QueueItem): Promise<void> {
    switch (item.kind) {
      case 'mark':
        await this.handlers.postMark({
          recordingId: item.recordingId,
          timestampSeconds: item.timestampSeconds,
          markType: item.markType,
          note: item.note,
          createdBy: item.createdBy,
        });
        return;
      case 'upload': {
        const bytes = await this.handlers.uploadRecordingFile(
          item.recordingId,
          item.fileUri,
          item.presignedUrl,
          item.contentType,
        );
        // After a successful upload, automatically enqueue a complete so the
        // server flips the status. Mobile callers can also enqueue their own
        // complete with duration_s; this is the safety net.
        await this.handlers.completeRecording({
          recordingId: item.recordingId,
          bytesUploaded: bytes,
        });
        return;
      }
      case 'complete':
        try {
          await this.handlers.completeRecording({
            recordingId: item.recordingId,
            durationSeconds: item.durationSeconds,
            bytesUploaded: item.bytesUploaded,
            endedAt: item.endedAt,
          });
        } catch (err) {
          // 409 means the recording is already past 'pending' — that's fine,
          // the upload path already flipped it. Treat as success.
          if (
            err instanceof Error &&
            err.message.includes('409')
          ) {
            return;
          }
          throw err;
        }
        return;
      case 'process':
        try {
          await this.handlers.startProcessing(item.recordingId);
        } catch (err) {
          // 409 means the server already advanced past 'uploaded' — either
          // we already triggered processing or the recording was processed
          // out-of-band. Treat as success so the queue moves on.
          if (err instanceof Error && err.message.includes('409')) {
            return;
          }
          throw err;
        }
        return;
    }
  }

  private async append(item: QueueItem): Promise<void> {
    const next = [...(await this.items()), item];
    await this.replace(next);
  }

  private async replace(items: QueueItem[]): Promise<void> {
    await this.storage.setItem(QUEUE_KEY, JSON.stringify(items));
    for (const listener of this.listeners) {
      listener(items);
    }
  }
}


function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}


export const captureQueue = new OfflineUploadQueue();

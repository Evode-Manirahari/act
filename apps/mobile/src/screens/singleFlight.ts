/**
 * Single-flight guard for the debrief loop.
 *
 * React state is not a concurrency lock. `busyStep`/`action` only becomes
 * visible after a re-render, so two presses dispatched in the same frame — the
 * classic glove-on double tap on a slow connection — both read `idle` and both
 * fire. That is how one moment ends up with two questions, or two cards from a
 * compile endpoint that is not idempotent server-side.
 *
 * This is the synchronous lock that closes that window: the key is claimed
 * before the first await, so the second caller can never observe an unclaimed
 * key. The UI gates stay as they are — they explain *why* a button is inert;
 * this makes it true.
 */

export type SingleFlight = {
  /**
   * Run `fn` under `key`, or return the in-flight promise if one is already
   * running. Callers that want to know whether they were the one to actually
   * run it should check `isBusy` first.
   */
  run<T>(key: string, fn: () => Promise<T>): Promise<T>;
  /** True while `key` has work in flight. */
  isBusy(key: string): boolean;
  /** Number of keys currently in flight (diagnostics + tests). */
  size(): number;
};

/** Compose the lock key. One action per moment may run at a time. */
export function flightKey(momentId: string, action: string): string {
  return `${momentId}:${action}`;
}

export function createSingleFlight(): SingleFlight {
  const inFlight = new Map<string, Promise<unknown>>();

  return {
    run<T>(key: string, fn: () => Promise<T>): Promise<T> {
      const existing = inFlight.get(key);
      if (existing) return existing as Promise<T>;

      // `fn` is invoked synchronously so the request leaves on this tick, and
      // the key is claimed immediately after. Nothing can interleave between
      // the lookup above and the claim below — reaching this line again
      // requires another turn of the event loop, by which point `inFlight`
      // already holds the key. That is the whole guarantee: the second tap of a
      // double tap always finds the key taken.
      let started: Promise<T>;
      try {
        started = Promise.resolve(fn());
      } catch (err) {
        // Threw before returning a promise — nothing was claimed, nothing to
        // release.
        return Promise.reject(err);
      }
      const tracked = started.finally(() => {
        inFlight.delete(key);
      });
      inFlight.set(key, tracked);
      return tracked;
    },
    isBusy(key: string): boolean {
      return inFlight.has(key);
    },
    size(): number {
      return inFlight.size;
    },
  };
}

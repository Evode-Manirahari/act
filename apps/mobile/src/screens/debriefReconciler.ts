/**
 * Decides *when* an automatic reconciliation may run.
 *
 * This exists to separate two facts that were previously carried by one flag:
 *
 *   1. the outcome of a write is still unresolved (`needsRefetch`);
 *   2. an automatic reconciliation attempt is still owed.
 *
 * The screen effect hydrated whenever `needsRefetch` was true, and a failed
 * hydration deliberately preserved `needsRefetch` — so the failure wrote state,
 * the state write re-ran the effect, and the effect failed again. An unbounded
 * request loop, hammering a backend that is already unhealthy, and the obvious
 * "fix" (clearing `needsRefetch` on failure) would have been a lie: it would
 * mark a write resolved precisely when we know least about it.
 *
 * So uncertainty persists, and *scheduling* is tracked here instead. Each moment
 * gets one automatic attempt. If it fails the moment stays unresolved and
 * unconfirmed, and the UI says so — but nothing fires again until a human asks
 * for it (pull-to-refresh, or the Retry action), which calls `allowRetry`.
 *
 * Kept as a plain object rather than React state on purpose: it must be readable
 * and mutable synchronously inside the effect, before any await, or two renders
 * in the same tick would both claim the attempt.
 */

export type ReconciliationController = {
  /**
   * True when this moment is owed an automatic attempt: the write is
   * unresolved and no automatic attempt has been made since the last explicit
   * refresh.
   */
  shouldAttempt(momentId: string, machine: { needsRefetch: boolean }): boolean;
  /** Claim the attempt. Must be called synchronously, before awaiting. */
  claim(momentId: string): void;
  /** A confirmed result arrived — this moment may auto-reconcile again later. */
  resolve(momentId: string): void;
  /** An explicit user action (refresh / Retry) re-arms automatic attempts. */
  allowRetry(momentId?: string): void;
  /** Diagnostics + tests. */
  attemptedCount(): number;
};

export function createReconciliationController(): ReconciliationController {
  // Moments whose one automatic attempt has been spent.
  const attempted = new Set<string>();

  return {
    shouldAttempt(momentId, machine) {
      if (!machine.needsRefetch) return false;
      return !attempted.has(momentId);
    },
    claim(momentId) {
      attempted.add(momentId);
    },
    resolve(momentId) {
      attempted.delete(momentId);
    },
    allowRetry(momentId) {
      if (momentId === undefined) {
        attempted.clear();
        return;
      }
      attempted.delete(momentId);
    },
    attemptedCount() {
      return attempted.size;
    },
  };
}

/**
 * The first moment owed an automatic attempt, if any.
 *
 * One at a time by design: a batch of uncertain writes after a network drop
 * should trickle rather than burst against a backend that may still be
 * unhealthy. The next one is picked up on the following state update.
 */
export function nextMomentToReconcile(
  controller: ReconciliationController,
  entries: [string, { machine: { needsRefetch: boolean } }][],
): string | null {
  for (const [momentId, entry] of entries) {
    if (controller.shouldAttempt(momentId, entry.machine)) return momentId;
  }
  return null;
}

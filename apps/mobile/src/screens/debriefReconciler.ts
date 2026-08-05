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
 * request loop, and the obvious "fix" (clearing `needsRefetch` on failure) would
 * have been a lie: it marks a write resolved precisely when we know least.
 *
 * ## Generations
 *
 * Tracking attempts as a flat "already tried this moment" set was still wrong,
 * because *ordinary* hydration (first load, pull-to-refresh) claims moments too.
 * A failed initial load would mark a moment as attempted, and then a genuinely
 * uncertain write minutes later would silently receive no automatic
 * reconciliation at all — the controller believed its one attempt was spent.
 *
 * So attempts belong to a **generation**. Every transition from a resolved write
 * state into `needsRefetch = true` opens a new generation for that moment, and
 * an attempt only counts against the generation that was current when it was
 * claimed. A stale claim from before the write cannot consume the new
 * generation's attempt, and a claim made while nothing was uncertain is
 * harmless.
 *
 * Kept as a plain object rather than React state on purpose: it must be readable
 * and mutable synchronously, before any await, or two renders in the same tick
 * would both claim the same attempt.
 */

type MomentAttempts = {
  /** Bumped every time this moment enters a new uncertain-write generation. */
  generation: number;
  /** The generation an automatic attempt has already been spent on. */
  attemptedGeneration: number | null;
};

export type ReconciliationController = {
  /**
   * A write for this moment just became uncertain. Opens a new generation,
   * which is owed exactly one automatic attempt regardless of what happened to
   * any earlier hydration.
   */
  beginGeneration(momentId: string): void;
  /**
   * True when this moment is owed an automatic attempt: the write is unresolved
   * and the current generation has not been attempted yet.
   */
  shouldAttempt(momentId: string, machine: { needsRefetch: boolean }): boolean;
  /** Spend the current generation's attempt. Call synchronously, before awaiting. */
  claim(momentId: string): void;
  /** An authoritative reconciliation landed — this generation is done. */
  resolve(momentId: string): void;
  /** An explicit user action (refresh / Retry) re-arms the current generation. */
  allowRetry(momentId?: string): void;
  /** Diagnostics + tests. */
  generationOf(momentId: string): number;
};

export function createReconciliationController(): ReconciliationController {
  const state = new Map<string, MomentAttempts>();

  function entry(momentId: string): MomentAttempts {
    let found = state.get(momentId);
    if (!found) {
      found = { generation: 0, attemptedGeneration: null };
      state.set(momentId, found);
    }
    return found;
  }

  return {
    beginGeneration(momentId) {
      entry(momentId).generation += 1;
    },
    shouldAttempt(momentId, machine) {
      if (!machine.needsRefetch) return false;
      const current = entry(momentId);
      return current.attemptedGeneration !== current.generation;
    },
    claim(momentId) {
      const current = entry(momentId);
      current.attemptedGeneration = current.generation;
    },
    resolve(momentId) {
      const current = entry(momentId);
      current.attemptedGeneration = current.generation;
    },
    allowRetry(momentId) {
      if (momentId === undefined) {
        for (const current of state.values()) {
          current.attemptedGeneration = null;
        }
        return;
      }
      entry(momentId).attemptedGeneration = null;
    },
    generationOf(momentId) {
      return entry(momentId).generation;
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
  for (const [momentId, item] of entries) {
    if (controller.shouldAttempt(momentId, item.machine)) return momentId;
  }
  return null;
}

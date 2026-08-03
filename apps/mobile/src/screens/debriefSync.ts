/**
 * The single entry point for running a hydration.
 *
 * Every trigger — first load, pull-to-refresh, the per-moment Retry button, the
 * voice agent finishing, and the automatic post-uncertain-write effect — goes
 * through here, because the ordering guarantees below only hold if nothing
 * bypasses them.
 *
 * Three mechanisms, all required:
 *
 *   1. **Claim before awaiting.** A manual refresh or Retry *is* the attempt, so
 *      the moments are claimed synchronously — before any state update or await
 *      — and the automatic effect can never see them as owed one. Claims are
 *      generation-scoped (see debriefReconciler), so claiming a moment whose
 *      write is already resolved cannot starve a *later* uncertain write.
 *   2. **Batch single-flight.** Two hydrations of the same batch collapse to one
 *      request, so a double pull-to-refresh doesn't double the load.
 *   3. **Per-moment versioning.** Batches that merely *overlap* — a full refresh
 *      for [A, B] racing a Retry for [A] — have different flight keys and both
 *      run. Each hydration stamps every moment it covers with a monotonic
 *      sequence, and on completion applies results only for moments it is still
 *      the newest hydration of. Without this, a slow older response can land
 *      after a newer one and overwrite authoritative state with stale data.
 *
 * On failure the attempt stays consumed (nothing retries on its own). On a fully
 * confirmed read the moment is resolved.
 */
import {
  fetchMomentServerState,
  isFullyConfirmed,
  type HydrationApi,
  type HydrationTarget,
  type MomentServerState,
} from './debriefHydration';
import type { ReconciliationController } from './debriefReconciler';
import type { SingleFlight } from './singleFlight';

export type { HydrationTarget };

/** Stable key for a batch, so the same set of moments collapses to one flight. */
export function hydrationKey(moments: HydrationTarget[]): string {
  return `hydrate:${moments
    .map((moment) => moment.id)
    .slice()
    .sort()
    .join(',')}`;
}

export type Hydrator = (moments: HydrationTarget[]) => Promise<void>;

export function createHydrator(deps: {
  api: HydrationApi;
  controller: ReconciliationController;
  flight: SingleFlight;
  /** Fold the server's answer into screen state. */
  apply: (server: MomentServerState[]) => void;
}): Hydrator {
  // The newest hydration sequence covering each moment.
  const latestSequence = new Map<string, number>();
  let sequence = 0;

  return async function hydrate(moments) {
    if (moments.length === 0) return;

    sequence += 1;
    const mySequence = sequence;

    // (1) + (3): claim and stamp synchronously, before the first await.
    for (const moment of moments) {
      deps.controller.claim(moment.id);
      latestSequence.set(moment.id, mySequence);
    }

    // (2) Collapse concurrent hydrations of the identical batch.
    await deps.flight.run(hydrationKey(moments), async () => {
      const server = await fetchMomentServerState(deps.api, moments);

      // Drop any moment a newer hydration has since taken over. Applying it
      // would overwrite fresher authoritative state with a stale response.
      const current = server.filter(
        (entry) => latestSequence.get(entry.momentId) === mySequence,
      );
      if (current.length === 0) return;

      deps.apply(current);
      for (const entry of current) {
        // Only a complete, authoritative read resolves the moment. A partial or
        // failed read leaves the attempt consumed and the moment unresolved.
        if (isFullyConfirmed(entry)) {
          deps.controller.resolve(entry.momentId);
        }
      }
    });
  };
}

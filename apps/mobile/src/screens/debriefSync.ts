/**
 * The single entry point for running a hydration.
 *
 * Every trigger — first load, pull-to-refresh, the per-moment Retry button, the
 * voice agent finishing, and the automatic post-uncertain-write effect — goes
 * through here, because the ordering guarantees below only hold if nothing
 * bypasses them.
 *
 * The race this closes: `refresh()` used to re-arm the controller, then await a
 * moments fetch, then update `moments` state, then hydrate. The automatic effect
 * depends on `moments`, so it could run during that window, observe every moment
 * as still owed an attempt, and start a *second* hydration alongside the manual
 * one already in flight.
 *
 * Two mechanisms, both required:
 *
 *   1. **Claim before awaiting.** A manual refresh or Retry *is* the attempt, so
 *      the moments are claimed synchronously — before any state update or await
 *      — and the automatic effect can never see them as owed.
 *   2. **Single-flight per batch.** Two hydrations of the same batch collapse to
 *      one request, so a double pull-to-refresh doesn't double the load on a
 *      backend that may already be struggling.
 *
 * On failure the attempt stays consumed (nothing retries on its own). On a fully
 * confirmed read the moment is resolved, re-arming it for a future uncertain
 * write.
 */
import {
  fetchMomentServerState,
  isFullyConfirmed,
  type HydrationApi,
  type MomentServerState,
} from './debriefHydration';
import type { ReconciliationController } from './debriefReconciler';
import type { SingleFlight } from './singleFlight';

export type HydrationTarget = { id: string; status: string };

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
  return async function hydrate(moments) {
    if (moments.length === 0) return;

    // (1) Synchronous claim. Must happen before the first await, or the
    // automatic effect can slip in behind us and start its own request.
    for (const moment of moments) {
      deps.controller.claim(moment.id);
    }

    // (2) Collapse concurrent hydrations of the same batch.
    await deps.flight.run(hydrationKey(moments), async () => {
      const server = await fetchMomentServerState(deps.api, moments);
      deps.apply(server);
      for (const entry of server) {
        // Only a complete, authoritative read re-arms the moment. A partial or
        // failed read leaves the attempt consumed and the moment unresolved.
        if (isFullyConfirmed(entry)) {
          deps.controller.resolve(entry.momentId);
        }
      }
    });
  };
}

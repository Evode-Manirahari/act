/**
 * The one authoritative path that decides what phase a moment is in.
 *
 * Two distinct failures live here, and conflating them is a bug:
 *
 *   - **The server says there is nothing.** No card exists, no question exists.
 *     That is authoritative and may lower a moment's phase.
 *   - **We could not ask.** A 401, a 503, a timeout. That tells us *nothing*.
 *
 * An earlier version collapsed the second into the first by catching errors into
 * `[]` and `null`. A card listing that 503s then looked exactly like "this
 * moment has no card", so a compiled moment silently reverted to "waiting for
 * debrief" — and since compile is not idempotent server-side, acting on that
 * would have produced a second card. Same shape as the original fabricated-card
 * bug: the client asserting something the server never said.
 *
 * So every read is now an explicit `ReadResult`. Only a *successful* read may
 * clear state or lower a phase; a failed read freezes what was last confirmed,
 * keeps `needsRefetch` set, and locks compile/publish until a later refresh
 * resolves it.
 */
import {
  indexCardsByMoment,
  type ElicitationQuestion,
  type KnowledgeObject,
} from '../api/libraryApi';
import { reconcile, type DebriefState } from './reviewDebriefModel';

/**
 * The outcome of one read. `ok: true` with `value: null` means the server
 * confirmed absence; `ok: false` means we never found out.
 */
export type ReadResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown };

export function readOk<T>(value: T): ReadResult<T> {
  return { ok: true, value };
}

export function readFailed<T>(error: unknown): ReadResult<T> {
  return { ok: false, error };
}

/** Run a read, capturing failure instead of letting it masquerade as absence. */
async function attempt<T>(run: () => Promise<T>): Promise<ReadResult<T>> {
  try {
    return readOk(await run());
  } catch (error) {
    return readFailed<T>(error);
  }
}

/** Everything the server told us — or didn't — about one moment's debrief. */
export type MomentServerState = {
  momentId: string;
  momentStatus: string;
  /** Confirmed question (or confirmed absence), else a failed read. */
  question: ReadResult<{ question: ElicitationQuestion; answered: boolean } | null>;
  /** Confirmed card (or confirmed absence), else a failed read. */
  card: ReadResult<KnowledgeObject | null>;
};

/** True only when every read for this moment succeeded. */
export function isFullyConfirmed(server: MomentServerState): boolean {
  return server.question.ok && server.card.ok;
}

/** The first error from an incomplete read, for the retry banner. */
export function firstReadError(server: MomentServerState): unknown {
  if (!server.question.ok) return server.question.error;
  if (!server.card.ok) return server.card.error;
  return null;
}

/** The subset of the API this module needs, so tests can supply fakes. */
export type HydrationApi = {
  resolveMomentQuestion(
    momentId: string,
  ): Promise<{ question: ElicitationQuestion; answered: boolean } | null>;
  listKnowledgeObjects(input?: {
    status?: string;
    trade?: string;
    limit?: number;
  }): Promise<KnowledgeObject[]>;
};

/**
 * Read server state for a set of moments.
 *
 * Cards are fetched once and indexed by moment (act-api has no per-moment card
 * route). If that one call fails, every moment's card read is marked failed —
 * not empty — because a single 401 must not look like "the whole account has no
 * cards".
 */
export async function fetchMomentServerState(
  api: HydrationApi,
  moments: { id: string; status: string }[],
): Promise<MomentServerState[]> {
  if (moments.length === 0) return [];

  const cardsRead = await attempt(() => api.listKnowledgeObjects({ limit: 200 }));
  const cardsByMoment = cardsRead.ok ? indexCardsByMoment(cardsRead.value) : null;

  return Promise.all(
    moments.map(async (moment) => {
      const question = await attempt(() => api.resolveMomentQuestion(moment.id));
      return {
        momentId: moment.id,
        momentStatus: moment.status,
        question,
        card: cardsByMoment
          ? readOk(cardsByMoment[moment.id] ?? null)
          : readFailed<KnowledgeObject | null>(
              (cardsRead as { ok: false; error: unknown }).error,
            ),
      };
    }),
  );
}

/**
 * Fold one moment's server state into its machine.
 *
 * Only a complete set of successful reads may move the phase. Anything less and
 * the moment keeps whatever was last confirmed, stays flagged as unconfirmed,
 * and keeps any outstanding `needsRefetch`.
 */
export function hydrateState(
  state: DebriefState,
  server: MomentServerState,
): DebriefState {
  // Each read is passed through only if it succeeded. `reconcile` applies what
  // it is given and leaves the rest alone, so a card-listing outage blocks
  // compile/publish without also blocking a technician from answering a
  // question we did confirm.
  return reconcile(state, {
    momentStatus: server.momentStatus,
    question: server.question.ok
      ? {
          questionId: server.question.value?.question.id ?? null,
          answered: server.question.value?.answered ?? false,
        }
      : undefined,
    card: server.card.ok ? { status: server.card.value?.status ?? null } : undefined,
  });
}

/**
 * What the screen should hold for question/card after hydrating.
 *
 * A successful read is authoritative in both directions: a returned row
 * replaces what we had, and a confirmed absence clears it. A failed read leaves
 * the previous value in place so the reviewer keeps seeing the card they were
 * working on — flagged unconfirmed, and not actionable.
 */
export function resolveHeldValue<T>(
  read: ReadResult<T | null>,
  current: T | null,
): T | null {
  return read.ok ? read.value : current;
}

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
 * would have produced a second card.
 *
 * So every read is an explicit `ReadResult`. Only a *successful* read may clear
 * state or lower a phase; a failed read freezes what was last confirmed, keeps
 * `needsRefetch` set, and locks the actions that depend on it.
 *
 * **Moment status is a read too.** It used to be taken from the caller's local
 * `MomentOut`, which is exactly the value that is wrong after an uncertain
 * approval: the PATCH may have landed while the client still holds `proposed`.
 * Trusting it would have made an uncertain approval permanently unresolvable —
 * hydration would keep "confirming" the stale local value. act-api has no
 * single-moment GET, so statuses are re-read per recording and indexed.
 */
import {
  indexCardsByMoment,
  type ElicitationQuestion,
  type KnowledgeObject,
} from '../api/libraryApi';
import type { MomentOut } from '../api/captureApi';
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
  /**
   * The moment's status as the *server* reports it. `ok: true, value: null`
   * means the moment is gone; a failed read means we could not ask, and the
   * unreviewed/pending_debrief boundary stays frozen.
   */
  momentStatus: ReadResult<string | null>;
  /** Confirmed question (or confirmed absence), else a failed read. */
  question: ReadResult<{ question: ElicitationQuestion; answered: boolean } | null>;
  /** Confirmed card (or confirmed absence), else a failed read. */
  card: ReadResult<KnowledgeObject | null>;
};

/** True only when every read for this moment succeeded. */
export function isFullyConfirmed(server: MomentServerState): boolean {
  return server.momentStatus.ok && server.question.ok && server.card.ok;
}

/** The first error from an incomplete read, for the banner / auth detection. */
export function firstReadError(server: MomentServerState): unknown {
  if (!server.momentStatus.ok) return server.momentStatus.error;
  if (!server.question.ok) return server.question.error;
  if (!server.card.ok) return server.card.error;
  return null;
}

/** The subset of the API this module needs, so tests can supply fakes. */
export type HydrationApi = {
  listRecordingMoments(input: { recordingId: string }): Promise<MomentOut[]>;
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
 * What hydration is asked to refresh. `status` is the caller's *local* value —
 * used only to seed the initial UI before any read lands, never as the
 * authoritative answer.
 */
export type HydrationTarget = {
  id: string;
  status: string;
  recordingId: string;
};

/**
 * Read server state for a set of moments.
 *
 * Cards are fetched once for the whole batch and indexed by moment (act-api has
 * no per-moment card route). Moment statuses are fetched once per *recording*
 * for the same reason. If either of those single calls fails, every moment it
 * covered is marked failed — not empty — because one 401 must not read as "no
 * cards exist" or "this moment is gone".
 */
export async function fetchMomentServerState(
  api: HydrationApi,
  moments: HydrationTarget[],
): Promise<MomentServerState[]> {
  if (moments.length === 0) return [];

  const cardsRead = await attempt(() => api.listKnowledgeObjects({ limit: 200 }));
  const cardsByMoment = cardsRead.ok ? indexCardsByMoment(cardsRead.value) : null;

  // One request per recording, not per moment.
  const recordingIds = [...new Set(moments.map((moment) => moment.recordingId))];
  const statusByRecording = new Map<string, ReadResult<Map<string, string>>>();
  await Promise.all(
    recordingIds.map(async (recordingId) => {
      const read = await attempt(() => api.listRecordingMoments({ recordingId }));
      statusByRecording.set(
        recordingId,
        read.ok
          ? readOk(new Map(read.value.map((moment) => [moment.id, moment.status])))
          : readFailed<Map<string, string>>(read.error),
      );
    }),
  );

  return Promise.all(
    moments.map(async (moment) => {
      const question = await attempt(() => api.resolveMomentQuestion(moment.id));
      const statusRead = statusByRecording.get(moment.recordingId);
      return {
        momentId: moment.id,
        momentStatus: statusRead?.ok
          ? readOk(statusRead.value.get(moment.id) ?? null)
          : readFailed<string | null>(
              statusRead ? (statusRead as { ok: false; error: unknown }).error : null,
            ),
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
 * Each read is passed through only if it succeeded; `reconcile` applies what it
 * is given and leaves the rest alone. So a card-listing outage blocks compile
 * and publish without also blocking a technician from answering a question we
 * did confirm, and a failed moment-status read freezes the
 * unreviewed/pending_debrief boundary without touching anything else.
 */
export function hydrateState(
  state: DebriefState,
  server: MomentServerState,
): DebriefState {
  return reconcile(state, {
    moment: server.momentStatus.ok ? { status: server.momentStatus.value } : undefined,
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

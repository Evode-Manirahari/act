/**
 * The one authoritative path that decides what phase a moment is in.
 *
 * Before this existed the screen seeded a moment from `moment.status` alone,
 * which only distinguishes "approved" from "not approved". Everything past that
 * point — answered, compiled, published — lived in client booleans set by the
 * actions the user happened to take in that session. Reload the screen and a
 * fully published moment came back as "waiting for debrief", which is the same
 * class of lie the fabricated cards were: UI state asserting something the
 * server had not confirmed.
 *
 * Hydration answers all four questions from the server:
 *   - is the moment approved?
 *   - which question is authoritative for it?
 *   - has that question been answered?
 *   - does a card exist, and is it draft or published?
 *
 * `reconcile` in reviewDebriefModel turns that into a phase. Nothing here reads
 * a local flag, and `draftAnswer` is carried through untouched so hydrating
 * never costs the technician text they are part-way through typing.
 */
import {
  indexCardsByMoment,
  type ElicitationQuestion,
  type KnowledgeObject,
} from '../api/libraryApi';
import { reconcile, type DebriefState } from './reviewDebriefModel';

/** Everything the server knows about one moment's debrief. */
export type MomentServerState = {
  momentId: string;
  momentStatus: string;
  question: ElicitationQuestion | null;
  questionAnswered: boolean;
  card: KnowledgeObject | null;
};

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
 * Read complete server state for a set of moments.
 *
 * Cards are fetched once and indexed by moment (act-api has no per-moment card
 * route), while questions are per-moment. A moment whose question lookup fails
 * is reported with what we do know rather than failing the whole batch — a
 * partial refresh is better than a screen that silently keeps stale phases.
 */
export async function fetchMomentServerState(
  api: HydrationApi,
  moments: { id: string; status: string }[],
): Promise<MomentServerState[]> {
  if (moments.length === 0) return [];

  const cards = await api
    .listKnowledgeObjects({ limit: 200 })
    .catch(() => [] as KnowledgeObject[]);
  const cardsByMoment = indexCardsByMoment(cards);

  return Promise.all(
    moments.map(async (moment) => {
      const resolved = await api.resolveMomentQuestion(moment.id).catch(() => null);
      return {
        momentId: moment.id,
        momentStatus: moment.status,
        question: resolved?.question ?? null,
        questionAnswered: resolved?.answered ?? false,
        card: cardsByMoment[moment.id] ?? null,
      };
    }),
  );
}

/**
 * Fold one moment's server state into its machine.
 *
 * A card outranks the question: if a published card exists the moment is
 * published even if the question row somehow looks open, because the card is
 * the outcome the reviewer and the apprentice both see.
 */
export function hydrateState(
  state: DebriefState,
  server: MomentServerState,
): DebriefState {
  return reconcile(state, {
    momentStatus: server.momentStatus,
    questionId: server.question?.id ?? null,
    questionAnswered: server.questionAnswered,
    cardStatus: server.card?.status ?? null,
  });
}

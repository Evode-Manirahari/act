/**
 * Hydration restores phase from server state, not from what the client
 * remembers doing.
 *
 * The bug this covers: the screen seeded a moment from `moment.status` alone,
 * so answered / compiled / published existed only as client booleans. Reload
 * and a published moment came back as "waiting for debrief" — UI asserting
 * something the server had never said, which is the same class of dishonesty as
 * the fabricated cards themselves.
 *
 * TEST_DATA only.
 */
import {
  fetchMomentServerState,
  hydrateState,
  type HydrationApi,
  type MomentServerState,
} from '../debriefHydration';
import {
  canCompile,
  canPublish,
  canRequestQuestion,
  INITIAL_DEBRIEF_STATE,
  initialStateForMoment,
  phaseLabel,
  setDraftAnswer,
  type DebriefState,
} from '../reviewDebriefModel';
import type { ElicitationQuestion, KnowledgeObject } from '../../api/libraryApi';

const MOMENT_ID = 'TEST_DATA-moment-1';

function question(overrides: Partial<ElicitationQuestion> = {}): ElicitationQuestion {
  return {
    id: 'TEST_DATA-question-1',
    moment_id: MOMENT_ID,
    question: 'TEST_DATA What told you to check there first?',
    reason: null,
    status: 'proposed',
    asked_at: null,
    created_at: '2026-08-03T00:00:00.000Z',
    ...overrides,
  };
}

function card(overrides: Partial<KnowledgeObject> = {}): KnowledgeObject {
  return {
    id: 'TEST_DATA-card-1',
    moment_id: MOMENT_ID,
    title: 'TEST_DATA card',
    trade: 'hvac',
    situation: null,
    observable_cue: null,
    expert_reasoning: null,
    decision: null,
    novice_trap: null,
    safety_boundary: null,
    verification: null,
    quiz_json: null,
    tags_json: null,
    status: 'draft',
    created_by: null,
    published_at: null,
    created_at: '2026-08-03T00:00:00.000Z',
    ...overrides,
  };
}

function serverState(overrides: Partial<MomentServerState> = {}): MomentServerState {
  return {
    momentId: MOMENT_ID,
    momentStatus: 'approved',
    question: null,
    questionAnswered: false,
    card: null,
    ...overrides,
  };
}

/** A fresh screen: nothing known locally beyond the moment's status. */
const COLD_RELOAD: DebriefState = initialStateForMoment('approved');

describe('reload restores state the client never saw happen', () => {
  it('restores answered when the stored question is answered', () => {
    const hydrated = hydrateState(
      COLD_RELOAD,
      serverState({ question: question({ status: 'answered' }), questionAnswered: true }),
    );

    expect(hydrated.phase).toBe('answered');
    expect(hydrated.questionId).toBe('TEST_DATA-question-1');
    expect(canCompile(hydrated)).toBe(true);
    // And it does not offer to draft another question for a finished debrief.
    expect(canRequestQuestion(hydrated)).toBe(false);
  });

  it('restores compiled when a draft card exists', () => {
    const hydrated = hydrateState(
      COLD_RELOAD,
      serverState({
        question: question({ status: 'answered' }),
        questionAnswered: true,
        card: card({ status: 'draft' }),
      }),
    );

    expect(hydrated.phase).toBe('compiled');
    expect(canPublish(hydrated)).toBe(true);
    expect(canCompile(hydrated)).toBe(false);
  });

  it('restores published when a published card exists', () => {
    const hydrated = hydrateState(
      COLD_RELOAD,
      serverState({
        question: question({ status: 'answered' }),
        questionAnswered: true,
        card: card({ status: 'published', published_at: '2026-08-03T01:00:00.000Z' }),
      }),
    );

    expect(hydrated.phase).toBe('published');
    expect(phaseLabel(hydrated)).toBe('Published');
    expect(canPublish(hydrated)).toBe(false);
    expect(canCompile(hydrated)).toBe(false);
  });

  it('stays pending_debrief when the question is still open', () => {
    const hydrated = hydrateState(COLD_RELOAD, serverState({ question: question() }));

    expect(hydrated.phase).toBe('pending_debrief');
    expect(phaseLabel(hydrated)).toBe('Waiting for your answer');
    expect(canCompile(hydrated)).toBe(false);
  });

  it('stays unreviewed when the moment is not approved', () => {
    const hydrated = hydrateState(
      INITIAL_DEBRIEF_STATE,
      serverState({ momentStatus: 'proposed' }),
    );
    expect(hydrated.phase).toBe('unreviewed');
  });

  it('lets a card outrank a question row that still looks open', () => {
    // Server-side auto-compile can leave the question row lagging. The card is
    // the artifact people actually see, so it wins.
    const hydrated = hydrateState(
      COLD_RELOAD,
      serverState({ question: question({ status: 'asked' }), card: card({ status: 'draft' }) }),
    );
    expect(hydrated.phase).toBe('compiled');
  });

  it('preserves the technician’s in-progress answer while hydrating', () => {
    const typing = setDraftAnswer(COLD_RELOAD, 'TEST_DATA half-written answer');
    const hydrated = hydrateState(typing, serverState({ question: question() }));

    expect(hydrated.draftAnswer).toBe('TEST_DATA half-written answer');
  });

  it('does not derive phase from prior local actions', () => {
    // A machine that locally believes it is published, but the server has no
    // card and no answer, is corrected downward rather than trusted.
    const optimistic: DebriefState = { ...COLD_RELOAD, phase: 'published' };
    const hydrated = hydrateState(optimistic, serverState({ question: question() }));

    expect(hydrated.phase).toBe('pending_debrief');
  });
});

describe('uncertain compile and publish outcomes reconcile from the server', () => {
  it('restores compiled when the compile landed but the response was lost', () => {
    const lost: DebriefState = {
      ...COLD_RELOAD,
      phase: 'answered',
      questionId: 'TEST_DATA-question-1',
      block: { kind: 'error', message: 'TEST_DATA connection lost' },
      needsRefetch: true,
    };

    const hydrated = hydrateState(
      lost,
      serverState({
        question: question({ status: 'answered' }),
        questionAnswered: true,
        card: card({ status: 'draft' }),
      }),
    );

    expect(hydrated.phase).toBe('compiled');
    expect(hydrated.needsRefetch).toBe(false);
    // Compile is not idempotent server-side — the gate must now be closed.
    expect(canCompile(hydrated)).toBe(false);
  });

  it('restores published when the publish landed but the response was lost', () => {
    const lost: DebriefState = {
      ...COLD_RELOAD,
      phase: 'compiled',
      questionId: 'TEST_DATA-question-1',
      block: { kind: 'error', message: 'TEST_DATA connection lost' },
      needsRefetch: true,
    };

    const hydrated = hydrateState(
      lost,
      serverState({
        question: question({ status: 'answered' }),
        questionAnswered: true,
        card: card({ status: 'published' }),
      }),
    );

    expect(hydrated.phase).toBe('published');
    expect(canPublish(hydrated)).toBe(false);
    expect(hydrated.needsRefetch).toBe(false);
  });

  it('discovers a server-side auto-compiled card instead of racing it', () => {
    // act-api enqueues a compile chain after an accepted answer. The client may
    // never have tapped Compile, so it must find the card, not contradict it.
    const justAnswered: DebriefState = {
      ...COLD_RELOAD,
      phase: 'answered',
      questionId: 'TEST_DATA-question-1',
    };

    const hydrated = hydrateState(
      justAnswered,
      serverState({
        question: question({ status: 'answered' }),
        questionAnswered: true,
        card: card({ status: 'draft' }),
      }),
    );

    expect(hydrated.phase).toBe('compiled');
    expect(canCompile(hydrated)).toBe(false);
  });

  it('clears a stale rejection banner once the server says it got past that', () => {
    const rejected: DebriefState = {
      ...COLD_RELOAD,
      block: { kind: 'rejected', reason: 'expert_answer_too_thin', message: 'TEST_DATA' },
    };
    const hydrated = hydrateState(
      rejected,
      serverState({ question: question({ status: 'answered' }), questionAnswered: true }),
    );
    expect(hydrated.block.kind).toBe('none');
  });

  it('keeps the rejection banner while the question is still unanswered', () => {
    const rejected: DebriefState = {
      ...COLD_RELOAD,
      block: { kind: 'rejected', reason: 'expert_answer_too_thin', message: 'TEST_DATA' },
    };
    const hydrated = hydrateState(rejected, serverState({ question: question() }));
    expect(hydrated.block.kind).toBe('rejected');
  });
});

describe('fetchMomentServerState reads complete state in one pass', () => {
  function api(overrides: Partial<HydrationApi> = {}): HydrationApi {
    return {
      resolveMomentQuestion: jest.fn().mockResolvedValue(null),
      listKnowledgeObjects: jest.fn().mockResolvedValue([]),
      ...overrides,
    };
  }

  it('fetches cards once for the whole batch, not once per moment', async () => {
    const listKnowledgeObjects = jest.fn().mockResolvedValue([]);
    const deps = api({ listKnowledgeObjects });

    await fetchMomentServerState(deps, [
      { id: 'TEST_DATA-m1', status: 'approved' },
      { id: 'TEST_DATA-m2', status: 'approved' },
      { id: 'TEST_DATA-m3', status: 'approved' },
    ]);

    expect(listKnowledgeObjects).toHaveBeenCalledTimes(1);
  });

  it('matches each moment to its own card', async () => {
    const deps = api({
      listKnowledgeObjects: jest.fn().mockResolvedValue([
        card({ id: 'TEST_DATA-card-a', moment_id: 'TEST_DATA-m1', status: 'published' }),
        card({ id: 'TEST_DATA-card-b', moment_id: 'TEST_DATA-m2', status: 'draft' }),
      ]),
    });

    const result = await fetchMomentServerState(deps, [
      { id: 'TEST_DATA-m1', status: 'approved' },
      { id: 'TEST_DATA-m2', status: 'approved' },
      { id: 'TEST_DATA-m3', status: 'approved' },
    ]);

    expect(result[0].card?.status).toBe('published');
    expect(result[1].card?.status).toBe('draft');
    expect(result[2].card).toBeNull();
  });

  it('reports the answered flag from the resolved question', async () => {
    const deps = api({
      resolveMomentQuestion: jest
        .fn()
        .mockResolvedValue({ question: question({ status: 'answered' }), answered: true }),
    });

    const [result] = await fetchMomentServerState(deps, [
      { id: MOMENT_ID, status: 'approved' },
    ]);

    expect(result.questionAnswered).toBe(true);
    expect(result.question?.id).toBe('TEST_DATA-question-1');
  });

  it('degrades to partial state rather than failing the whole refresh', async () => {
    const deps = api({
      resolveMomentQuestion: jest.fn().mockRejectedValue(new Error('TEST_DATA timeout')),
      listKnowledgeObjects: jest.fn().mockRejectedValue(new Error('TEST_DATA timeout')),
    });

    const [result] = await fetchMomentServerState(deps, [
      { id: MOMENT_ID, status: 'approved' },
    ]);

    expect(result.question).toBeNull();
    expect(result.card).toBeNull();
    expect(result.momentStatus).toBe('approved');
  });

  it('skips the network entirely for an empty batch', async () => {
    const listKnowledgeObjects = jest.fn().mockResolvedValue([]);
    const result = await fetchMomentServerState(api({ listKnowledgeObjects }), []);

    expect(result).toEqual([]);
    expect(listKnowledgeObjects).not.toHaveBeenCalled();
  });
});

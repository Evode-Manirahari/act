/**
 * Hydration restores phase from server state, and — just as important —
 * refuses to act on state it could not read.
 *
 * Two bugs are covered here. The first: phase lived in client booleans, so a
 * reload showed a published moment as "waiting for debrief". The second, subtler
 * one: hydration caught read errors into `[]`/`null`, so a 503 on the card
 * listing was indistinguishable from "this moment has no card" — which would
 * lower a compiled moment's phase and re-open a compile button against an
 * endpoint that is not idempotent.
 *
 * TEST_DATA only.
 */
import {
  fetchMomentServerState,
  firstReadError,
  hydrateState,
  isFullyConfirmed,
  readFailed,
  readOk,
  resolveHeldValue,
  type HydrationApi,
  type MomentServerState,
} from '../debriefHydration';
import {
  canCompile,
  canPublish,
  canRequestQuestion,
  INITIAL_DEBRIEF_STATE,
  initialStateForMoment,
  isUnconfirmed,
  phaseHint,
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

/** A fully successful read set. */
function confirmed(
  overrides: {
    momentStatus?: string;
    question?: { question: ElicitationQuestion; answered: boolean } | null;
    card?: KnowledgeObject | null;
  } = {},
): MomentServerState {
  return {
    momentId: MOMENT_ID,
    momentStatus: readOk(overrides.momentStatus ?? 'approved'),
    question: readOk(overrides.question ?? null),
    card: readOk(overrides.card ?? null),
  };
}

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`TEST_DATA HTTP ${status}`);
  }
}

/** A fresh screen: nothing known locally beyond the moment's status. */
const COLD_RELOAD: DebriefState = initialStateForMoment('approved');

describe('reload restores state the client never saw happen', () => {
  it('restores answered when the stored question is answered', () => {
    const hydrated = hydrateState(
      COLD_RELOAD,
      confirmed({ question: { question: question({ status: 'answered' }), answered: true } }),
    );

    expect(hydrated.phase).toBe('answered');
    expect(isUnconfirmed(hydrated)).toBe(false);
    expect(canCompile(hydrated)).toBe(true);
    expect(canRequestQuestion(hydrated)).toBe(false);
  });

  it('restores compiled when a draft card exists', () => {
    const hydrated = hydrateState(
      COLD_RELOAD,
      confirmed({
        question: { question: question({ status: 'answered' }), answered: true },
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
      confirmed({
        question: { question: question({ status: 'answered' }), answered: true },
        card: card({ status: 'published', published_at: '2026-08-03T01:00:00.000Z' }),
      }),
    );

    expect(hydrated.phase).toBe('published');
    expect(phaseLabel(hydrated)).toBe('Published');
    expect(canPublish(hydrated)).toBe(false);
  });

  it('stays pending_debrief when the question is still open', () => {
    const hydrated = hydrateState(
      COLD_RELOAD,
      confirmed({ question: { question: question(), answered: false } }),
    );

    expect(hydrated.phase).toBe('pending_debrief');
    expect(phaseLabel(hydrated)).toBe('Waiting for your answer');
  });

  it('stays unreviewed when the moment is not approved', () => {
    const hydrated = hydrateState(
      INITIAL_DEBRIEF_STATE,
      confirmed({ momentStatus: 'proposed' }),
    );
    expect(hydrated.phase).toBe('unreviewed');
  });

  it('lets a card outrank a question row that still looks open', () => {
    const hydrated = hydrateState(
      COLD_RELOAD,
      confirmed({
        question: { question: question({ status: 'asked' }), answered: false },
        card: card({ status: 'draft' }),
      }),
    );
    expect(hydrated.phase).toBe('compiled');
  });

  it('preserves the technician’s in-progress answer while hydrating', () => {
    const typing = setDraftAnswer(COLD_RELOAD, 'TEST_DATA half-written answer');
    const hydrated = hydrateState(
      typing,
      confirmed({ question: { question: question(), answered: false } }),
    );
    expect(hydrated.draftAnswer).toBe('TEST_DATA half-written answer');
  });

  it('corrects an optimistic local phase downward on a complete read', () => {
    const optimistic: DebriefState = { ...COLD_RELOAD, phase: 'published' };
    const hydrated = hydrateState(
      optimistic,
      confirmed({ question: { question: question(), answered: false } }),
    );
    expect(hydrated.phase).toBe('pending_debrief');
  });
});

describe('a failed read is never authoritative absence', () => {
  it('does not lower the phase when the card listing fails', () => {
    const compiled: DebriefState = {
      ...COLD_RELOAD,
      phase: 'compiled',
      questionId: 'TEST_DATA-question-1',
    };

    const hydrated = hydrateState(compiled, {
      momentId: MOMENT_ID,
      momentStatus: readOk('approved'),
      question: readOk({ question: question({ status: 'answered' }), answered: true }),
      card: readFailed(new HttpError(503)),
    });

    expect(hydrated.phase).toBe('compiled');
    expect(isUnconfirmed(hydrated)).toBe(true);
  });

  it('blocks compile and publish while state is unconfirmed', () => {
    const answered: DebriefState = { ...COLD_RELOAD, phase: 'answered' };
    const hydrated = hydrateState(answered, {
      momentId: MOMENT_ID,
      momentStatus: readOk('approved'),
      question: readOk({ question: question({ status: 'answered' }), answered: true }),
      card: readFailed(new HttpError(503)),
    });

    // The phase still says "answered", but we could not confirm no card exists.
    // Compile is not idempotent, so it stays locked.
    expect(hydrated.phase).toBe('answered');
    expect(hydrated.cardUnconfirmed).toBe(true);
    expect(canCompile(hydrated)).toBe(false);
  });

  it('a failed QUESTION read does not block publishing a confirmed card', () => {
    // Only the card read gates compile/publish. Blocking publish because an
    // unrelated question lookup timed out would be the "one flag blocks
    // everything" failure this split exists to avoid.
    const compiled = hydrateState(
      { ...COLD_RELOAD, phase: 'compiled' },
      {
        momentId: MOMENT_ID,
        momentStatus: readOk('approved'),
        question: readFailed(new HttpError(503)),
        card: readOk(card()),
      },
    );

    expect(compiled.questionUnconfirmed).toBe(true);
    expect(compiled.cardUnconfirmed).toBe(false);
    expect(canPublish(compiled)).toBe(true);
  });

  it('shows the retry state', () => {
    const hydrated = hydrateState(COLD_RELOAD, {
      momentId: MOMENT_ID,
      momentStatus: readOk('approved'),
      question: readFailed(new HttpError(503)),
      card: readOk(null),
    });

    expect(phaseLabel(hydrated)).toBe('Could not confirm server state');
    expect(phaseHint(hydrated)).toMatch(/refresh to retry/i);
  });

  it('does not clear needsRefetch after an uncertain write', () => {
    // The write's outcome was already unknown; a failed read has not resolved
    // it, so the moment must stay queued for another reconciliation.
    const uncertain: DebriefState = {
      ...COLD_RELOAD,
      phase: 'answered',
      needsRefetch: true,
    };

    const hydrated = hydrateState(uncertain, {
      momentId: MOMENT_ID,
      momentStatus: readOk('approved'),
      question: readOk({ question: question({ status: 'answered' }), answered: true }),
      card: readFailed(new HttpError(503)),
    });

    expect(hydrated.needsRefetch).toBe(true);
    expect(isUnconfirmed(hydrated)).toBe(true);
  });

  it('preserves the typed draft across a failed read', () => {
    const typing = setDraftAnswer(COLD_RELOAD, 'TEST_DATA words in progress');
    const hydrated = hydrateState(typing, {
      momentId: MOMENT_ID,
      momentStatus: readOk('approved'),
      question: readFailed(new HttpError(401)),
      card: readFailed(new HttpError(401)),
    });

    expect(hydrated.draftAnswer).toBe('TEST_DATA words in progress');
  });

  it('keeps an existing question when the lookup times out', () => {
    const held = question();
    const read = readFailed<ElicitationQuestion | null>(new Error('TEST_DATA timeout'));

    expect(resolveHeldValue(read, held)).toBe(held);
  });

  it('clears a stale card when the lookup confirms there is none', () => {
    const stale = card();
    expect(resolveHeldValue(readOk<KnowledgeObject | null>(null), stale)).toBeNull();
  });

  it('preserves a stale card when the lookup fails', () => {
    const stale = card();
    const read = readFailed<KnowledgeObject | null>(new HttpError(503));

    expect(resolveHeldValue(read, stale)).toBe(stale);
  });

  it('reports the first read error for the banner', () => {
    const err = new HttpError(401);
    expect(
      firstReadError({
        momentId: MOMENT_ID,
        momentStatus: readOk('approved'),
        question: readFailed(err),
        card: readOk(null),
      }),
    ).toBe(err);
    expect(firstReadError(confirmed())).toBeNull();
  });

  it('treats a read set as confirmed only when every read succeeded', () => {
    expect(isFullyConfirmed(confirmed())).toBe(true);
    expect(
      isFullyConfirmed({
        momentId: MOMENT_ID,
        momentStatus: readOk('approved'),
        question: readOk(null),
        card: readFailed(new HttpError(503)),
      }),
    ).toBe(false);
  });
});

describe('the required failure scenarios end to end', () => {
  it('compile lands, response lost, card listing 503s: phase held, compile blocked', () => {
    const lost: DebriefState = {
      ...COLD_RELOAD,
      phase: 'answered',
      questionId: 'TEST_DATA-question-1',
      needsRefetch: true,
      block: { kind: 'error', message: 'TEST_DATA connection lost' },
    };

    const hydrated = hydrateState(lost, {
      momentId: MOMENT_ID,
      momentStatus: readOk('approved'),
      question: readOk({ question: question({ status: 'answered' }), answered: true }),
      card: readFailed(new HttpError(503)),
    });

    expect(hydrated.phase).toBe('answered');
    expect(canCompile(hydrated)).toBe(false);
    expect(hydrated.needsRefetch).toBe(true);
    expect(isUnconfirmed(hydrated)).toBe(true);
  });

  it('publish lands, hydration 401s: local state preserved, sign-in required', () => {
    const published: DebriefState = {
      ...COLD_RELOAD,
      phase: 'compiled',
      questionId: 'TEST_DATA-question-1',
      needsRefetch: true,
    };

    const hydrated = hydrateState(published, {
      momentId: MOMENT_ID,
      momentStatus: readOk('approved'),
      question: readFailed(new HttpError(401)),
      card: readFailed(new HttpError(401)),
    });

    expect(hydrated.phase).toBe('compiled');
    expect(isUnconfirmed(hydrated)).toBe(true);
    expect(hydrated.needsRefetch).toBe(true);
    expect(canPublish(hydrated)).toBe(false);
  });

  it('a later successful refresh resolves the uncertainty', () => {
    const stuck: DebriefState = {
      ...COLD_RELOAD,
      phase: 'answered',
      questionUnconfirmed: true,
      cardUnconfirmed: true,
      needsRefetch: true,
      block: { kind: 'error', message: 'Could not confirm server state — retry refresh.' },
    };

    const resolved = hydrateState(
      stuck,
      confirmed({
        question: { question: question({ status: 'answered' }), answered: true },
        card: card({ status: 'draft' }),
      }),
    );

    expect(resolved.phase).toBe('compiled');
    expect(isUnconfirmed(resolved)).toBe(false);
    expect(resolved.needsRefetch).toBe(false);
    expect(resolved.block.kind).toBe('none');
    expect(canPublish(resolved)).toBe(true);
  });

  it('a later refresh that confirms no card lowers the phase honestly', () => {
    const optimistic: DebriefState = {
      ...COLD_RELOAD,
      phase: 'compiled',
      questionUnconfirmed: true,
      cardUnconfirmed: true,
    };

    const resolved = hydrateState(
      optimistic,
      confirmed({ question: { question: question({ status: 'answered' }), answered: true } }),
    );

    expect(resolved.phase).toBe('answered');
    expect(isUnconfirmed(resolved)).toBe(false);
    expect(canCompile(resolved)).toBe(true);
  });
});

describe('fetchMomentServerState surfaces read outcomes', () => {
  function api(overrides: Partial<HydrationApi> = {}): HydrationApi {
    return {
      listRecordingMoments: jest.fn().mockImplementation(async () => [
        { id: 'TEST_DATA-m1', status: 'approved', recordingId: 'TEST_DATA-rec-1' },
        { id: 'TEST_DATA-m2', status: 'approved', recordingId: 'TEST_DATA-rec-1' },
        { id: MOMENT_ID, status: 'approved', recordingId: 'TEST_DATA-rec-1' },
      ]),
      resolveMomentQuestion: jest.fn().mockResolvedValue(null),
      listKnowledgeObjects: jest.fn().mockResolvedValue([]),
      ...overrides,
    };
  }

  it('fetches cards once for the whole batch', async () => {
    const listKnowledgeObjects = jest.fn().mockResolvedValue([]);
    await fetchMomentServerState(api({ listKnowledgeObjects }), [
      { id: 'TEST_DATA-m1', status: 'approved', recordingId: 'TEST_DATA-rec-1' },
      { id: 'TEST_DATA-m2', status: 'approved', recordingId: 'TEST_DATA-rec-1' },
    ]);
    expect(listKnowledgeObjects).toHaveBeenCalledTimes(1);
  });

  it('matches each moment to its own card and confirms absence for the rest', async () => {
    const deps = api({
      listKnowledgeObjects: jest.fn().mockResolvedValue([
        card({ id: 'TEST_DATA-card-a', moment_id: 'TEST_DATA-m1', status: 'published' }),
      ]),
    });

    const result = await fetchMomentServerState(deps, [
      { id: 'TEST_DATA-m1', status: 'approved', recordingId: 'TEST_DATA-rec-1' },
      { id: 'TEST_DATA-m2', status: 'approved', recordingId: 'TEST_DATA-rec-1' },
    ]);

    expect(result[0].card).toEqual({ ok: true, value: expect.objectContaining({ status: 'published' }) });
    // Confirmed absence, not a failed read.
    expect(result[1].card).toEqual({ ok: true, value: null });
  });

  it('marks every card read failed when the single listing call fails', async () => {
    const err = new HttpError(401);
    const deps = api({ listKnowledgeObjects: jest.fn().mockRejectedValue(err) });

    const result = await fetchMomentServerState(deps, [
      { id: 'TEST_DATA-m1', status: 'approved', recordingId: 'TEST_DATA-rec-1' },
      { id: 'TEST_DATA-m2', status: 'approved', recordingId: 'TEST_DATA-rec-1' },
    ]);

    // One 401 must not read as "the whole account has no cards".
    expect(result[0].card).toEqual({ ok: false, error: err });
    expect(result[1].card).toEqual({ ok: false, error: err });
    expect(isFullyConfirmed(result[0])).toBe(false);
  });

  it('marks only the failing moment’s question read as failed', async () => {
    const err = new Error('TEST_DATA timeout');
    const resolveMomentQuestion = jest
      .fn()
      .mockImplementation((id: string) =>
        id === 'TEST_DATA-m1' ? Promise.reject(err) : Promise.resolve(null),
      );

    const result = await fetchMomentServerState(api({ resolveMomentQuestion }), [
      { id: 'TEST_DATA-m1', status: 'approved', recordingId: 'TEST_DATA-rec-1' },
      { id: 'TEST_DATA-m2', status: 'approved', recordingId: 'TEST_DATA-rec-1' },
    ]);

    expect(result[0].question).toEqual({ ok: false, error: err });
    expect(result[1].question).toEqual({ ok: true, value: null });
  });

  it('reports a successful question read with its answered flag', async () => {
    const deps = api({
      resolveMomentQuestion: jest
        .fn()
        .mockResolvedValue({ question: question({ status: 'answered' }), answered: true }),
    });

    const [result] = await fetchMomentServerState(deps, [
      { id: MOMENT_ID, status: 'approved', recordingId: 'TEST_DATA-rec-1' },
    ]);

    expect(result.question.ok).toBe(true);
    expect(isFullyConfirmed(result)).toBe(true);
  });

  it('skips the network entirely for an empty batch', async () => {
    const listKnowledgeObjects = jest.fn().mockResolvedValue([]);
    const result = await fetchMomentServerState(api({ listKnowledgeObjects }), []);

    expect(result).toEqual([]);
    expect(listKnowledgeObjects).not.toHaveBeenCalled();
  });
});

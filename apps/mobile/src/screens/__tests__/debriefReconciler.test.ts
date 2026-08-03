/**
 * Controller-level tests for automatic reconciliation.
 *
 * The bug: the screen effect hydrated whenever `needsRefetch` was true, and a
 * failed hydration deliberately preserved `needsRefetch`. So the failure wrote
 * state, the state write re-ran the effect, and it hydrated again — an unbounded
 * request loop against a backend that is by definition already unhealthy.
 *
 * The fix is not to clear the uncertainty (that would mark a write resolved
 * exactly when we know least about it). It is to separate "unresolved" from
 * "an attempt is owed", which is what this controller tracks.
 *
 * These drive the same functions the screen uses, counting real request
 * attempts rather than inspecting rendered buttons.
 *
 * TEST_DATA only.
 */
import {
  createReconciliationController,
  nextMomentToReconcile,
} from '../debriefReconciler';
import {
  fetchMomentServerState,
  hydrateState,
  type HydrationApi,
} from '../debriefHydration';
import {
  actionFailed,
  canCompile,
  canPublish,
  canRequestQuestion,
  canSubmitAudioAnswer,
  canSubmitTypedAnswer,
  initialStateForMoment,
  isUnconfirmed,
  sessionExpired,
  setDraftAnswer,
  type DebriefState,
} from '../reviewDebriefModel';
import { AuthRequiredError } from '../../lib/authToken';
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

/**
 * A miniature of the screen: holds per-moment state, runs the same effect
 * condition, and counts the requests that actually leave.
 */
function harness(api: HydrationApi) {
  const controller = createReconciliationController();
  let state: DebriefState = initialStateForMoment('approved');

  /**
   * Hydration *is* an attempt, wherever it was triggered from — mirrors the
   * screen's bookkeeping. A confirmed read re-arms the moment; anything less
   * consumes the attempt so a failed manual refresh doesn't hand the automatic
   * effect a fresh one.
   */
  function settle(server: { question: { ok: boolean }; card: { ok: boolean } }) {
    if (server.question.ok && server.card.ok) {
      controller.resolve(MOMENT_ID);
    } else if (state.needsRefetch) {
      controller.claim(MOMENT_ID);
    }
  }

  return {
    controller,
    get state() {
      return state;
    },
    set(next: DebriefState) {
      state = next;
    },
    /** The screen's useEffect body. Returns true if a request was issued. */
    async runEffect(): Promise<boolean> {
      const momentId = nextMomentToReconcile(controller, [[MOMENT_ID, { machine: state }]]);
      if (!momentId) return false;
      controller.claim(momentId);
      const [server] = await fetchMomentServerState(api, [
        { id: MOMENT_ID, status: 'approved' },
      ]);
      state = hydrateState(state, server);
      settle(server);
      return true;
    },
    /** Pull-to-refresh re-arms every moment, then hydrates. */
    async manualRefresh(): Promise<void> {
      controller.allowRetry();
      const [server] = await fetchMomentServerState(api, [
        { id: MOMENT_ID, status: 'approved' },
      ]);
      state = hydrateState(state, server);
      settle(server);
    },
  };
}

function failingApi(error: unknown): HydrationApi & { calls: () => number } {
  let calls = 0;
  return {
    resolveMomentQuestion: async () => {
      calls += 1;
      throw error;
    },
    listKnowledgeObjects: async () => {
      calls += 1;
      throw error;
    },
    calls: () => calls,
  };
}

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`TEST_DATA HTTP ${status}`);
  }
}

describe('an uncertain write triggers exactly one automatic hydration', () => {
  it('issues one request, then stops even as state keeps updating', async () => {
    const api = failingApi(new HttpError(503));
    const h = harness(api);

    // A write whose outcome we could not observe.
    h.set(actionFailed(h.state, 'TEST_DATA connection lost', { uncertain: true }));
    expect(h.state.needsRefetch).toBe(true);

    expect(await h.runEffect()).toBe(true);
    const afterFirst = api.calls();
    expect(afterFirst).toBeGreaterThan(0);

    // The hydration failed, so the moment is still unresolved...
    expect(h.state.needsRefetch).toBe(true);
    expect(isUnconfirmed(h.state)).toBe(true);

    // ...but no further automatic request fires, no matter how many times the
    // effect re-runs. This is the loop that used to be unbounded.
    for (let i = 0; i < 10; i += 1) {
      expect(await h.runEffect()).toBe(false);
    }
    expect(api.calls()).toBe(afterFirst);
  });

  it('does not restart merely because state was updated again', async () => {
    const api = failingApi(new HttpError(503));
    const h = harness(api);
    h.set(actionFailed(h.state, 'TEST_DATA lost', { uncertain: true }));
    await h.runEffect();
    const calls = api.calls();

    // Simulate unrelated re-renders: typing in the answer box writes state on
    // every keystroke, and each write re-runs the effect.
    for (const text of ['T', 'TE', 'TES', 'TEST_DATA answer']) {
      h.set(setDraftAnswer(h.state, text));
      expect(await h.runEffect()).toBe(false);
    }

    expect(api.calls()).toBe(calls);
    // And the typing survived.
    expect(h.state.draftAnswer).toBe('TEST_DATA answer');
  });

  it('does not clear the uncertainty just to stop the loop', async () => {
    const api = failingApi(new HttpError(503));
    const h = harness(api);
    h.set(actionFailed(h.state, 'TEST_DATA lost', { uncertain: true }));
    await h.runEffect();

    // The write is still genuinely unresolved, and the state says so.
    expect(h.state.needsRefetch).toBe(true);
    expect(isUnconfirmed(h.state)).toBe(true);
  });

  it('an auth failure does not loop and preserves the typed draft', async () => {
    const api = failingApi(new AuthRequiredError());
    const h = harness(api);
    h.set(setDraftAnswer(h.state, 'TEST_DATA what I actually saw'));
    h.set(actionFailed(h.state, 'TEST_DATA lost', { uncertain: true }));

    expect(await h.runEffect()).toBe(true);
    const calls = api.calls();

    h.set(sessionExpired(h.state));
    for (let i = 0; i < 5; i += 1) {
      expect(await h.runEffect()).toBe(false);
    }

    expect(api.calls()).toBe(calls);
    expect(h.state.draftAnswer).toBe('TEST_DATA what I actually saw');
    expect(h.state.block.kind).toBe('auth');
  });
});

describe('explicit user action starts a new attempt', () => {
  it('manual refresh performs exactly one new attempt', async () => {
    const api = failingApi(new HttpError(503));
    const h = harness(api);
    h.set(actionFailed(h.state, 'TEST_DATA lost', { uncertain: true }));

    await h.runEffect();
    const afterAuto = api.calls();

    await h.manualRefresh();
    expect(api.calls()).toBeGreaterThan(afterAuto);
    const afterManual = api.calls();

    // One attempt per explicit action — the automatic effect stays quiet.
    expect(await h.runEffect()).toBe(false);
    expect(api.calls()).toBe(afterManual);
  });

  it('a per-moment retry re-arms only that moment', () => {
    const controller = createReconciliationController();
    const machine = { needsRefetch: true };

    controller.claim('TEST_DATA-m1');
    controller.claim('TEST_DATA-m2');
    expect(controller.shouldAttempt('TEST_DATA-m1', machine)).toBe(false);
    expect(controller.shouldAttempt('TEST_DATA-m2', machine)).toBe(false);

    controller.allowRetry('TEST_DATA-m1');
    expect(controller.shouldAttempt('TEST_DATA-m1', machine)).toBe(true);
    expect(controller.shouldAttempt('TEST_DATA-m2', machine)).toBe(false);
  });

  it('a later successful refresh clears the unresolved state', async () => {
    let healthy = false;
    const api: HydrationApi = {
      resolveMomentQuestion: async () =>
        healthy
          ? { question: question({ status: 'answered' }), answered: true }
          : Promise.reject(new HttpError(503)),
      listKnowledgeObjects: async () =>
        healthy ? [card({ status: 'draft' })] : Promise.reject(new HttpError(503)),
    };

    const h = harness(api);
    h.set(actionFailed(h.state, 'TEST_DATA lost', { uncertain: true }));

    await h.runEffect();
    expect(h.state.needsRefetch).toBe(true);
    expect(isUnconfirmed(h.state)).toBe(true);

    healthy = true;
    await h.manualRefresh();

    expect(h.state.needsRefetch).toBe(false);
    expect(isUnconfirmed(h.state)).toBe(false);
    expect(h.state.phase).toBe('compiled');
    expect(h.state.block.kind).toBe('none');
    expect(canPublish(h.state)).toBe(true);
  });

  it('re-arms the automatic attempt once resolved, for a future write', async () => {
    const controller = createReconciliationController();
    controller.claim(MOMENT_ID);
    expect(controller.shouldAttempt(MOMENT_ID, { needsRefetch: true })).toBe(false);

    controller.resolve(MOMENT_ID);
    expect(controller.shouldAttempt(MOMENT_ID, { needsRefetch: true })).toBe(true);
  });

  it('never attempts for a moment with no unresolved write', () => {
    const controller = createReconciliationController();
    expect(controller.shouldAttempt(MOMENT_ID, { needsRefetch: false })).toBe(false);
    expect(nextMomentToReconcile(controller, [])).toBeNull();
  });
});

describe('an unconfirmed read blocks only what depends on it', () => {
  it('question lookup failure preserves the question but blocks answering', async () => {
    const api: HydrationApi = {
      resolveMomentQuestion: async () => Promise.reject(new HttpError(503)),
      listKnowledgeObjects: async () => [],
    };

    // Start from a confirmed question the technician is answering.
    const h = harness(api);
    h.set({
      ...h.state,
      questionId: 'TEST_DATA-question-1',
      draftAnswer: 'TEST_DATA a real answer',
    });
    h.set(actionFailed(h.state, 'TEST_DATA lost', { uncertain: true }));
    await h.runEffect();

    expect(h.state.questionUnconfirmed).toBe(true);
    // The question id is preserved, not cleared...
    expect(h.state.questionId).toBe('TEST_DATA-question-1');
    // ...and so is the typed draft.
    expect(h.state.draftAnswer).toBe('TEST_DATA a real answer');
    // But nothing may act on it.
    expect(canSubmitTypedAnswer(h.state)).toBe(false);
    expect(canSubmitAudioAnswer(h.state)).toBe(false);
    expect(canRequestQuestion(h.state)).toBe(false);
  });

  it('card lookup failure blocks compile and publish but not answering', async () => {
    const api: HydrationApi = {
      resolveMomentQuestion: async () => ({ question: question(), answered: false }),
      listKnowledgeObjects: async () => Promise.reject(new HttpError(503)),
    };

    const h = harness(api);
    h.set(setDraftAnswer(h.state, 'TEST_DATA a real answer'));
    h.set(actionFailed(h.state, 'TEST_DATA lost', { uncertain: true }));
    await h.runEffect();

    expect(h.state.cardUnconfirmed).toBe(true);
    expect(h.state.questionUnconfirmed).toBe(false);
    // A valid technician answer is NOT blocked by an unrelated card outage.
    expect(canSubmitTypedAnswer(h.state)).toBe(true);
    expect(canCompile(h.state)).toBe(false);
    expect(canPublish(h.state)).toBe(false);
  });

  it('card lookup failure preserves a stale card without allowing action on it', async () => {
    const api: HydrationApi = {
      resolveMomentQuestion: async () => ({
        question: question({ status: 'answered' }),
        answered: true,
      }),
      listKnowledgeObjects: async () => Promise.reject(new HttpError(503)),
    };

    const h = harness(api);
    h.set({ ...h.state, phase: 'compiled' });
    h.set(actionFailed(h.state, 'TEST_DATA lost', { uncertain: true }));
    await h.runEffect();

    // The reviewer keeps seeing the card they were working on...
    expect(h.state.phase).toBe('compiled');
    // ...but cannot publish it until the read is confirmed.
    expect(canPublish(h.state)).toBe(false);
  });
});

/**
 * Orchestration-level tests: manual hydration must not race the automatic effect.
 *
 * The bug this covers is an ordering bug, not a logic bug, so a pure controller
 * harness cannot see it. `refresh()` re-armed the controller, then awaited a
 * moments fetch, then updated `moments` state, then hydrated. The automatic
 * effect depends on `moments`, so it ran inside that window, saw every moment as
 * still owed an attempt, and started a second hydration alongside the manual one
 * already in flight.
 *
 * These tests model the real sequence — allowRetry/claim → moments state update
 * → automatic effect evaluation → manual hydration still pending — and count the
 * requests that actually leave.
 *
 * TEST_DATA only.
 */
import { createHydrator, hydrationKey } from '../debriefSync';
import {
  createReconciliationController,
  nextMomentToReconcile,
} from '../debriefReconciler';
import { createSingleFlight } from '../singleFlight';
import { hydrateState, type HydrationApi, type MomentServerState } from '../debriefHydration';
import {
  actionFailed,
  canCompile,
  initialStateForMoment,
  isUnconfirmed,
  sessionExpired,
  setDraftAnswer,
  type DebriefState,
} from '../reviewDebriefModel';
import { isAuthenticationError, authErrorMessage } from '../../lib/authErrors';
import { LibraryApiError } from '../../api/libraryApi';
import type { ElicitationQuestion, KnowledgeObject } from '../../api/libraryApi';

const MOMENT_ID = 'TEST_DATA-moment-1';
const TARGETS = [{ id: MOMENT_ID, status: 'approved' }];

function question(overrides: Partial<ElicitationQuestion> = {}): ElicitationQuestion {
  return {
    id: 'TEST_DATA-question-1',
    moment_id: MOMENT_ID,
    question: 'TEST_DATA What told you to check there first?',
    reason: null,
    status: 'answered',
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * A miniature screen: the same hydrator, controller and single-flight the real
 * screen builds, plus the automatic effect's body.
 */
function screen(api: HydrationApi) {
  const controller = createReconciliationController();
  const flight = createSingleFlight();
  let state: DebriefState = initialStateForMoment('approved');

  const apply = (server: MomentServerState[]) => {
    for (const entry of server) {
      state = hydrateState(state, entry);
      const readError = entry.question.ok ? null : entry.question.error;
      if (isAuthenticationError(readError)) {
        state = sessionExpired(state, authErrorMessage(readError));
      }
    }
  };

  const hydrate = createHydrator({ api, controller, flight, apply });

  return {
    controller,
    get state() {
      return state;
    },
    set(next: DebriefState) {
      state = next;
    },
    hydrate,
    /** The automatic effect's body. Returns true if it issued a request. */
    runEffect(): boolean {
      const momentId = nextMomentToReconcile(controller, [[MOMENT_ID, { machine: state }]]);
      if (!momentId) return false;
      controller.claim(momentId);
      void hydrate(TARGETS);
      return true;
    },
  };
}

/** Counts calls and lets the test hold each response open. */
function gatedApi() {
  let questionCalls = 0;
  let cardCalls = 0;
  // One gate for the whole batch: `fetchMomentServerState` awaits the card read
  // and then the question read, so rotating the gate on release would leave the
  // second read waiting on a promise nothing resolves.
  let gate = deferred<void>();
  let fail: unknown = null;

  return {
    api: {
      async resolveMomentQuestion() {
        questionCalls += 1;
        await gate.promise;
        if (fail) throw fail;
        return { question: question(), answered: true };
      },
      async listKnowledgeObjects() {
        cardCalls += 1;
        await gate.promise;
        if (fail) throw fail;
        return [card()];
      },
    } as HydrationApi,
    questionCalls: () => questionCalls,
    cardCalls: () => cardCalls,
    release() {
      gate.resolve();
    },
    /** Hold the next round of reads again. */
    reset() {
      gate = deferred<void>();
    },
    failWith(error: unknown) {
      fail = error;
    },
    succeed() {
      fail = null;
    },
  };
}

describe('a manual hydration cannot be raced by the automatic effect', () => {
  it('pull-to-refresh issues exactly one request per endpoint', async () => {
    const g = gatedApi();
    const s = screen(g.api);

    // An uncertain write leaves the moment owed an automatic attempt.
    s.set(actionFailed(s.state, 'TEST_DATA lost', { uncertain: true }));

    // The manual refresh starts. The hydrator claims synchronously, so by the
    // time anything else can run, the moment is no longer owed an attempt.
    const manual = s.hydrate(TARGETS);

    // This is the exact window the bug lived in: moments state has updated and
    // the effect evaluates while the manual hydration is still pending.
    expect(s.runEffect()).toBe(false);
    expect(s.runEffect()).toBe(false);

    g.release();
    await manual;

    expect(g.questionCalls()).toBe(1);
    expect(g.cardCalls()).toBe(1);
  });

  it('the per-moment Retry causes exactly one hydration', async () => {
    const g = gatedApi();
    const s = screen(g.api);
    s.set(actionFailed(s.state, 'TEST_DATA lost', { uncertain: true }));

    const retry = s.hydrate(TARGETS);
    expect(s.runEffect()).toBe(false);

    g.release();
    await retry;

    expect(g.questionCalls()).toBe(1);
    expect(g.cardCalls()).toBe(1);
  });

  it('collapses two overlapping manual hydrations of the same batch', async () => {
    const g = gatedApi();
    const s = screen(g.api);

    const first = s.hydrate(TARGETS);
    const second = s.hydrate(TARGETS);

    g.release();
    await Promise.all([first, second]);

    // A double pull-to-refresh must not double the load on a backend that may
    // already be struggling.
    expect(g.questionCalls()).toBe(1);
    expect(g.cardCalls()).toBe(1);
  });

  it('keeps the attempt consumed when the manual hydration fails', async () => {
    const g = gatedApi();
    g.failWith(new LibraryApiError('TEST_DATA 503', 503));
    const s = screen(g.api);
    s.set(actionFailed(s.state, 'TEST_DATA lost', { uncertain: true }));

    const manual = s.hydrate(TARGETS);
    g.release();
    await manual;

    expect(isUnconfirmed(s.state)).toBe(true);
    expect(s.state.needsRefetch).toBe(true);
    // Still consumed — nothing fires again on its own.
    expect(s.runEffect()).toBe(false);
    expect(g.questionCalls()).toBe(1);
  });

  it('re-arms after a fully successful hydration', async () => {
    const g = gatedApi();
    const s = screen(g.api);
    s.set(actionFailed(s.state, 'TEST_DATA lost', { uncertain: true }));

    const manual = s.hydrate(TARGETS);
    g.release();
    await manual;

    expect(s.state.needsRefetch).toBe(false);
    expect(isUnconfirmed(s.state)).toBe(false);

    // A *later* uncertain write gets its own automatic attempt.
    s.set(actionFailed(s.state, 'TEST_DATA lost again', { uncertain: true }));
    expect(s.runEffect()).toBe(true);
  });

  it('keys the flight by batch so different batches do not collapse', () => {
    expect(hydrationKey([{ id: 'b', status: 'approved' }, { id: 'a', status: 'approved' }])).toBe(
      hydrationKey([{ id: 'a', status: 'approved' }, { id: 'b', status: 'approved' }]),
    );
    expect(hydrationKey([{ id: 'a', status: 'approved' }])).not.toBe(
      hydrationKey([{ id: 'b', status: 'approved' }]),
    );
  });
});

describe('backend 401/403 during hydration is an auth failure, not a retry error', () => {
  it('shows the signed-out state for a LibraryApiError 401 and keeps the draft', async () => {
    const g = gatedApi();
    g.failWith(new LibraryApiError('TEST_DATA 401', 401));
    const s = screen(g.api);
    s.set(setDraftAnswer(s.state, 'TEST_DATA what I actually saw'));

    const manual = s.hydrate(TARGETS);
    g.release();
    await manual;

    // Not an ordinary "couldn't reach the server" error — retrying can't fix
    // an expired token.
    expect(s.state.block.kind).toBe('auth');
    expect(s.state.draftAnswer).toBe('TEST_DATA what I actually saw');
  });

  it('shows the signed-out state for a 403 with its own wording', async () => {
    const g = gatedApi();
    g.failWith(new LibraryApiError('TEST_DATA 403', 403));
    const s = screen(g.api);

    const manual = s.hydrate(TARGETS);
    g.release();
    await manual;

    expect(s.state.block.kind).toBe('auth');
    if (s.state.block.kind === 'auth') {
      expect(s.state.block.message).toMatch(/signed-in technician/i);
    }
  });

  it('an uncertain write followed by a 401 hydration stays unresolved', async () => {
    const g = gatedApi();
    g.failWith(new LibraryApiError('TEST_DATA 401', 401));
    const s = screen(g.api);
    s.set(setDraftAnswer(s.state, 'TEST_DATA real words'));
    // Pretend a publish went out and the response was lost.
    s.set(actionFailed(s.state, 'TEST_DATA lost', { uncertain: true }));

    const manual = s.hydrate(TARGETS);
    g.release();
    await manual;

    // Failing to authenticate says nothing about whether the publish landed.
    expect(s.state.needsRefetch).toBe(true);
    expect(s.state.block.kind).toBe('auth');
    expect(s.state.draftAnswer).toBe('TEST_DATA real words');
    expect(canCompile(s.state)).toBe(false);
  });

  it('clears both flags after reauthentication and a successful hydration', async () => {
    const g = gatedApi();
    g.failWith(new LibraryApiError('TEST_DATA 401', 401));
    const s = screen(g.api);
    s.set(actionFailed(s.state, 'TEST_DATA lost', { uncertain: true }));

    const failed = s.hydrate(TARGETS);
    g.release();
    await failed;
    expect(s.state.needsRefetch).toBe(true);
    expect(s.state.block.kind).toBe('auth');

    // The technician signs back in and pulls to refresh.
    g.succeed();
    const recovered = s.hydrate(TARGETS);
    g.release();
    await recovered;

    expect(s.state.needsRefetch).toBe(false);
    expect(isUnconfirmed(s.state)).toBe(false);
    expect(s.state.block.kind).toBe('none');
    // Restored from authoritative server state, not from local memory.
    expect(s.state.phase).toBe('compiled');
  });

  it('a 503 is still an ordinary retry error, not a sign-out', async () => {
    const g = gatedApi();
    g.failWith(new LibraryApiError('TEST_DATA 503', 503));
    const s = screen(g.api);

    const manual = s.hydrate(TARGETS);
    g.release();
    await manual;

    expect(s.state.block.kind).toBe('error');
    expect(isUnconfirmed(s.state)).toBe(true);
  });
});

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
import {
  firstReadError,
  hydrateState,
  type HydrationApi,
  type MomentServerState,
} from '../debriefHydration';
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
import { isUncertainOutcome } from '../debriefFailure';
import { LibraryApiError } from '../../api/libraryApi';
import type { ElicitationQuestion, KnowledgeObject } from '../../api/libraryApi';

const MOMENT_ID = 'TEST_DATA-moment-1';
const RECORDING_ID = 'TEST_DATA-recording-1';
const TARGETS = [{ id: MOMENT_ID, status: 'approved', recordingId: RECORDING_ID }];

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

  let applyCount = 0;
  const apply = (server: MomentServerState[]) => {
    applyCount += 1;
    // This harness holds state for a single moment; a batch may legitimately
    // carry siblings, and those must not be folded into it.
    for (const entry of server.filter((item) => item.momentId === MOMENT_ID)) {
      state = hydrateState(state, entry);
      // Same classification the screen uses — any failed read, moment status
      // included, not just the question.
      const readError = firstReadError(entry);
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
    /**
     * A write failed — mirrors the screen: classify the outcome, open a new
     * reconciliation generation when it is genuinely uncertain, then record it.
     */
    failWrite(error: unknown) {
      const uncertain = isUncertainOutcome(error);
      if (uncertain) controller.beginGeneration(MOMENT_ID);
      state = actionFailed(state, 'TEST_DATA write failed', { uncertain });
    },
    hydrate,
    applyCount: () => applyCount,
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
  let momentFail: unknown = null;
  let momentStatus = 'approved';
  let questionValue: { question: ElicitationQuestion; answered: boolean } | null = {
    question: question(),
    answered: true,
  };
  let cardValues: KnowledgeObject[] = [card()];

  return {
    api: {
      async listRecordingMoments() {
        await gate.promise;
        if (momentFail) throw momentFail;
        if (fail) throw fail;
        return [{ id: MOMENT_ID, status: momentStatus } as never];
      },
      async resolveMomentQuestion() {
        questionCalls += 1;
        await gate.promise;
        if (fail) throw fail;
        return questionValue;
      },
      async listKnowledgeObjects() {
        cardCalls += 1;
        await gate.promise;
        if (fail) throw fail;
        return cardValues;
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
    /** Fail only the moment-status read. */
    failMomentsWith(error: unknown) {
      momentFail = error;
    },
    setMomentStatus(status: string) {
      momentStatus = status;
    },
    setQuestion(value: { question: ElicitationQuestion; answered: boolean } | null) {
      questionValue = value;
    },
    setCards(values: KnowledgeObject[]) {
      cardValues = values;
    },
    /** Nothing debriefed yet: no question, no card. */
    setBare() {
      questionValue = null;
      cardValues = [];
    },
    succeed() {
      fail = null;
      momentFail = null;
    },
  };
}

describe('a manual hydration cannot be raced by the automatic effect', () => {
  it('pull-to-refresh issues exactly one request per endpoint', async () => {
    const g = gatedApi();
    const s = screen(g.api);

    // An uncertain write leaves the moment owed an automatic attempt.
    s.failWrite(new LibraryApiError('TEST_DATA lost', 503));

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
    s.failWrite(new LibraryApiError('TEST_DATA lost', 503));

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
    s.failWrite(new LibraryApiError('TEST_DATA lost', 503));

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
    s.failWrite(new LibraryApiError('TEST_DATA lost', 503));

    const manual = s.hydrate(TARGETS);
    g.release();
    await manual;

    expect(s.state.needsRefetch).toBe(false);
    expect(isUnconfirmed(s.state)).toBe(false);

    // A *later* uncertain write gets its own automatic attempt.
    s.failWrite(new LibraryApiError('TEST_DATA lost again', 503));
    expect(s.runEffect()).toBe(true);
  });

  it('keys the flight by batch so different batches do not collapse', () => {
    expect(hydrationKey([{ id: 'b', status: 'approved', recordingId: RECORDING_ID }, { id: 'a', status: 'approved', recordingId: RECORDING_ID }])).toBe(
      hydrationKey([{ id: 'a', status: 'approved', recordingId: RECORDING_ID }, { id: 'b', status: 'approved', recordingId: RECORDING_ID }]),
    );
    expect(hydrationKey([{ id: 'a', status: 'approved', recordingId: RECORDING_ID }])).not.toBe(
      hydrationKey([{ id: 'b', status: 'approved', recordingId: RECORDING_ID }]),
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
    s.failWrite(new LibraryApiError('TEST_DATA lost', 503));

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
    s.failWrite(new LibraryApiError('TEST_DATA lost', 503));

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

describe('attempts belong to an uncertain-write generation', () => {
  it('a failed ordinary hydration does not starve a later uncertain write', async () => {
    // The exact regression: routine initial-load hydration claims the moment
    // while needsRefetch is false. If that claim were permanent, the genuinely
    // uncertain write that follows would silently get no reconciliation at all.
    const g = gatedApi();
    g.failWith(new LibraryApiError('TEST_DATA 503', 503));
    const s = screen(g.api);

    const initial = s.hydrate(TARGETS);
    g.release();
    await initial;
    expect(s.state.needsRefetch).toBe(false); // nothing was uncertain yet

    // Now an answer/compile/publish response is lost.
    s.failWrite(new LibraryApiError('TEST_DATA lost', 503));
    expect(s.state.needsRefetch).toBe(true);

    // Exactly one automatic reconciliation for the new write.
    expect(s.runEffect()).toBe(true);
    // ...and it does not loop after failing.
    expect(s.runEffect()).toBe(false);
    expect(s.runEffect()).toBe(false);
  });

  it('gives two separate uncertain writes one attempt each', async () => {
    const g = gatedApi();
    g.failWith(new LibraryApiError('TEST_DATA 503', 503));
    const s = screen(g.api);

    s.failWrite(new LibraryApiError('TEST_DATA lost 1', 503));
    expect(s.runEffect()).toBe(true);
    expect(s.runEffect()).toBe(false);

    // A second uncertain write opens its own generation.
    s.failWrite(new LibraryApiError('TEST_DATA lost 2', 503));
    expect(s.runEffect()).toBe(true);
    expect(s.runEffect()).toBe(false);
  });

  it.each([
    ['401', 401],
    ['403', 403],
    ['422', 422],
  ])('does not open a generation for an ordinary %s rejection', async (_label, status) => {
    const g = gatedApi();
    const s = screen(g.api);

    s.failWrite(new LibraryApiError(`TEST_DATA ${status}`, status));

    // The server considered the request and refused it — nothing was written,
    // so there is nothing to reconcile and no attempt is owed.
    expect(s.state.needsRefetch).toBe(false);
    expect(s.runEffect()).toBe(false);
  });
});

describe('moment status is read from the backend, not from local state', () => {
  it('restores pending_debrief when an approval landed but the response was lost', async () => {
    // Local status is still `proposed` — the value that is wrong here.
    const g = gatedApi();
    g.setBare();
    g.setMomentStatus('approved');
    const s = screen(g.api);
    s.set({ ...s.state, phase: 'unreviewed' });
    s.failWrite(new LibraryApiError('TEST_DATA lost', 503));

    const manual = s.hydrate([
      { id: MOMENT_ID, status: 'proposed', recordingId: RECORDING_ID },
    ]);
    g.release();
    await manual;

    expect(s.state.phase).toBe('pending_debrief');
    expect(s.state.needsRefetch).toBe(false);
  });

  it('restores unreviewed when the approval never landed', async () => {
    const g = gatedApi();
    g.setBare();
    g.setMomentStatus('proposed');
    const s = screen(g.api);
    s.set({ ...s.state, phase: 'pending_debrief' });

    const manual = s.hydrate([
      { id: MOMENT_ID, status: 'proposed', recordingId: RECORDING_ID },
    ]);
    g.release();
    await manual;

    expect(s.state.phase).toBe('unreviewed');
  });

  it('reports approved even when question generation has not completed', async () => {
    const g = gatedApi();
    g.setBare(); // no question drafted yet, no card
    g.setMomentStatus('approved');
    const s = screen(g.api);

    const manual = s.hydrate(TARGETS);
    g.release();
    await manual;

    expect(s.state.phase).toBe('pending_debrief');
  });

  it('preserves the phase and the attempt when the status read 503s', async () => {
    const g = gatedApi();
    g.setBare();
    const s = screen(g.api);
    s.set({ ...s.state, phase: 'pending_debrief' });
    s.failWrite(new LibraryApiError('TEST_DATA lost', 503));

    g.failMomentsWith(new LibraryApiError('TEST_DATA 503', 503));
    const manual = s.hydrate(TARGETS);
    g.release();
    await manual;

    // A failed status read is not "unchanged" and not "proposed".
    expect(s.state.phase).toBe('pending_debrief');
    expect(s.state.needsRefetch).toBe(true);
    expect(s.state.questionUnconfirmed).toBe(true);
    // Only the current generation's attempt was consumed — no loop.
    expect(s.runEffect()).toBe(false);
  });

  it('produces the auth state on a 401 moment read and keeps the write unresolved', async () => {
    const g = gatedApi();
    const s = screen(g.api);
    s.set(setDraftAnswer(s.state, 'TEST_DATA real words'));
    s.failWrite(new LibraryApiError('TEST_DATA lost', 503));

    g.failMomentsWith(new LibraryApiError('TEST_DATA 401', 401));
    const manual = s.hydrate(TARGETS);
    g.release();
    await manual;

    expect(s.state.block.kind).toBe('auth');
    expect(s.state.needsRefetch).toBe(true);
    expect(s.state.draftAnswer).toBe('TEST_DATA real words');
  });
});

describe('overlapping hydrations never apply stale results', () => {
  it('an older batch response does not overwrite a newer per-moment Retry', async () => {
    // [A, B] full refresh and [A] Retry have different flight keys, so both run.
    // The batch is slower and carries an older view of the moment.
    const batchGate = deferred<void>();
    const retryGate = deferred<void>();
    let momentCall = 0;

    const api: HydrationApi = {
      async listRecordingMoments() {
        const index = momentCall;
        momentCall += 1;
        await (index === 0 ? batchGate.promise : retryGate.promise);
        // Call 0 is the batch and reports the stale pre-approval status.
        return [
          { id: MOMENT_ID, status: index === 0 ? 'proposed' : 'approved' } as never,
        ];
      },
      async resolveMomentQuestion() {
        return null;
      },
      async listKnowledgeObjects() {
        return [];
      },
    };

    const s = screen(api);
    s.set({ ...s.state, phase: 'unreviewed' });

    const batch = s.hydrate([
      { id: MOMENT_ID, status: 'proposed', recordingId: RECORDING_ID },
      { id: 'TEST_DATA-moment-2', status: 'proposed', recordingId: RECORDING_ID },
    ]);

    // Let the batch reach its moment-status read, so call ordering is not a
    // matter of microtask luck.
    await new Promise((resolve) => setImmediate(resolve));
    expect(momentCall).toBe(1);

    const retry = s.hydrate(TARGETS);
    await new Promise((resolve) => setImmediate(resolve));
    expect(momentCall).toBe(2);

    // The newer Retry finishes FIRST and writes the authoritative answer.
    retryGate.resolve();
    await retry;
    expect(s.state.phase).toBe('pending_debrief');

    // The older batch response arrives afterwards carrying stale data.
    batchGate.resolve();
    await batch;

    // It must not roll the moment back to the pre-approval view.
    expect(s.state.phase).toBe('pending_debrief');
  });
});

describe('identical-batch hydrations share one result without losing it', () => {
  it('applies the shared response exactly once, by the newest caller', async () => {
    const g = gatedApi();
    g.setBare();
    g.setMomentStatus('approved');
    const s = screen(g.api);
    s.set({ ...s.state, phase: 'unreviewed' });

    // Two hydrations of the *identical* batch. SingleFlight hands the second
    // caller the first caller's promise and never runs its callback — so if
    // filtering lived inside the flight, the only callback that ran would be
    // the older one, which would then discard everything and nobody would
    // apply the response at all.
    const first = s.hydrate(TARGETS);
    const second = s.hydrate(TARGETS);

    g.release();
    await Promise.all([first, second]);

    // One request per endpoint...
    expect(g.questionCalls()).toBe(1);
    expect(g.cardCalls()).toBe(1);
    // ...applied exactly once...
    expect(s.applyCount()).toBe(1);
    // ...and the authoritative state actually landed.
    expect(s.state.phase).toBe('pending_debrief');
  });

  it('resolves the reconciliation generation on a fully confirmed shared result', async () => {
    const g = gatedApi();
    g.setBare();
    g.setMomentStatus('approved');
    const s = screen(g.api);
    s.failWrite(new LibraryApiError('TEST_DATA lost', 503));

    const first = s.hydrate(TARGETS);
    const second = s.hydrate(TARGETS);
    g.release();
    await Promise.all([first, second]);

    expect(s.state.needsRefetch).toBe(false);
    expect(isUnconfirmed(s.state)).toBe(false);
    // A later uncertain write gets a fresh generation and its own attempt.
    s.failWrite(new LibraryApiError('TEST_DATA lost again', 503));
    expect(s.runEffect()).toBe(true);
  });

  it('leaves the generation consumed when the shared result fails', async () => {
    const g = gatedApi();
    g.failWith(new LibraryApiError('TEST_DATA 503', 503));
    const s = screen(g.api);
    s.failWrite(new LibraryApiError('TEST_DATA lost', 503));

    const first = s.hydrate(TARGETS).catch(() => undefined);
    const second = s.hydrate(TARGETS).catch(() => undefined);
    g.release();
    await Promise.all([first, second]);

    expect(s.state.needsRefetch).toBe(true);
    // Both callers claimed; nothing fires again on its own.
    expect(s.runEffect()).toBe(false);
    expect(g.questionCalls()).toBe(1);
  });
});

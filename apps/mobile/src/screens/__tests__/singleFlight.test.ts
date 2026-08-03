/**
 * Concurrency tests for the debrief loop's mutex.
 *
 * These invoke the same action twice *before the first promise resolves* — the
 * case React state cannot defend against, because `action: 'answering'` only
 * becomes visible after a re-render. Every assertion here is about the number of
 * API mutations that actually happened, not about whether a button eventually
 * looked disabled.
 *
 * The compile endpoint is the sharpest case: act-api creates a new
 * KnowledgeObject row on every call, so two concurrent compiles mean two cards
 * for one moment.
 *
 * TEST_DATA only.
 */
import { createSingleFlight, flightKey } from '../singleFlight';
import { loadOrCreateMomentQuestion } from '../../api/libraryApi';

const MOMENT_ID = 'TEST_DATA-moment-1';

/** A promise the test resolves by hand, so both callers are in flight at once. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('single-flight collapses concurrent calls to one', () => {
  it('runs the work once when two callers race on the same key', async () => {
    const flight = createSingleFlight();
    const gate = deferred<string>();
    const work = jest.fn().mockReturnValue(gate.promise);
    const key = flightKey(MOMENT_ID, 'answering');

    // Both dispatched before anything resolves — the real double-tap.
    const first = flight.run(key, work);
    const second = flight.run(key, work);

    expect(work).toHaveBeenCalledTimes(1);

    gate.resolve('ok');
    await expect(first).resolves.toBe('ok');
    await expect(second).resolves.toBe('ok');
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('claims the key synchronously, before the first await', () => {
    const flight = createSingleFlight();
    const key = flightKey(MOMENT_ID, 'compiling');

    expect(flight.isBusy(key)).toBe(false);
    void flight.run(key, () => deferred<void>().promise);
    // No await in between: this is the window a re-render would have missed.
    expect(flight.isBusy(key)).toBe(true);
  });

  it('releases the key after success so a legitimate retry works', async () => {
    const flight = createSingleFlight();
    const key = flightKey(MOMENT_ID, 'compiling');
    const work = jest.fn().mockResolvedValue('done');

    await flight.run(key, work);
    expect(flight.isBusy(key)).toBe(false);

    await flight.run(key, work);
    expect(work).toHaveBeenCalledTimes(2);
  });

  it('releases the key after a rejection', async () => {
    const flight = createSingleFlight();
    const key = flightKey(MOMENT_ID, 'publishing');

    await expect(
      flight.run(key, () => Promise.reject(new Error('TEST_DATA failed'))),
    ).rejects.toThrow('TEST_DATA failed');

    expect(flight.isBusy(key)).toBe(false);
    expect(flight.size()).toBe(0);
  });

  it('releases the key when the work throws synchronously', async () => {
    const flight = createSingleFlight();
    const key = flightKey(MOMENT_ID, 'approving');

    await expect(
      flight.run(key, () => {
        throw new Error('TEST_DATA sync throw');
      }),
    ).rejects.toThrow('TEST_DATA sync throw');

    expect(flight.isBusy(key)).toBe(false);
  });

  it('keeps different actions on one moment independent', () => {
    const flight = createSingleFlight();
    void flight.run(flightKey(MOMENT_ID, 'answering'), () => deferred<void>().promise);

    expect(flight.isBusy(flightKey(MOMENT_ID, 'answering'))).toBe(true);
    expect(flight.isBusy(flightKey(MOMENT_ID, 'compiling'))).toBe(false);
  });

  it('keeps the same action on different moments independent', () => {
    const flight = createSingleFlight();
    void flight.run(flightKey('TEST_DATA-m1', 'compiling'), () => deferred<void>().promise);

    expect(flight.isBusy(flightKey('TEST_DATA-m1', 'compiling'))).toBe(true);
    expect(flight.isBusy(flightKey('TEST_DATA-m2', 'compiling'))).toBe(false);
    expect(flight.size()).toBe(1);
  });
});

describe('each guarded action fans out to exactly one mutation', () => {
  /** Mirrors the screen's `guarded` helper. */
  function guard(flight: ReturnType<typeof createSingleFlight>) {
    return (momentId: string, action: string, fn: () => Promise<unknown>) => {
      const key = flightKey(momentId, action);
      if (flight.isBusy(key)) return Promise.resolve(undefined);
      return flight.run(key, fn);
    };
  }

  it.each([
    ['approving', 'PATCH /moments/{id}'],
    ['questioning', 'POST /moments/{id}/questions'],
    ['answering', 'POST /questions/{id}/answers'],
    ['compiling', 'POST /moments/{id}/compile'],
    ['publishing', 'POST /knowledge-objects/{id}/publish'],
  ])('double-tapping %s issues one %s', async (action) => {
    const flight = createSingleFlight();
    const guarded = guard(flight);
    const gate = deferred<void>();
    const mutate = jest.fn().mockReturnValue(gate.promise);

    const first = guarded(MOMENT_ID, action, mutate);
    const second = guarded(MOMENT_ID, action, mutate);

    expect(mutate).toHaveBeenCalledTimes(1);

    gate.resolve();
    await Promise.all([first, second]);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('collapses a burst of five taps to one mutation', async () => {
    const flight = createSingleFlight();
    const guarded = guard(flight);
    const gate = deferred<void>();
    const mutate = jest.fn().mockReturnValue(gate.promise);

    const taps = Array.from({ length: 5 }, () => guarded(MOMENT_ID, 'compiling', mutate));
    expect(mutate).toHaveBeenCalledTimes(1);

    gate.resolve();
    await Promise.all(taps);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('audio and typed answers share one lock, so they cannot both submit', async () => {
    const flight = createSingleFlight();
    const guarded = guard(flight);
    const gate = deferred<void>();
    const typed = jest.fn().mockReturnValue(gate.promise);
    const audio = jest.fn().mockReturnValue(gate.promise);

    const a = guarded(MOMENT_ID, 'answering', typed);
    const b = guarded(MOMENT_ID, 'answering', audio);

    expect(typed).toHaveBeenCalledTimes(1);
    expect(audio).not.toHaveBeenCalled();

    gate.resolve();
    await Promise.all([a, b]);
  });
});

describe('concurrent question loads issue exactly one POST', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const DRAFTED_QUESTION = {
    id: 'TEST_DATA-question-1',
    moment_id: MOMENT_ID,
    question: 'TEST_DATA What told you to check there first?',
    reason: null,
    status: 'proposed',
    asked_at: null,
    created_at: '2026-08-03T00:00:00.000Z',
  };

  function jsonResponse(body: unknown) {
    return {
      ok: true,
      status: 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  }

  it('creates one question, not two, when the button is double-tapped', async () => {
    // No question exists yet, so an unguarded double tap would POST twice and
    // leave the moment with two competing questions.
    const fetchMock = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return Promise.resolve(jsonResponse(DRAFTED_QUESTION));
      return Promise.resolve(jsonResponse([]));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const flight = createSingleFlight();
    const key = flightKey(MOMENT_ID, 'questioning');
    const load = () => flight.run(key, () => loadOrCreateMomentQuestion(MOMENT_ID));

    const [a, b] = await Promise.all([load(), load()]);

    const posts = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === 'POST',
    );
    expect(posts).toHaveLength(1);
    expect(a.question.id).toBe('TEST_DATA-question-1');
    expect(b.question.id).toBe('TEST_DATA-question-1');
  });

  it('issues no POST at all when an answered question already exists', async () => {
    const answered = { ...DRAFTED_QUESTION, status: 'answered' };
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse([answered]));
    global.fetch = fetchMock as unknown as typeof fetch;

    const flight = createSingleFlight();
    const key = flightKey(MOMENT_ID, 'questioning');
    const load = () => flight.run(key, () => loadOrCreateMomentQuestion(MOMENT_ID));

    const [a, b] = await Promise.all([load(), load()]);

    const posts = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === 'POST',
    );
    expect(posts).toHaveLength(0);
    expect(a.answered).toBe(true);
    expect(b.answered).toBe(true);
  });
});

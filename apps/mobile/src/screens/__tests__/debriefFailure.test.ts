/**
 * One classifier decides whether a failed write's outcome is uncertain.
 *
 * Two things depend on that answer and must never disagree: the machine's
 * `needsRefetch` (set through `applyFailure`) and the reconciliation
 * controller's decision to open a new generation. When they were computed
 * separately, a moment could be marked unresolved with nobody scheduled to
 * resolve it, or scheduled for reconciliation after a failure that plainly
 * wrote nothing.
 *
 * TEST_DATA only.
 */
import { applyFailure, errorMessage, isUncertainOutcome } from '../debriefFailure';
import { INITIAL_DEBRIEF_STATE, type DebriefState } from '../reviewDebriefModel';
import { AuthRequiredError } from '../../lib/authToken';
import { LibraryApiError } from '../../api/libraryApi';

/** A moment mid-loop with no outstanding write. */
const BASE: DebriefState = {
  ...INITIAL_DEBRIEF_STATE,
  phase: 'pending_debrief',
  questionId: 'TEST_DATA-question-1',
  draftAnswer: 'TEST_DATA real technician words',
};

const CASES: [string, unknown, boolean][] = [
  // Nothing left the device — there is no write to reconcile.
  ['local AuthRequiredError', new AuthRequiredError(), false],
  // The server considered each of these and refused; no partial write stands.
  ['401', new LibraryApiError('TEST_DATA 401', 401), false],
  ['403', new LibraryApiError('TEST_DATA 403', 403), false],
  ['404', new LibraryApiError('TEST_DATA 404', 404), false],
  ['409', new LibraryApiError('TEST_DATA 409', 409), false],
  ['422', new LibraryApiError('TEST_DATA 422', 422), false],
  // May have committed before the failure or the lost response.
  ['500', new LibraryApiError('TEST_DATA 500', 500), true],
  ['503', new LibraryApiError('TEST_DATA 503', 503), true],
  ['network error', new Error('TEST_DATA network request failed'), true],
];

describe('applyFailure and isUncertainOutcome agree', () => {
  it.each(CASES)('%s', (_label, error, uncertain) => {
    expect(isUncertainOutcome(error)).toBe(uncertain);
    // The single source of truth reaches the machine: `needsRefetch` is set
    // exactly when the classifier says the outcome is unknown.
    expect(applyFailure(BASE, error).needsRefetch).toBe(uncertain);
  });

  it.each(CASES)('%s never discards the typed answer', (_label, error) => {
    expect(applyFailure(BASE, error).draftAnswer).toBe(
      'TEST_DATA real technician words',
    );
  });

  it.each(CASES)('%s always leaves the moment idle', (_label, error) => {
    expect(applyFailure({ ...BASE, action: 'compiling' }, error).action).toBe('idle');
  });
});

describe('specialized handling survives the shared classifier', () => {
  it('401 and 403 still produce the auth state', () => {
    expect(applyFailure(BASE, new LibraryApiError('TEST_DATA', 401)).block.kind).toBe('auth');
    expect(applyFailure(BASE, new LibraryApiError('TEST_DATA', 403)).block.kind).toBe('auth');
    expect(applyFailure(BASE, new AuthRequiredError()).block.kind).toBe('auth');
  });

  it('403 keeps its own wording', () => {
    const block = applyFailure(BASE, new LibraryApiError('TEST_DATA', 403)).block;
    expect(block.kind === 'auth' && block.message).toMatch(/signed-in technician/i);
  });

  it('422 still produces the rejection state with its reason', () => {
    const rejected = applyFailure(
      BASE,
      LibraryApiError.fromResponse(
        'POST /questions/x/answers',
        422,
        JSON.stringify({
          detail: 'answer rejected (expert_answer_echoes_prompt): …',
        }),
      ),
    );

    expect(rejected.block.kind).toBe('rejected');
    expect(rejected.needsRefetch).toBe(false);
    // The question stays open so the technician can edit and resubmit.
    expect(rejected.phase).toBe('pending_debrief');
  });

  it('an auth failure preserves an already-unresolved write', () => {
    const uncertain = { ...BASE, needsRefetch: true };
    expect(applyFailure(uncertain, new LibraryApiError('TEST_DATA', 401)).needsRefetch).toBe(
      true,
    );
  });

  it('5xx marks the write uncertain and reports the backend detail', () => {
    const failed = applyFailure(
      BASE,
      LibraryApiError.fromResponse('POST /compile', 503, JSON.stringify({ detail: 'upstream down' })),
    );
    expect(failed.needsRefetch).toBe(true);
    expect(failed.block.kind === 'error' && failed.block.message).toBe('upstream down');
  });
});

describe('errorMessage', () => {
  it('prefers the backend detail over the transport string', () => {
    const err = LibraryApiError.fromResponse(
      'POST /x',
      500,
      JSON.stringify({ detail: 'TEST_DATA backend said this' }),
    );
    expect(errorMessage(err, 'fallback')).toBe('TEST_DATA backend said this');
  });

  it('falls back for a non-Error value', () => {
    expect(errorMessage(null, 'TEST_DATA fallback')).toBe('TEST_DATA fallback');
  });
});

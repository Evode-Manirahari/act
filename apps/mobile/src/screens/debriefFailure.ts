/**
 * Classifying a failed write: did it maybe land, or definitely not?
 *
 * This single question drives two things that must never disagree — whether the
 * machine records the write as unresolved (`needsRefetch`), and whether the
 * reconciliation controller opens a new generation owed an automatic attempt.
 * When those two drifted apart, a moment could be marked unresolved with nobody
 * ever scheduled to resolve it, or scheduled for reconciliation after a failure
 * that plainly wrote nothing.
 *
 * The rule: a request the server *rejected* did not write anything, so there is
 * nothing to reconcile. A request that failed in transit, or blew up inside the
 * server after it may already have committed, leaves the outcome genuinely
 * unknown.
 */
import { LibraryApiError } from '../api/libraryApi';
import { AuthRequiredError } from '../lib/authToken';
import { authErrorMessage, isAuthenticationError } from '../lib/authErrors';
import {
  actionFailed,
  answerRejected,
  sessionExpired,
  type DebriefState,
} from './reviewDebriefModel';

/** Statuses that mean "the server considered this request and refused it". */
function isDefiniteRejection(status: number): boolean {
  // 4xx: validation (422), auth (401/403), scoping (404), conflict (409).
  // The server reached a decision, so no partial write is outstanding.
  return status >= 400 && status < 500;
}

/**
 * True when the write's outcome is unknown and needs reconciling against the
 * server.
 *
 * `AuthRequiredError` is thrown *before* anything is sent, so it is never
 * uncertain — nothing left the device.
 */
export function isUncertainOutcome(error: unknown): boolean {
  if (error instanceof AuthRequiredError) return false;

  const status = statusOf(error);
  if (status === null) {
    // No status at all: a network-shaped failure. The request may well have
    // reached the server and committed before the connection dropped.
    return true;
  }
  return !isDefiniteRejection(status);
}

function statusOf(error: unknown): number | null {
  if (error instanceof Error) {
    const status = (error as Error & { status?: unknown }).status;
    if (typeof status === 'number') return status;
  }
  return null;
}

/** Prefer the backend's own explanation over the transport-level string. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof AuthRequiredError) return error.message;
  if (error instanceof LibraryApiError) return error.detail ?? error.message;
  return error instanceof Error ? error.message : fallback;
}

/**
 * Map a thrown error onto the machine without inventing a success.
 *
 * Uncertainty comes from `isUncertainOutcome` — the same call the screen uses
 * to decide whether to open a new reconciliation generation. When these were
 * computed separately they could disagree, and a moment could end up marked
 * unresolved with nobody scheduled to resolve it (or scheduled after a failure
 * that plainly wrote nothing).
 */
export function applyFailure(state: DebriefState, error: unknown): DebriefState {
  // An expired or rejected session is actionable (sign in) rather than
  // "try again", so it is named specifically. `sessionExpired` preserves
  // `needsRefetch`: failing to authenticate says nothing about whether an
  // earlier write landed.
  if (isAuthenticationError(error)) {
    return sessionExpired(state, authErrorMessage(error));
  }

  // The backend refused the text as not-human-authored. The question stays
  // open and the typed answer stays editable.
  if (error instanceof LibraryApiError && error.status === 422) {
    return answerRejected(state, error.reason, error.detail);
  }

  return actionFailed(state, errorMessage(error, 'Action failed'), {
    uncertain: isUncertainOutcome(error),
  });
}

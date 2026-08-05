/**
 * One place that decides whether a failure means "you are not signed in".
 *
 * `AuthRequiredError` only covers the case the client catches *before* sending:
 * the gate is configured and there is no token at all. A token that exists
 * locally but has expired or been revoked sails past that check, reaches
 * act-api, and comes back as an ordinary API error carrying 401 or 403.
 *
 * Those are the same situation for the person holding the phone, and they must
 * not be presented as a transient "couldn't reach the server, try again" —
 * retrying cannot fix an expired session, and the retry banner would send a
 * technician in circles instead of to the sign-in screen.
 *
 * `LibraryApiError` is matched by instance. `CaptureApiError` is matched
 * structurally, by its numeric `status`, deliberately: importing it here would
 * pull `api/captureApi` — and its native `expo-file-system` dependency — into
 * every module that needs to classify an error, including the pure hydration
 * layer. The structural check covers it and any future client that reports a
 * status the same way.
 */
import { LibraryApiError } from '../api/libraryApi';
import { AuthRequiredError } from './authToken';

const AUTH_STATUSES = [401, 403];

/** The HTTP status an API error carries, if it carries one. */
function statusOf(error: unknown): number | null {
  if (error instanceof LibraryApiError) return error.status;
  if (error instanceof Error) {
    const status = (error as Error & { status?: unknown }).status;
    if (typeof status === 'number') return status;
  }
  return null;
}

/** True when this failure means the session is missing, expired or rejected. */
export function isAuthenticationError(error: unknown): boolean {
  if (error instanceof AuthRequiredError) return true;
  const status = statusOf(error);
  return status !== null && AUTH_STATUSES.includes(status);
}

/**
 * Sign-in copy for an auth failure, or `undefined` to let the caller's default
 * stand. A 403 is a different sentence from a 401: the session worked, the
 * server just refused to attribute this action to that person.
 */
export function authErrorMessage(error: unknown): string | undefined {
  if (error instanceof AuthRequiredError) return error.message;
  if (statusOf(error) === 403) {
    return 'This action can only be taken by the signed-in technician.';
  }
  return undefined;
}

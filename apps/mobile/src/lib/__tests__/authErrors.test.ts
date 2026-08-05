/**
 * Classifying "you are not signed in".
 *
 * `AuthRequiredError` only fires when the client knows up front that it has no
 * token. An expired or revoked token still reaches act-api and comes back as a
 * 401/403 on an ordinary API error — the same situation for the technician, and
 * one that a "try again" banner cannot fix.
 *
 * TEST_DATA only.
 */
import { authErrorMessage, isAuthenticationError } from '../authErrors';
import { AuthRequiredError } from '../authToken';
import { LibraryApiError } from '../../api/libraryApi';

describe('isAuthenticationError', () => {
  it('recognises a locally-detected missing session', () => {
    expect(isAuthenticationError(new AuthRequiredError())).toBe(true);
  });

  it('recognises a backend-rejected token', () => {
    expect(isAuthenticationError(new LibraryApiError('TEST_DATA', 401))).toBe(true);
    expect(isAuthenticationError(new LibraryApiError('TEST_DATA', 403))).toBe(true);
  });

  it('recognises any API error carrying an auth status', () => {
    // CaptureApiError is matched structurally so this module stays free of
    // native imports; this is that path.
    const captureShaped = Object.assign(new Error('TEST_DATA capture'), { status: 401 });
    expect(isAuthenticationError(captureShaped)).toBe(true);
  });

  it('does not treat transient or client errors as sign-outs', () => {
    for (const status of [400, 404, 409, 422, 500, 502, 503]) {
      expect(isAuthenticationError(new LibraryApiError('TEST_DATA', status))).toBe(false);
    }
  });

  it('does not treat a bare network error as a sign-out', () => {
    expect(isAuthenticationError(new Error('TEST_DATA network request failed'))).toBe(false);
    expect(isAuthenticationError(null)).toBe(false);
    expect(isAuthenticationError(undefined)).toBe(false);
    expect(isAuthenticationError({ status: 401 })).toBe(false); // not an Error
  });
});

describe('authErrorMessage', () => {
  it('passes through the local error’s own wording', () => {
    expect(authErrorMessage(new AuthRequiredError())).toMatch(/session expired/i);
  });

  it('distinguishes a 403 from a 401', () => {
    // 403 means the session worked and the server refused to attribute the
    // action to that person — a different sentence from "you are signed out".
    expect(authErrorMessage(new LibraryApiError('TEST_DATA', 403))).toMatch(
      /signed-in technician/i,
    );
    expect(authErrorMessage(new LibraryApiError('TEST_DATA', 401))).toBeUndefined();
  });

  it('has nothing to say about non-auth failures', () => {
    expect(authErrorMessage(new LibraryApiError('TEST_DATA', 503))).toBeUndefined();
  });
});

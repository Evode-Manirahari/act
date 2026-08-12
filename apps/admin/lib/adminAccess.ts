/**
 * The admin gate, as pure functions.
 *
 * This app is the human authority in the pipeline: the surface where a person
 * approves a moment, accepts an expert answer, compiles a card and publishes it
 * as company knowledge. Everything here decides who reaches that surface, so it
 * lives apart from `middleware.ts` — a NextRequest is awkward to construct in a
 * test, and logic that is awkward to test is logic that ships unverified.
 *
 * Two rules encode the incident the product exists to prevent:
 *
 *  1. Missing configuration denies access in production. The gate used to be a
 *     no-op whenever ADMIN_PASSWORD was unset, with a comment saying production
 *     deploys MUST set it. A comment is not a control: one forgotten env var on
 *     a public host published the whole review surface, internal API routes
 *     included, to anyone who found the hostname.
 *
 *  2. A post-sign-in redirect must stay on this origin. `next` arrives from the
 *     query string, so `//evil.test` — which passes a naive `startsWith('/')`
 *     check and resolves to a foreign origin — turned a crafted sign-in link
 *     into an off-site redirect after a successful login.
 */

export const COOKIE_NAME = 'act-admin-auth';

const PUBLIC_PATHS = new Set(['/sign-in', '/api/sign-in', '/favicon.ico']);

/** What the caller (middleware) should do with a request. */
export type AccessDecision =
  | { kind: 'allow' }
  /** Configuration is missing on a deployment that requires it. */
  | { kind: 'misconfigured'; reason: string }
  /** Not signed in, and the request wants JSON. */
  | { kind: 'unauthorized' }
  /** Not signed in, and the request wants a page. */
  | { kind: 'redirect-to-sign-in' };

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/static/')) return true;
  return false;
}

export function isApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

/**
 * Resolve the post-sign-in destination to a same-origin path.
 *
 * Asks the same parser that will later resolve this value whether it stays on
 * this origin, rather than hand-checking the characters that would move it.
 * Character checks lose: WHATWG strips tab, LF and CR *before* parsing, so
 * `/\t/evil.test` becomes `//evil.test` and reaches a foreign origin while
 * looking like an ordinary path to `startsWith('/')` and to a `next[1]` check.
 * `/\host` is the same trap by a different route.
 *
 * Resolving against a sentinel origin and comparing `url.origin` inherits every
 * one of those quirks for free, and keeps inheriting them if the parser changes.
 * Anything that does not land on the sentinel becomes '/', so a hostile value is
 * a harmless trip home rather than an error page.
 */
const SENTINEL_ORIGIN = 'https://same-origin.invalid';

export function resolveNextPath(next: string | null | undefined): string {
  if (!next) return '/';
  // Keep the leading-slash requirement so the accepted shape stays obvious;
  // the origin check below is what actually enforces the boundary.
  if (!next.startsWith('/')) return '/';
  try {
    const url = new URL(next, SENTINEL_ORIGIN);
    if (url.origin !== SENTINEL_ORIGIN) return '/';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/';
  }
}

export interface AccessInput {
  pathname: string;
  /** Value of the auth cookie, if the browser sent one. */
  cookie: string | undefined;
  /** ADMIN_PASSWORD, or undefined/'' when unset. */
  expected: string | undefined;
  /**
   * True for any deployed environment. When true, a missing password denies
   * rather than waves traffic through.
   */
  isProduction: boolean;
}

export async function decideAccess(input: AccessInput): Promise<AccessDecision> {
  const { pathname, cookie, expected, isProduction } = input;

  if (!expected) {
    if (isProduction) {
      // Fail closed. A deployed admin app with no password is not a
      // convenience, it is an open publish gate.
      return {
        kind: 'misconfigured',
        reason:
          'ADMIN_PASSWORD is not set. The admin app refuses to serve in production ' +
          'rather than expose the review and publish surface.',
      };
    }
    return { kind: 'allow' }; // local dev, explicitly opted out
  }

  if (isPublicPath(pathname)) return { kind: 'allow' };

  if (cookie && (await verifyCookie(cookie, expected))) return { kind: 'allow' };

  return isApiPath(pathname)
    ? { kind: 'unauthorized' }
    : { kind: 'redirect-to-sign-in' };
}

/**
 * Both sides are sha-256 hashed before comparison, then compared in constant
 * time: the plaintext password never sits in the cookie, and the comparison
 * leaks no prefix information through timing.
 */
export async function verifyCookie(cookie: string, expected: string): Promise<boolean> {
  return constantTimeEquals(cookie, await sha256Hex(expected));
}

/** Constant-time equality for the submitted password against ADMIN_PASSWORD. */
export async function passwordMatches(
  submitted: string,
  expected: string,
): Promise<boolean> {
  const [a, b] = await Promise.all([sha256Hex(submitted), sha256Hex(expected)]);
  return constantTimeEquals(a, b);
}

export function constantTimeEquals(a: string, b: string): boolean {
  // Both inputs here are fixed-length sha-256 hex, so an early length bail
  // discloses nothing an attacker does not already know.
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

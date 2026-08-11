/**
 * The admin gate.
 *
 * This app publishes company knowledge, so "who reaches it" is the highest-risk
 * logic in the workspace and had no tests at all until now. Two of these cases
 * cover live defects found on 2026-08-09:
 *
 *  - a deployed admin app with ADMIN_PASSWORD unset served every page and every
 *    internal API route to anyone with the hostname;
 *  - `?next=//evil.test` sent the operator off-origin after a successful
 *    sign-in, because the check was `startsWith('/')`.
 */
import { describe, expect, it } from 'vitest';

import {
  COOKIE_NAME,
  constantTimeEquals,
  decideAccess,
  isApiPath,
  isPublicPath,
  passwordMatches,
  resolveNextPath,
  sha256Hex,
  verifyCookie,
} from '@/lib/adminAccess';

const PASSWORD = 'correct horse battery staple';

async function goodCookie() {
  return sha256Hex(PASSWORD);
}

describe('missing configuration', () => {
  it('denies every path in production when ADMIN_PASSWORD is unset', async () => {
    for (const pathname of ['/', '/library', '/moments/abc', '/api/moments/abc/review']) {
      const d = await decideAccess({
        pathname,
        cookie: undefined,
        expected: undefined,
        isProduction: true,
      });
      expect(d.kind, pathname).toBe('misconfigured');
    }
  });

  it('denies in production even for paths that are otherwise public', async () => {
    // Nothing is served at all: a half-open app invites "just sign in" and
    // there is no password to sign in with.
    const d = await decideAccess({
      pathname: '/sign-in',
      cookie: undefined,
      expected: undefined,
      isProduction: true,
    });
    expect(d.kind).toBe('misconfigured');
  });

  it('treats an empty string like unset', async () => {
    const d = await decideAccess({
      pathname: '/',
      cookie: undefined,
      expected: '',
      isProduction: true,
    });
    expect(d.kind).toBe('misconfigured');
  });

  it('still waves traffic through outside production', async () => {
    const d = await decideAccess({
      pathname: '/api/moments/abc/review',
      cookie: undefined,
      expected: undefined,
      isProduction: false,
    });
    expect(d.kind).toBe('allow');
  });

  it('names the missing variable so the fix is obvious', async () => {
    const d = await decideAccess({
      pathname: '/',
      cookie: undefined,
      expected: undefined,
      isProduction: true,
    });
    if (d.kind !== 'misconfigured') throw new Error('expected misconfigured');
    expect(d.reason).toContain('ADMIN_PASSWORD');
  });
});

describe('signed-out access', () => {
  it('redirects a page request to sign-in', async () => {
    const d = await decideAccess({
      pathname: '/library',
      cookie: undefined,
      expected: PASSWORD,
      isProduction: true,
    });
    expect(d.kind).toBe('redirect-to-sign-in');
  });

  it('401s an API request instead of redirecting it', async () => {
    // A fetch() that follows a redirect to an HTML sign-in page would surface
    // as an unparseable response, not as "you are signed out".
    const d = await decideAccess({
      pathname: '/api/knowledge-objects/abc/publish',
      cookie: undefined,
      expected: PASSWORD,
      isProduction: true,
    });
    expect(d.kind).toBe('unauthorized');
  });

  it('rejects a wrong cookie', async () => {
    const d = await decideAccess({
      pathname: '/library',
      cookie: await sha256Hex('wrong password'),
      expected: PASSWORD,
      isProduction: true,
    });
    expect(d.kind).toBe('redirect-to-sign-in');
  });

  it('rejects the plaintext password used as a cookie', async () => {
    const d = await decideAccess({
      pathname: '/library',
      cookie: PASSWORD,
      expected: PASSWORD,
      isProduction: true,
    });
    expect(d.kind).toBe('redirect-to-sign-in');
  });

  it('allows the sign-in page and its POST route', async () => {
    for (const pathname of ['/sign-in', '/api/sign-in']) {
      const d = await decideAccess({
        pathname,
        cookie: undefined,
        expected: PASSWORD,
        isProduction: true,
      });
      expect(d.kind, pathname).toBe('allow');
    }
  });

  it('does not treat sign-out as public', async () => {
    // Signing out is harmless, but a public POST route is a CSRF-shaped hole
    // and there is no reason to open one.
    const d = await decideAccess({
      pathname: '/api/sign-out',
      cookie: undefined,
      expected: PASSWORD,
      isProduction: true,
    });
    expect(d.kind).toBe('unauthorized');
  });
});

describe('signed-in access', () => {
  it('allows a page with a valid cookie', async () => {
    const d = await decideAccess({
      pathname: '/moments/abc',
      cookie: await goodCookie(),
      expected: PASSWORD,
      isProduction: true,
    });
    expect(d.kind).toBe('allow');
  });

  it('allows the publish route with a valid cookie', async () => {
    const d = await decideAccess({
      pathname: '/api/knowledge-objects/abc/publish',
      cookie: await goodCookie(),
      expected: PASSWORD,
      isProduction: true,
    });
    expect(d.kind).toBe('allow');
  });
});

describe('path classification', () => {
  it('recognises Next internals and static assets as public', () => {
    expect(isPublicPath('/_next/chunk.js')).toBe(true);
    expect(isPublicPath('/static/logo.png')).toBe(true);
    expect(isPublicPath('/favicon.ico')).toBe(true);
  });

  it('matches public paths exactly, not by prefix', () => {
    // '/sign-injection' must not inherit '/sign-in' access.
    expect(isPublicPath('/sign-injection')).toBe(false);
    expect(isPublicPath('/sign-in/../library')).toBe(false);
    expect(isPublicPath('/api/sign-in-as-admin')).toBe(false);
  });

  it('identifies API paths', () => {
    expect(isApiPath('/api/moments/1/review')).toBe(true);
    expect(isApiPath('/library')).toBe(false);
  });
});

describe('resolveNextPath', () => {
  it('keeps an ordinary same-origin path', () => {
    expect(resolveNextPath('/moments/abc?tab=evidence')).toBe('/moments/abc?tab=evidence');
  });

  it.each([
    ['//evil.test', 'protocol-relative'],
    ['//evil.test/path', 'protocol-relative with path'],
    ['/\\evil.test', 'backslash form parsed as protocol-relative'],
    ['/\\\\evil.test', 'double backslash'],
    ['https://evil.test', 'absolute URL'],
    ['http://evil.test', 'absolute URL, plain http'],
    ['javascript:alert(1)', 'scheme injection'],
    ['evil.test', 'bare host'],
    ['', 'empty'],
  ])('sends %s home (%s)', (input) => {
    expect(resolveNextPath(input)).toBe('/');
  });

  it('handles null and undefined', () => {
    expect(resolveNextPath(null)).toBe('/');
    expect(resolveNextPath(undefined)).toBe('/');
  });

  it('produces a value that cannot leave the origin once resolved', () => {
    // The property that actually matters, asserted the way the route uses it.
    const base = 'https://admin.actober.com/api/sign-in';
    for (const hostile of ['//evil.test', '/\\evil.test', '//evil.test/path']) {
      const url = new URL(resolveNextPath(hostile), base);
      expect(url.origin).toBe('https://admin.actober.com');
    }
  });
});

describe('cookie and password comparison', () => {
  it('accepts the hash of the configured password', async () => {
    expect(await verifyCookie(await sha256Hex(PASSWORD), PASSWORD)).toBe(true);
  });

  it('rejects a wrong hash, an empty cookie, and a truncated hash', async () => {
    expect(await verifyCookie(await sha256Hex('nope'), PASSWORD)).toBe(false);
    expect(await verifyCookie('', PASSWORD)).toBe(false);
    expect(await verifyCookie((await sha256Hex(PASSWORD)).slice(0, 32), PASSWORD)).toBe(false);
  });

  it('matches the correct password and rejects near misses', async () => {
    expect(await passwordMatches(PASSWORD, PASSWORD)).toBe(true);
    expect(await passwordMatches(PASSWORD + ' ', PASSWORD)).toBe(false);
    expect(await passwordMatches(PASSWORD.toUpperCase(), PASSWORD)).toBe(false);
    expect(await passwordMatches('', PASSWORD)).toBe(false);
  });

  it('compares equal-length strings without an early exit', () => {
    // Differing in the last character must still return false; an
    // implementation that bailed at the first difference would too, so this
    // pins behaviour rather than timing, which cannot be asserted reliably.
    expect(constantTimeEquals('abcd', 'abcz')).toBe(false);
    expect(constantTimeEquals('abcd', 'abcd')).toBe(true);
    expect(constantTimeEquals('abcd', 'abcde')).toBe(false);
  });

  it('produces stable lowercase sha-256 hex', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('exports the cookie name the routes and middleware share', () => {
    expect(COOKIE_NAME).toBe('act-admin-auth');
  });
});

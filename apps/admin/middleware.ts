/**
 * Shared-password gate for the admin app.
 *
 * Pilot-safe but intentionally minimal: a single ADMIN_PASSWORD env
 * value protects every page + every internal /api route. When the env
 * is unset, the middleware is a no-op (dev mode). The cookie holds the
 * sha-256 hex of the password so the plaintext never leaves the
 * server during sign-in and never sits in the browser.
 *
 * When you outgrow this — multiple users, role-based actions, real
 * audit trails — swap for Clerk/WorkOS and delete this file.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';


export const COOKIE_NAME = 'act-admin-auth';


const PUBLIC_PATHS = new Set([
  '/sign-in',
  '/api/sign-in',
  '/favicon.ico',
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/static/')) return true;
  return false;
}


export async function middleware(request: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    // Dev/no-auth mode. Letting unauthenticated traffic through is
    // intentional here — the user opted out of the gate by not setting
    // ADMIN_PASSWORD. Production deploys MUST set it.
    return NextResponse.next();
  }

  if (isPublic(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (cookie && (await verifyCookie(cookie, expected))) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return new NextResponse('unauthorized', { status: 401 });
  }

  const signIn = new URL('/sign-in', request.url);
  signIn.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(signIn);
}


export const config = {
  // Run on everything except Next internals and obvious static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};


/**
 * Both the cookie value and the env password are sha-256 hashed before
 * comparison, then compared in constant time. Avoids leaking the
 * plaintext password through the cookie and removes a timing-attack
 * path on the comparison.
 */
export async function verifyCookie(cookie: string, expected: string): Promise<boolean> {
  const expectedHash = await sha256Hex(expected);
  if (cookie.length !== expectedHash.length) {
    // Length-disclosed comparison is fine because the expected length
    // is a fixed sha-256 hex (64 chars). Bail early to avoid the
    // constant-time loop on totally wrong inputs.
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < expectedHash.length; i++) {
    mismatch |= cookie.charCodeAt(i) ^ expectedHash.charCodeAt(i);
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

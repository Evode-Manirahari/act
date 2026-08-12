/**
 * Shared-password gate for the admin app.
 *
 * Pilot-safe but intentionally minimal: a single ADMIN_PASSWORD env value
 * protects every page and every internal /api route. The cookie holds the
 * sha-256 hex of the password, so the plaintext never leaves the server during
 * sign-in and never sits in the browser.
 *
 * Unset ADMIN_PASSWORD is a local-dev opt-out ONLY. In production the app
 * refuses to serve instead — see `decideAccess` in lib/adminAccess, where the
 * decision logic lives so it can be tested without building a NextRequest.
 *
 * When you outgrow this — multiple users, role-based actions, real audit
 * trails — swap for Clerk/WorkOS and delete this file.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { COOKIE_NAME, decideAccess } from '@/lib/adminAccess';

export { COOKIE_NAME };

export async function middleware(request: NextRequest) {
  const decision = await decideAccess({
    pathname: request.nextUrl.pathname,
    cookie: request.cookies.get(COOKIE_NAME)?.value,
    expected: process.env.ADMIN_PASSWORD,
    isProduction: process.env.NODE_ENV === 'production',
  });

  switch (decision.kind) {
    case 'allow':
      return NextResponse.next();

    case 'misconfigured':
      // 503, not 500: this is "not configured to serve", and it is fixed by
      // setting the env var and redeploying, not by debugging the app.
      console.error(`[admin] refusing to serve: ${decision.reason}`);
      return new NextResponse(decision.reason, {
        status: 503,
        headers: { 'cache-control': 'no-store' },
      });

    case 'unauthorized':
      return new NextResponse('unauthorized', { status: 401 });

    case 'redirect-to-sign-in': {
      const signIn = new URL('/sign-in', request.url);
      signIn.searchParams.set(
        'next',
        request.nextUrl.pathname + request.nextUrl.search,
      );
      return NextResponse.redirect(signIn);
    }
  }
}

export const config = {
  // Run on everything except Next internals and obvious static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

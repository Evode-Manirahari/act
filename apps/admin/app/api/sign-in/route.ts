import { NextResponse } from 'next/server';

import { COOKIE_NAME, sha256Hex } from '@/middleware';


const ONE_DAY_SECONDS = 60 * 60 * 24;


export async function POST(request: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return new NextResponse(
      'ADMIN_PASSWORD is not set — sign-in is disabled in dev mode.',
      { status: 500 },
    );
  }

  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  const next = String(form.get('next') ?? '/');

  if (password !== expected) {
    const redirect = new URL('/sign-in', request.url);
    redirect.searchParams.set(
      'error',
      encodeURIComponent('Wrong password. Try again.'),
    );
    if (next && next !== '/') {
      redirect.searchParams.set('next', next);
    }
    return NextResponse.redirect(redirect, { status: 303 });
  }

  // Redirect to the originally requested URL, set the cookie on the
  // response so the browser carries it on the redirect target.
  const safeNext = next.startsWith('/') ? next : '/';
  const redirect = NextResponse.redirect(new URL(safeNext, request.url), {
    status: 303,
  });
  redirect.cookies.set({
    name: COOKIE_NAME,
    value: await sha256Hex(expected),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_DAY_SECONDS,
  });
  return redirect;
}

import { NextResponse } from 'next/server';

import { COOKIE_NAME } from '@/middleware';


export async function POST(request: Request) {
  const redirect = NextResponse.redirect(new URL('/sign-in', request.url), {
    status: 303,
  });
  redirect.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return redirect;
}

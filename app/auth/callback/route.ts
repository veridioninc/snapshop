import { NextResponse } from 'next/server';
import { exchangeCode, sessionCookieName } from '@/src/lib/auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return NextResponse.redirect(new URL('/login?error=missing_callback', url));
  try {
    const { token } = await exchangeCode(code, state);
    const response = NextResponse.redirect(new URL('/admin', url));
    response.cookies.set(sessionCookieName, token, { httpOnly: true, secure: true, sameSite: 'none', path: '/', maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch {
    return NextResponse.redirect(new URL('/login?error=callback_failed', url));
  }
}

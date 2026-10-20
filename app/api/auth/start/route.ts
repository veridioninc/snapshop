import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';

const STATE_COOKIE = 'snapshop_oauth_state';

export async function GET(request: Request) {
  const portal = process.env.MANUS_OAUTH_PORTAL_URL;
  const projectId = process.env.MANUS_PROJECT_ID;
  if (!portal || !projectId) return NextResponse.redirect(new URL('/login?error=not_configured', request.url));

  const requestUrl = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  const callback = `${origin.replace(/\/$/, '')}/auth/callback`;
  const nonce = randomBytes(18).toString('hex');
  const state = Buffer.from(JSON.stringify({ redirectUri: callback, nonce })).toString('base64url');
  const params = new URLSearchParams({ appId: projectId, redirectUri: callback, state, responseType: 'code' });
  const response = NextResponse.redirect(`${portal.replace(/\/$/, '')}/app-auth?${params.toString()}`);
  response.cookies.set(STATE_COOKIE, nonce, { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 600, path: '/' });
  return response;
}

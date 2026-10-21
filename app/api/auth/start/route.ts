import { NextResponse } from 'next/server';
import { isSameOrigin, safeRedirectPath, sendMagicLink } from '@/src/lib/auth';
import { supabaseConfigured } from '@/src/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const login = new URL('/login', url.origin);
  login.searchParams.set('next', safeRedirectPath(url.searchParams.get('next')));
  return NextResponse.redirect(login);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
  const url = new URL(request.url);
  const login = new URL('/login', url.origin);
  if (!supabaseConfigured()) {
    login.searchParams.set('error', 'not_configured');
    return NextResponse.redirect(login, 303);
  }
  const form = await request.formData().catch(() => null);
  const email = String(form?.get('email') || '').trim();
  const next = safeRedirectPath(String(form?.get('next') || '/admin'));
  login.searchParams.set('next', next);
  try {
    await sendMagicLink(email, url.origin, next);
    login.searchParams.set('sent', '1');
  } catch {
    login.searchParams.set('error', 'magic_link_failed');
  }
  return NextResponse.redirect(login, 303);
}

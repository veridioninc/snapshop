import { NextResponse } from 'next/server';
import { safeRedirectPath } from '@/src/lib/auth';
import { createServerClient, supabaseConfigured } from '@/src/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!supabaseConfigured()) return NextResponse.redirect(new URL('/login?error=not_configured', url));
  if (!code) return NextResponse.redirect(new URL('/login?error=missing_callback', url));
  try {
    const { error } = await createServerClient().auth.exchangeCodeForSession(code);
    if (error) throw error;
    return NextResponse.redirect(new URL(safeRedirectPath(url.searchParams.get('next')), url.origin));
  } catch {
    return NextResponse.redirect(new URL('/login?error=callback_failed', url));
  }
}

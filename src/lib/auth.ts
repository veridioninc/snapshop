import { redirect } from 'next/navigation';
import { createAdminClient, createServerClient, supabaseConfigured } from './supabase/server';
import type { User } from './types';

/** Validate the session with Auth, rather than trusting an unverified cookie. */
export async function getCurrentUser(): Promise<User | null> {
  if (!supabaseConfigured()) return null;
  const supabase = createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const name: unknown = user.user_metadata.full_name ?? user.user_metadata.name;
  return ensureProfile(user.id, user.email, typeof name === 'string' ? name : undefined);
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin');
  return user;
}

export async function requireStoreAccess(storeId: string) {
  const user = await requireUser();
  const supabase = createServerClient();
  const { data: store, error } = await supabase
    .from('stores')
    .select('id, owner_id, slug, name, status')
    .eq('id', storeId)
    .maybeSingle();
  if (error) throw error;
  if (!store || (!user.isOperator && store.owner_id !== user.id)) redirect('/admin');
  return { user, store } as const;
}

/** Profiles use the Auth UUID as the primary key, not a separate identity key. */
export async function ensureProfile(authUserId: string, email?: string, name?: string): Promise<User> {
  const supabase = createServerClient();
  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('id, is_operator')
    .eq('id', authUserId)
    .maybeSingle();
  if (readError) throw readError;

  let profile = existing;
  if (!profile) {
    // The service role is needed only to create a missing profile. Ordinary
    // profile reads and all store authorization use the authenticated client.
    const admin = createAdminClient();
    // The offline migration's service-only RPC serializes first-profile
    // creation, so concurrent first logins cannot both become operators.
    const { data: inserted, error } = await admin
      .rpc('ensure_profile', { p_user_id: authUserId })
      .single();
    if (error) throw error;
    profile = inserted;
  }

  return {
    id: profile.id,
    // Retained for callers that still use the old User shape; it is the Auth UUID.
    openId: profile.id,
    email: email ?? null,
    name: name ?? null,
    isOperator: profile.is_operator,
  };
}

export function safeRedirectPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return '/admin';
  const base = new URL('https://redirect.invalid');
  const target = new URL(value, base);
  return target.origin === base.origin ? `${target.pathname}${target.search}${target.hash}` : '/admin';
}

/** The supplied origin must come from the current server request, not form data. */
export function magicLinkRedirectUrl(requestOrigin?: string, next = '/admin'): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || requestOrigin;
  if (!origin) throw new Error('A site origin is required to send a magic link.');
  const base = new URL(origin);
  if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password) {
    throw new Error('Invalid site origin for the magic-link redirect.');
  }
  const callback = new URL('/auth/callback', base.origin);
  callback.searchParams.set('next', safeRedirectPath(next));
  return callback.toString();
}

export async function sendMagicLink(email: string, requestOrigin?: string, next = '/admin') {
  const supabase = createServerClient();
  const address = email.trim();
  if (!address || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new Error('Enter a valid email address.');
  const { data, error } = await supabase.auth.signInWithOtp({
    email: address,
    options: { emailRedirectTo: magicLinkRedirectUrl(requestOrigin, next) },
  });
  if (error) throw error;
  return data;
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const allowed = new Set<string>([new URL(request.url).origin]);
  const host = request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  if (host) allowed.add(`${forwardedProto || new URL(request.url).protocol.replace(':', '')}://${host}`);
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      allowed.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin);
    } catch {
      // Ignore malformed optional configuration; still require the request origin.
    }
  }
  return allowed.has(origin);
}

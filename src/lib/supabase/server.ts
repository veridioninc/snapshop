import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from './database';

export class ConfigurationRequiredError extends Error {
  readonly code = 'CONFIGURATION_REQUIRED';

  constructor(detail = 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.') {
    super(`CONFIGURATION_REQUIRED: ${detail}`);
    this.name = 'ConfigurationRequiredError';
  }
}

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
}

function publicConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) throw new ConfigurationRequiredError();
  return { url, anonKey };
}

/** Always create a fresh client per request; the caller's cookies enforce RLS. */
export function createServerClient() {
  const { url, anonKey } = publicConfiguration();
  const cookieStore = cookies();

  return createSupabaseServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. The auth middleware refreshes
          // them on the response; route handlers and server actions can write here.
        }
      },
    },
  });
}

/** Service-role access is only for trusted server-side bootstrap and callbacks. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new ConfigurationRequiredError('Set NEXT_PUBLIC_SUPABASE_URL and the server-only SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// Familiar aliases for Supabase SSR consumers, without sharing client instances.
export const createClient = createServerClient;
export const createServiceRoleClient = createAdminClient;

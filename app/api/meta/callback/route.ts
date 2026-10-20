import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { requireStoreAccess } from '@/src/lib/auth';
import { completeMetaConnection, META_STATE_COOKIE } from '@/src/lib/meta';

export async function GET(request: Request) { const url = new URL(request.url); const code = url.searchParams.get('code'); const state = url.searchParams.get('state'); if (!code || !state) return NextResponse.redirect(new URL('/admin?error=meta_callback', url)); try { const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as { storeId?: string; nonce?: string }; const expected = cookies().get(META_STATE_COOKIE)?.value; if (!parsed.storeId || !parsed.nonce || expected !== `${parsed.storeId}.${parsed.nonce}`) throw new Error('Invalid Meta OAuth state'); await requireStoreAccess(parsed.storeId); await completeMetaConnection(parsed.storeId, code, url.origin); const response = NextResponse.redirect(new URL(`/admin/${parsed.storeId}/instagram?connected=1`, url)); response.cookies.delete(META_STATE_COOKIE); return response; } catch { return NextResponse.redirect(new URL('/admin?error=meta_connection', url)); } }

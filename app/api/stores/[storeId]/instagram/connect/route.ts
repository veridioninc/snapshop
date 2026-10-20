import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { requireStoreAccess } from '@/src/lib/auth';
import { buildMetaLoginUrl, metaConfigAvailable, META_STATE_COOKIE } from '@/src/lib/meta';

export async function GET(request: Request, { params }: { params: { storeId: string } }) { await requireStoreAccess(params.storeId); if (!metaConfigAvailable()) return NextResponse.redirect(new URL(`/admin/${params.storeId}/instagram?error=not_configured`, request.url)); const nonce = randomBytes(24).toString('hex'); const state = Buffer.from(JSON.stringify({ storeId: params.storeId, nonce })).toString('base64url'); const response = NextResponse.redirect(buildMetaLoginUrl(state, new URL(request.url).origin)); response.cookies.set(META_STATE_COOKIE, `${params.storeId}.${nonce}`, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/' }); return response; }

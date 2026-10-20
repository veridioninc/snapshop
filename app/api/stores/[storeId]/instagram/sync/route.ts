import { NextResponse } from 'next/server';
import { isSameOrigin, requireStoreAccess } from '@/src/lib/auth';
import { syncInstagramMedia } from '@/src/lib/meta';

export async function POST(request: Request, { params }: { params: { storeId: string } }) { await requireStoreAccess(params.storeId); if (!isSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 }); try { const count = await syncInstagramMedia(params.storeId); return NextResponse.redirect(new URL(`/admin/${params.storeId}/instagram?synced=${count}`, request.url)); } catch { return NextResponse.redirect(new URL(`/admin/${params.storeId}/instagram?error=sync`, request.url)); } }

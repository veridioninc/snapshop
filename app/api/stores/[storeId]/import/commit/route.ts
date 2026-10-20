import { NextResponse } from 'next/server';
import { isSameOrigin, requireStoreAccess } from '@/src/lib/auth';
import { commitImport } from '@/src/lib/imports';

export async function POST(request: Request, { params }: { params: { storeId: string } }) { await requireStoreAccess(params.storeId); if (!isSameOrigin(request)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 }); const body = await request.json().catch(() => ({})); if (!body.importId) return NextResponse.json({ error: 'importId is required.' }, { status: 400 }); try { const result = await commitImport(params.storeId, String(body.importId)); return NextResponse.json(result); } catch { return NextResponse.json({ error: 'The import could not be committed. No products were changed.' }, { status: 500 }); } }

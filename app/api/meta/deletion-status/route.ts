import { NextResponse } from 'next/server';
import { getMetaDeletionStatus } from '@/src/lib/meta';

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get('code') || '';
  const item = await getMetaDeletionStatus(code);
  if (!item) return NextResponse.json({ status: 'not_found' }, { status: 404 });
  return NextResponse.json(item);
}

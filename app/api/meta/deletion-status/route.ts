import { NextResponse } from 'next/server';
import { query } from '@/src/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

export async function GET(request: Request) { const code = new URL(request.url).searchParams.get('code') || ''; const rows = await query<(RowDataPacket & { status: string; created_at: string; completed_at: string | null })[]>('SELECT status, created_at, completed_at FROM instagram_deletion_requests WHERE confirmation_code = ? LIMIT 1', [code]); if (!rows[0]) return NextResponse.json({ status: 'not_found' }, { status: 404 }); return NextResponse.json({ status: rows[0].status, created_at: rows[0].created_at, completed_at: rows[0].completed_at }); }

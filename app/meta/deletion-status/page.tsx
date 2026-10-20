import { query } from '@/src/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

export const dynamic = 'force-dynamic';
export default async function DeletionStatusPage({ searchParams }: { searchParams: { code?: string } }) { const code = searchParams.code || ''; const rows = await query<(RowDataPacket & { status: string; created_at: string; completed_at: string | null })[]>('SELECT status, created_at, completed_at FROM instagram_deletion_requests WHERE confirmation_code = ? LIMIT 1', [code]); const item = rows[0]; return <main className="container" style={{ maxWidth: 680, paddingTop: 80 }}><div className="card stack"><h1>Data deletion request</h1>{item ? <><p>Your request is <strong>{item.status}</strong>.</p><p className="muted">Confirmation code: {code}</p>{item.completed_at && <p className="muted">Completed: {new Date(item.completed_at).toLocaleString()}</p>}</> : <p className="muted">No request was found for that confirmation code.</p>}</div></main>; }

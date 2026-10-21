import { getMetaDeletionStatus } from '@/src/lib/meta';

export const dynamic = 'force-dynamic';
export default async function DeletionStatusPage({ searchParams }: { searchParams: { code?: string } }) { const code = searchParams.code || ''; const item = await getMetaDeletionStatus(code); return <main className="container" style={{ maxWidth: 680, paddingTop: 80 }}><div className="card stack"><h1>Data deletion request</h1>{item ? <><p>Your request is <strong>{item.status}</strong>.</p><p className="muted">Confirmation code: {code}</p>{item.completed_at && <p className="muted">Completed: {new Date(item.completed_at).toLocaleString()}</p>}</> : <p className="muted">No request was found for that confirmation code.</p>}</div></main>; }

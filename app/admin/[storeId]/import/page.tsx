import Link from 'next/link';
import { requireStoreAccess } from '@/src/lib/auth';
import { ImportWizard } from '@/src/components/ImportWizard';

export default async function ImportPage({ params }: { params: { storeId: string } }) { const { store } = await requireStoreAccess(params.storeId); return <div className="stack" style={{ maxWidth: 980 }}><div className="split"><div><h1 style={{ marginBottom: 4 }}>Import products</h1><p className="muted">Validate first, then commit valid rows in one transaction.</p></div><Link href={`/admin/${store.id}/products`}>Back to products</Link></div><ImportWizard storeId={store.id} /></div>; }

import Link from 'next/link';
import { requireStoreAccess } from '@/src/lib/auth';
import { ProductForm } from '@/src/components/ProductForm';

export default async function NewProductPage({ params }: { params: { storeId: string } }) { const { store } = await requireStoreAccess(params.storeId); return <div className="stack" style={{ maxWidth: 820 }}><div className="split"><h1>Add product</h1><Link href={`/admin/${store.id}/products`}>Back to products</Link></div><ProductForm storeId={store.id} /></div>; }

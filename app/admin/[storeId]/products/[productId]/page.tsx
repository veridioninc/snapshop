import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStoreAccess } from '@/src/lib/auth';
import { getProduct } from '@/src/lib/repository';
import { ProductForm } from '@/src/components/ProductForm';

export default async function ProductEditPage({ params }: { params: { storeId: string; productId: string } }) { const { store } = await requireStoreAccess(params.storeId); const product = await getProduct(store.id, params.productId); if (!product) notFound(); return <div className="stack" style={{ maxWidth: 820 }}><div className="split"><h1>Edit product</h1><Link href={`/admin/${store.id}/products`}>Back to products</Link></div><ProductForm storeId={store.id} product={product} /></div>; }

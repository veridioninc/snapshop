import Link from 'next/link';
import type { Store } from '@/src/lib/types';

export function StoreHeader({ store }: { store: Store }) {
  return <header className="site-header"><div className="inner"><Link href={`/s/${store.slug}`} className="row"><strong>{store.name}</strong>{store.status === 'published' && <span className="badge live">Live</span>}</Link><Link href="/" className="muted small">Powered by Snap Shop</Link></div></header>;
}

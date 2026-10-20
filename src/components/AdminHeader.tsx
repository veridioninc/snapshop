import Link from 'next/link';
import type { User } from '@/src/lib/types';

export function AdminHeader({ user }: { user: User }) {
  return <header className="site-header"><div className="inner"><div className="row"><Link href="/admin"><strong>Snap Shop Admin</strong></Link><span className="badge">{user.isOperator ? 'Operator' : 'Store owner'}</span></div><div className="row"><span className="muted small">{user.email || user.name || user.openId}</span><Link className="button secondary" href="/">View site</Link></div></div></header>;
}

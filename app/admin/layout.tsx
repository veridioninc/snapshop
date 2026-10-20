import { requireUser } from '@/src/lib/auth';
import { AdminHeader } from '@/src/components/AdminHeader';

export const dynamic = 'force-dynamic';
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) { const user = await requireUser(); return <><AdminHeader user={user} /><main className="container">{children}</main></>; }

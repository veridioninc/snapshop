import Link from 'next/link';
import { oauthStartUrl } from '@/src/lib/auth';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const start = oauthStartUrl();
  return <main className="container" style={{ maxWidth: 620, paddingTop: 80 }}>
    <div className="card stack">
      <div className="split"><h1 style={{ margin: 0 }}>Admin login</h1><Link href="/">Back home</Link></div>
      <p className="muted">Use the project account login to manage stores and imports.</p>
      {start ? <a className="button" href={start}>Continue with Manus</a> : <div className="notice">OAuth is not configured in this environment yet. Add the Manus project variables before using admin pages.</div>}
    </div>
  </main>;
}

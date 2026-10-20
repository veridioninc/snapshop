import Link from 'next/link';

export const dynamic = 'force-dynamic';

type LoginPageProps = { searchParams?: { error?: string } };

export default function LoginPage({ searchParams }: LoginPageProps) {
  const error = searchParams?.error;
  return <main className="container" style={{ maxWidth: 620, paddingTop: 80 }}>
    <div className="card stack">
      <div className="split"><h1 style={{ margin: 0 }}>Admin login</h1><Link href="/">Back home</Link></div>
      <p className="muted">Use the project account login to manage stores and imports.</p>
      {error === 'not_configured' ? <div className="notice">OAuth is not configured in this environment yet. Add the Manus project variables before using admin pages.</div> : null}
      {error === 'callback_failed' ? <div className="notice">Login could not be completed. Please try again.</div> : null}
      {error === 'missing_callback' ? <div className="notice">The login callback was incomplete. Please try again.</div> : null}
      <a className="button" href="/api/auth/start">Continue with Manus</a>
    </div>
  </main>;
}

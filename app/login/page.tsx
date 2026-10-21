import Link from 'next/link';

export const dynamic = 'force-dynamic';

type LoginPageProps = { searchParams?: { error?: string; sent?: string; next?: string } };

export default function LoginPage({ searchParams }: LoginPageProps) {
  const error = searchParams?.error;
  const next = searchParams?.next || '/admin';
  return <main className="container" style={{ maxWidth: 620, paddingTop: 80 }}>
    <div className="card stack">
      <div className="split"><h1 style={{ margin: 0 }}>Admin login</h1><Link href="/">Back home</Link></div>
      <p className="muted">Enter your email and we’ll send you a secure one-time login link.</p>
      {searchParams?.sent === '1' ? <div className="notice">Check your email for a login link. If you don’t see it, check your spam folder.</div> : null}
      {error === 'not_configured' ? <div className="notice">Supabase Auth is not configured yet. Add the standalone project environment variables before using admin pages.</div> : null}
      {error === 'magic_link_failed' ? <div className="notice">We couldn’t send a login link. Check the email address and Supabase Auth configuration.</div> : null}
      {error === 'callback_failed' ? <div className="notice">Login could not be completed. Please request a fresh link and try again.</div> : null}
      {error === 'missing_callback' ? <div className="notice">The login callback was incomplete. Please request a fresh link.</div> : null}
      <form action="/api/auth/start" method="post" className="stack">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        <button className="button" type="submit">Send login link</button>
      </form>
    </div>
  </main>;
}

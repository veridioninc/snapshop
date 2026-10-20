import Link from 'next/link';

export default function HomePage() {
  return <main className="container stack" style={{ minHeight: '100vh', alignContent: 'center', maxWidth: 760 }}>
    <div className="card stack">
      <span className="badge live">FUNCTIONAL BUILD</span>
      <h1 style={{ margin: 0, fontSize: 42 }}>Snap Shop</h1>
      <p style={{ fontSize: 20, margin: 0 }}>Turn a product list into a shareable storefront.</p>
      <p className="muted">This first build focuses on the working product flow: imports, store management, publishing, and shopper contact links.</p>
      <div className="row"><Link className="button" href="/s/demo-studio">Open live demo store</Link><Link className="button secondary" href="/login">Admin login</Link></div>
    </div>
  </main>;
}

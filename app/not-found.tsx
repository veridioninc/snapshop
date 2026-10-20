import Link from 'next/link';
export default function NotFound() { return <main className="container" style={{ maxWidth: 680, paddingTop: 80 }}><div className="card stack"><h1>Not found</h1><p className="muted">This storefront or product is not published or does not exist.</p><Link className="button" href="/">Back to Snap Shop</Link></div></main>; }

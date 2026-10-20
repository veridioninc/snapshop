'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Product, Store } from '@/src/lib/types';
import { formatPrice, productOrderUrl } from '@/src/lib/domain';

export function Storefront({ store, products, categories }: { store: Store; products: Product[]; categories: string[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [inStock, setInStock] = useState(false);
  const filtered = useMemo(() => products.filter((product) => (!query || `${product.title} ${product.description || ''}`.toLowerCase().includes(query.toLowerCase())) && (!category || product.category === category) && (!inStock || product.availability === 'in_stock')), [products, query, category, inStock]);
  return <div className="stack"><div className="filters"><label>Search products<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label><label className="row" style={{ alignSelf: 'end', paddingBottom: 10, fontWeight: 400 }}><input type="checkbox" checked={inStock} onChange={(event) => setInStock(event.target.checked)} style={{ width: 18 }} /> In stock only</label></div>{filtered.length ? <div className="product-grid">{filtered.map((product) => { const order = productOrderUrl(store, product); const image = product.imageUrls[0]; return <article className="product-card" key={product.id}><Link href={`/s/${store.slug}/p/${product.id}`}><div className="image">{image ? <img src={image} alt={product.title} loading="lazy" /> : <span>No image</span>}</div><div className="content"><div className="split"><strong>{product.title}</strong><span className={`badge ${product.availability === 'in_stock' ? 'live' : 'out'}`}>{product.availability === 'in_stock' ? 'In stock' : 'Out of stock'}</span></div><div className="price">{formatPrice(product.price, product.currency)}</div><p className="muted small">{product.description || product.category || ''}</p></div></Link><div style={{ padding: '0 14px 14px' }}><a className="button" style={{ display: 'inline-block' }} href={order.href}>{order.label}</a></div></article>; })}</div> : <div className="card muted">No products match these filters.</div>}</div>;
}

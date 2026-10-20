import type { MetadataRoute } from 'next';
import { query } from '@/src/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> { const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, ''); if (!base) return []; const rows = await query<(RowDataPacket & { slug: string; updated_at: string })[]>('SELECT slug, updated_at FROM stores WHERE status = \'published\''); const entries: MetadataRoute.Sitemap = []; for (const row of rows) { entries.push({ url: `${base}/s/${row.slug}`, lastModified: row.updated_at }); const products = await query<(RowDataPacket & { id: string; updated_at: string })[]>('SELECT id, updated_at FROM products p JOIN stores s ON s.id = p.store_id WHERE s.slug = ? AND s.status = \'published\'', [row.slug]); entries.push(...products.map((product) => ({ url: `${base}/s/${row.slug}/p/${product.id}`, lastModified: product.updated_at }))); } return entries; }

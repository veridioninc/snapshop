import type { MetadataRoute } from 'next';
import { getProducts, listPublishedStores } from '@/src/lib/repository';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (!base) return [];
  const entries: MetadataRoute.Sitemap = [];
  for (const store of await listPublishedStores()) {
    entries.push({ url: `${base}/s/${store.slug}`, lastModified: store.updatedAt });
    const products = await getProducts(store.id);
    entries.push(...products.map((product) => ({
      url: `${base}/s/${store.slug}/p/${product.id}`,
      lastModified: product.updatedAt,
    })));
  }
  return entries;
}

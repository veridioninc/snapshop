import type { Product, Store } from './types';

export { supabaseConfigured, ConfigurationRequiredError } from './supabase/server';

export const migrationGuidance = 'Apply supabase/migrations with the Supabase CLI (supabase db push) before starting the app. Runtime requests never create or migrate tables.';

/** Compatibility only: schema changes are applied offline, not during requests. */
export async function ensureSchema(): Promise<void> {
  // Intentionally no-op. See migrationGuidance.
}

export function parseJsonArray(value: unknown): string[] {
  try {
    const parsed: unknown = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

const demoTimestamp = '2025-01-01T00:00:00.000Z';
const demoStore: Store = {
  id: '00000000-0000-4000-8000-000000000001',
  ownerId: null,
  slug: 'demo-studio',
  name: 'Demo Studio',
  tagline: 'Small-batch goods, ready to share.',
  aboutText: 'A seeded storefront to prove the public browsing and ordering flow.',
  email: 'hello@example.com',
  whatsappNumber: '14155550123',
  instagramHandle: 'demo.studio',
  logoUrl: null,
  themeColor: '#0f766e',
  currency: 'USD',
  status: 'published',
  publishedAt: demoTimestamp,
  createdAt: demoTimestamp,
  updatedAt: demoTimestamp,
};

const demoProducts: Product[] = [
  {
    id: '00000000-0000-4000-8000-000000000011',
    storeId: demoStore.id,
    sku: 'linen-tote',
    title: 'Linen Carryall',
    description: 'Roomy everyday tote with a soft structured shape.',
    price: 38,
    category: 'Accessories',
    imageUrls: ['https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=80'],
    sortOrder: 0,
  },
  {
    id: '00000000-0000-4000-8000-000000000012',
    storeId: demoStore.id,
    sku: 'ceramic-mug',
    title: 'Hand-thrown Mug',
    description: 'A warm, tactile mug for the daily ritual.',
    price: 28,
    category: 'Home',
    imageUrls: ['https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80'],
    sortOrder: 1,
  },
  {
    id: '00000000-0000-4000-8000-000000000013',
    storeId: demoStore.id,
    sku: 'soy-candle',
    title: 'Cedar Candle',
    description: 'A clean-burning candle with cedar and citrus notes.',
    price: 24,
    category: 'Home',
    imageUrls: ['https://images.unsplash.com/photo-1602874801006-e26d3e7df5ad?auto=format&fit=crop&w=900&q=80'],
    sortOrder: 2,
  },
].map((product) => ({
  ...product,
  currency: 'USD',
  availability: 'in_stock',
  externalLink: null,
  isDraft: false,
  source: null,
  sourceId: null,
  sourceUserId: null,
  createdAt: demoTimestamp,
  updatedAt: demoTimestamp,
}));

/** Return copies so an unconfigured demo cannot acquire mutable "saved" state. */
export function getDemoStore(): Store {
  return { ...demoStore };
}

export function getDemoProducts(storeId: string): Product[] {
  return storeId === demoStore.id
    ? demoProducts.map((product) => ({ ...product, imageUrls: [...product.imageUrls] }))
    : [];
}

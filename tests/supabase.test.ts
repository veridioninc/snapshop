import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createSSR: vi.fn(),
  createSDK: vi.fn(),
  cookies: { getAll: vi.fn(), set: vi.fn() },
}));
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.createSSR }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createSDK }));
vi.mock('next/headers', () => ({ cookies: () => mocks.cookies }));

import { getCurrentUser, magicLinkRedirectUrl, safeRedirectPath, sendMagicLink } from '@/src/lib/auth';
import { ensureSchema, parseJsonArray } from '@/src/lib/db';
import { commitImport, createPreviewImport } from '@/src/lib/imports';
import { countProducts, createProduct, createStore, deleteProduct, getProduct, getProducts, getStoreBySlug, updateProduct, updateStore } from '@/src/lib/repository';
import { createAdminClient, createServerClient, supabaseConfigured } from '@/src/lib/supabase/server';
import type { ProductRow } from '@/src/lib/supabase/database';

function queryResult(data: unknown, error: unknown = null, count: number | null = null) {
  return Object.assign(Promise.resolve({ data, error, count }), {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error, count }),
    single: vi.fn().mockResolvedValue({ data, error, count }),
  });
}

function configure() {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
  mocks.cookies.getAll.mockReturnValue([{ name: 'sb-test-auth-token', value: 'session' }]);
});
afterEach(() => vi.unstubAllEnvs());

describe('unconfigured Supabase', () => {
  it('returns deterministic, isolated demo data and no unknown storefronts', async () => {
    expect(supabaseConfigured()).toBe(false);
    const first = await getStoreBySlug('demo-studio');
    const second = await getStoreBySlug('demo-studio');
    expect(first).toEqual(second);
    expect(first?.status).toBe('published');
    expect(await getStoreBySlug('not-a-store')).toBeNull();
    const products = await getProducts(first!.id);
    expect(products).toHaveLength(3);
    expect(products.every((product) => !product.isDraft)).toBe(true);
    expect(await getProduct(first!.id, products[0].id)).toEqual(products[0]);
    expect(await countProducts(first!.id)).toBe(3);
    products[0].imageUrls.push('https://example.com/mutated');
    expect((await getProducts(first!.id))[0].imageUrls).toHaveLength(1);
    expect(await getProducts('unknown-id')).toEqual([]);
    expect(await getCurrentUser()).toBeNull();
    expect(mocks.createSSR).not.toHaveBeenCalled();
    await ensureSchema();
    expect(mocks.createSDK).not.toHaveBeenCalled();
  });

  it('rejects every mutation, including empty updates, with a configuration code', async () => {
    const mutations = [
      () => createStore({ name: 'Store', slug: 'store' }),
      () => updateStore('store-id', {}),
      () => createProduct('store-id', { title: 'Product', price: 1, currency: 'USD' }),
      () => updateProduct('store-id', 'product-id', {}),
      () => deleteProduct('store-id', 'product-id'),
      () => commitImport('store-id', 'import-id'),
    ];
    for (const mutate of mutations) {
      await expect(mutate()).rejects.toMatchObject({ code: 'CONFIGURATION_REQUIRED' });
    }
  });

  it('handles both native arrays and legacy JSON array strings safely', () => {
    expect(parseJsonArray(['a', 2, 'b'])).toEqual(['a', 'b']);
    expect(parseJsonArray('["a","b"]')).toEqual(['a', 'b']);
    expect(parseJsonArray('not-json')).toEqual([]);
    expect(parseJsonArray({ url: 'a' })).toEqual([]);
  });
});

describe('SSR and privileged client boundaries', () => {
  it('forwards cookie getAll/setAll and keeps the service role out of the SSR client', () => {
    configure();
    createServerClient();
    expect(mocks.createSSR).toHaveBeenCalledWith('https://example.supabase.co', 'test-anon-key', expect.any(Object));
    const options = mocks.createSSR.mock.calls[0][2] as {
      cookies: { getAll(): { name: string; value: string }[]; setAll(values: { name: string; value: string; options: { path: string } }[]): void };
    };
    expect(options.cookies.getAll()).toEqual([{ name: 'sb-test-auth-token', value: 'session' }]);
    options.cookies.setAll([{ name: 'sb-test-auth-token', value: 'refreshed', options: { path: '/' } }]);
    expect(mocks.cookies.set).toHaveBeenCalledWith('sb-test-auth-token', 'refreshed', { path: '/' });
    mocks.cookies.set.mockImplementation(() => { throw new Error('Server Component cannot set cookies'); });
    expect(() => options.cookies.setAll([{ name: 'token', value: '', options: { path: '/' } }])).not.toThrow();
    createAdminClient();
    expect(mocks.createSDK).toHaveBeenCalledWith('https://example.supabase.co', 'test-service-role-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  });

  it('uses verified Auth users and avoids the service client for existing profiles', async () => {
    configure();
    const profile = queryResult({ id: 'auth-user-id', is_operator: false });
    const auth = { getUser: vi.fn().mockResolvedValue({ data: { user: {
      id: 'auth-user-id', email: 'merchant@example.com', user_metadata: { full_name: 'Merchant' },
    } }, error: null }) };
    mocks.createSSR.mockReturnValue({ auth, from: vi.fn().mockReturnValue(profile) });
    expect(await getCurrentUser()).toEqual({ id: 'auth-user-id', openId: 'auth-user-id', email: 'merchant@example.com', name: 'Merchant', isOperator: false });
    expect(auth.getUser).toHaveBeenCalled();
    expect(profile.eq).toHaveBeenCalledWith('id', 'auth-user-id');
    expect(mocks.createSDK).not.toHaveBeenCalled();
  });

  it('bootstraps a missing profile atomically through the service-only RPC', async () => {
    configure();
    const auth = { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'first-user-id', user_metadata: {} } }, error: null }) };
    mocks.createSSR.mockReturnValue({ auth, from: vi.fn().mockReturnValue(queryResult(null)) });
    const rpc = vi.fn().mockReturnValue(queryResult({ id: 'first-user-id', is_operator: true }));
    mocks.createSDK.mockReturnValue({ rpc });
    const user = await getCurrentUser();
    expect(user?.id).toBe('first-user-id');
    expect(user?.isOperator).toBe(true);
    expect(rpc).toHaveBeenCalledWith('ensure_profile', { p_user_id: 'first-user-id' });
  });
});

describe('safe magic links', () => {
  it('accepts only local redirect paths and builds a trusted callback URL', () => {
    for (const path of ['https://evil.example', '//evil.example', '/\\evil.example', '/ok\nLocation:evil']) {
      expect(safeRedirectPath(path)).toBe('/admin');
    }
    expect(safeRedirectPath('/admin/store?tab=products')).toBe('/admin/store?tab=products');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://shop.example');
    const url = new URL(magicLinkRedirectUrl('https://ignored.example', '//evil.example'));
    expect(url.origin).toBe('https://shop.example');
    expect(url.pathname).toBe('/auth/callback');
    expect(url.searchParams.get('next')).toBe('/admin');
  });

  it('calls Auth OTP with the trusted callback and validates the email', async () => {
    configure();
    const signInWithOtp = vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null });
    mocks.createSSR.mockReturnValue({ auth: { signInWithOtp } });
    await sendMagicLink(' merchant@example.com ', 'https://shop.example', '/admin/settings');
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'merchant@example.com',
      options: { emailRedirectTo: 'https://shop.example/auth/callback?next=%2Fadmin%2Fsettings' },
    });
    await expect(sendMagicLink('not-an-email', 'https://shop.example')).rejects.toThrow('valid email');
    expect(() => magicLinkRedirectUrl('javascript:alert(1)')).toThrow('Invalid site origin');
  });
});

describe('Supabase repository and imports', () => {
  it('maps array images and applies published-store and non-draft public filters', async () => {
    configure();
    const row: ProductRow = {
      id: 'product-id', store_id: 'store-id', sku: null, title: 'Product', description: null,
      price: 12.5, currency: 'USD', image_urls: ['https://example.com/image.jpg'], category: null,
      availability: 'in_stock', sort_order: 2, external_link: null, is_draft: false,
      source: null, source_id: null, source_user_id: null, created_at: '2025-01-01', updated_at: '2025-01-01',
    };
    const stores = queryResult({ id: 'store-id' });
    const products = queryResult([row]);
    mocks.createSSR.mockReturnValue({ from: vi.fn((table: string) => table === 'stores' ? stores : products) });
    const result = await getProducts('store-id');
    expect(stores.eq).toHaveBeenCalledWith('status', 'published');
    expect(products.eq).toHaveBeenCalledWith('is_draft', false);
    expect(result[0]).toMatchObject({ id: 'product-id', storeId: 'store-id', imageUrls: row.image_urls, isDraft: false, sortOrder: 2 });
  });

  it('stores a preview as a JSONB object without changing CSV parsing', async () => {
    configure();
    const products = queryResult([]);
    const imports = queryResult(null);
    mocks.createSSR.mockReturnValue({ from: vi.fn((table: string) => table === 'products' ? products : imports) });
    const result = await createPreviewImport('store-id', { id: 'user-id', openId: 'user-id', isOperator: false }, 'products.csv',
      'title,price,image_url\nTest product,10,https://example.com/image.jpg');
    expect(result.preview.validRows).toHaveLength(1);
    expect(imports.insert).toHaveBeenCalledWith(expect.objectContaining({
      store_id: 'store-id', created_by: 'user-id', status: 'previewed', error_report: result.preview,
    }));
    expect(typeof imports.insert.mock.calls[0][0].error_report).toBe('object');
  });

  it('uses only the atomic RPC and preserves its idempotent response', async () => {
    configure();
    const rpc = vi.fn().mockResolvedValue({ data: { count: 3, alreadyCommitted: true }, error: null });
    const from = vi.fn();
    mocks.createSSR.mockReturnValue({ rpc, from });
    expect(await commitImport('store-id', 'import-id')).toEqual({ count: 3, alreadyCommitted: true });
    expect(rpc).toHaveBeenCalledWith('commit_import', { p_store_id: 'store-id', p_import_id: 'import-id' });
    expect(from).not.toHaveBeenCalled();
    rpc.mockResolvedValue({ data: { count: 'invalid', alreadyCommitted: true }, error: null });
    await expect(commitImport('store-id', 'import-id')).rejects.toThrow('invalid result');
  });
});

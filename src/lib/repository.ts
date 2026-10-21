import { randomUUID } from 'crypto';
import { getDemoProducts, getDemoStore, parseJsonArray } from './db';
import { createServerClient, supabaseConfigured } from './supabase/server';
import type { ProductRow, StoreRow } from './supabase/database';
import type { Availability, Currency, Product, Store, User } from './types';

function mapStore(row: StoreRow): Store {
  return {
    id: row.id,
    ownerId: row.owner_id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    aboutText: row.about_text,
    email: row.email,
    whatsappNumber: row.whatsapp_number,
    instagramHandle: row.instagram_handle,
    logoUrl: row.logo_url,
    themeColor: row.theme_color,
    currency: row.currency,
    status: row.status,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    storeId: row.store_id,
    sku: row.sku,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    currency: row.currency,
    imageUrls: parseJsonArray(row.image_urls),
    category: row.category,
    availability: row.availability,
    sortOrder: Number(row.sort_order),
    externalLink: row.external_link,
    isDraft: row.is_draft,
    source: row.source,
    sourceId: row.source_id,
    sourceUserId: row.source_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getStoreBySlug(slug: string, publishedOnly = true): Promise<Store | null> {
  if (!supabaseConfigured()) return slug === 'demo-studio' ? getDemoStore() : null;
  const supabase = createServerClient();
  let request = supabase.from('stores').select('*').eq('slug', slug);
  if (publishedOnly) request = request.eq('status', 'published');
  const { data, error } = await request.maybeSingle();
  if (error) throw error;
  return data ? mapStore(data) : null;
}

export async function getStoreById(id: string): Promise<Store | null> {
  if (!supabaseConfigured()) {
    const demo = getDemoStore();
    return id === demo.id ? demo : null;
  }
  const { data, error } = await createServerClient().from('stores').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapStore(data) : null;
}

async function isPublishedStore(storeId: string): Promise<boolean> {
  const { data, error } = await createServerClient()
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function getProducts(storeId: string, includeDraft = false): Promise<Product[]> {
  if (!supabaseConfigured()) return getDemoProducts(storeId);
  if (!includeDraft && !await isPublishedStore(storeId)) return [];
  let request = createServerClient().from('products').select('*').eq('store_id', storeId);
  if (!includeDraft) request = request.eq('is_draft', false);
  const { data, error } = await request.order('sort_order').order('title');
  if (error) throw error;
  return (data ?? []).map(mapProduct);
}

export async function getProduct(storeId: string, productId: string, includeDraft = false): Promise<Product | null> {
  if (!supabaseConfigured()) return getDemoProducts(storeId).find((product) => product.id === productId) ?? null;
  if (!includeDraft && !await isPublishedStore(storeId)) return null;
  let request = createServerClient().from('products').select('*').eq('store_id', storeId).eq('id', productId);
  if (!includeDraft) request = request.eq('is_draft', false);
  const { data, error } = await request.maybeSingle();
  if (error) throw error;
  return data ? mapProduct(data) : null;
}

export async function listStores(user: User): Promise<(Store & { productCount: number })[]> {
  const supabase = createServerClient();
  let request = supabase.from('stores').select('*');
  if (!user.isOperator) request = request.eq('owner_id', user.id);
  const { data, error } = await request.order('updated_at', { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map(async (row) => ({ ...mapStore(row), productCount: await countProducts(row.id) })));
}

export async function createStore(values: { name: string; slug: string; ownerId?: string | null }): Promise<Store | null> {
  const { data, error } = await createServerClient()
    .from('stores')
    .insert({ id: randomUUID(), owner_id: values.ownerId || null, name: values.name, slug: values.slug })
    .select('*')
    .single();
  if (error) throw error;
  return mapStore(data);
}

type StoreValues = Partial<{
  name: string; slug: string; tagline: string; aboutText: string; email: string;
  whatsappNumber: string; instagramHandle: string; themeColor: string; currency: Currency;
  logoUrl: string; status: 'draft' | 'published';
}>;

export async function updateStore(id: string, values: StoreValues): Promise<Store | null> {
  const supabase = createServerClient(); // Writes never fall back to the demo.
  const fields: Partial<StoreRow> = {};
  if (values.name !== undefined) fields.name = values.name;
  if (values.slug !== undefined) fields.slug = values.slug;
  if (values.tagline !== undefined) fields.tagline = values.tagline;
  if (values.aboutText !== undefined) fields.about_text = values.aboutText;
  if (values.email !== undefined) fields.email = values.email;
  if (values.whatsappNumber !== undefined) fields.whatsapp_number = values.whatsappNumber;
  if (values.instagramHandle !== undefined) fields.instagram_handle = values.instagramHandle;
  if (values.themeColor !== undefined) fields.theme_color = values.themeColor;
  if (values.currency !== undefined) fields.currency = values.currency;
  if (values.logoUrl !== undefined) fields.logo_url = values.logoUrl;
  if (values.status !== undefined) {
    fields.status = values.status;
    if (values.status === 'published') {
      const current = await getStoreById(id);
      if (!current) return null;
      fields.published_at = current.publishedAt || new Date().toISOString();
    } else {
      fields.published_at = null;
    }
  }
  if (!Object.keys(fields).length) return getStoreById(id);
  const { data, error } = await supabase.from('stores').update(fields).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  return data ? mapStore(data) : null;
}

type CreateProductValues = {
  title: string; description?: string; price: number; currency: Currency; imageUrls?: string[];
  category?: string; availability?: Availability; externalLink?: string; sku?: string;
};

export async function createProduct(storeId: string, values: CreateProductValues): Promise<Product | null> {
  const supabase = createServerClient();
  const { data: last, error: orderError } = await supabase
    .from('products').select('sort_order').eq('store_id', storeId)
    .order('sort_order', { ascending: false }).limit(1).maybeSingle();
  if (orderError) throw orderError;
  const { data, error } = await supabase.from('products').insert({
    id: randomUUID(),
    store_id: storeId,
    sku: values.sku || null,
    title: values.title,
    description: values.description || null,
    price: values.price,
    currency: values.currency,
    image_urls: values.imageUrls || [],
    category: values.category || null,
    availability: values.availability || 'in_stock',
    sort_order: last ? last.sort_order + 1 : 0,
    external_link: values.externalLink || null,
    is_draft: false,
  }).select('*').single();
  if (error) throw error;
  return mapProduct(data);
}

type ProductValues = Partial<{
  title: string; description: string; price: number; currency: Currency; imageUrls: string[];
  category: string; availability: Availability; externalLink: string; sku: string;
  sortOrder: number; isDraft: boolean;
}>;

export async function updateProduct(storeId: string, productId: string, values: ProductValues): Promise<Product | null> {
  const supabase = createServerClient();
  const fields: Partial<ProductRow> = {};
  if (values.title !== undefined) fields.title = values.title;
  if (values.description !== undefined) fields.description = values.description;
  if (values.price !== undefined) fields.price = values.price;
  if (values.currency !== undefined) fields.currency = values.currency;
  if (values.imageUrls !== undefined) fields.image_urls = values.imageUrls;
  if (values.category !== undefined) fields.category = values.category;
  if (values.availability !== undefined) fields.availability = values.availability;
  if (values.externalLink !== undefined) fields.external_link = values.externalLink;
  if (values.sku !== undefined) fields.sku = values.sku || null;
  if (values.sortOrder !== undefined) fields.sort_order = values.sortOrder;
  if (values.isDraft !== undefined) fields.is_draft = values.isDraft;
  if (!Object.keys(fields).length) return getProduct(storeId, productId, true);
  const { data, error } = await supabase.from('products').update(fields)
    .eq('store_id', storeId).eq('id', productId).select('*').maybeSingle();
  if (error) throw error;
  return data ? mapProduct(data) : null;
}

export async function deleteProduct(storeId: string, productId: string): Promise<void> {
  const { error } = await createServerClient().from('products').delete().eq('store_id', storeId).eq('id', productId);
  if (error) throw error;
}

export async function countProducts(storeId: string): Promise<number> {
  if (!supabaseConfigured()) return getDemoProducts(storeId).length;
  const { count, error } = await createServerClient().from('products')
    .select('id', { count: 'exact', head: true }).eq('store_id', storeId);
  if (error) throw error;
  return count ?? 0;
}

/** Structured event logging works in demo mode and never claims persistence. */
export async function recordAnalytics(event: string, payload: Record<string, unknown>): Promise<void> {
  console.log(JSON.stringify({ ...payload, event }));
}

/** Public discovery never includes an owner's unpublished stores. */
export async function listPublishedStores(): Promise<Store[]> {
  if (!supabaseConfigured()) return [getDemoStore()];
  const { data, error } = await createServerClient().from('stores').select('*')
    .eq('status', 'published').order('slug');
  if (error) throw error;
  return (data ?? []).map(mapStore);
}

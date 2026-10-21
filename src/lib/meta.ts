import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { isHttpUrl } from './domain';
import { createAdminClient, createServerClient } from './supabase/server';
import type { InstagramConnectionRow, ProductRow } from './supabase/database';
import type { InstagramConnection } from './types';

const DEFAULT_VERSION = 'v26.0';
export const META_STATE_COOKIE = 'snapshop_meta_oauth_state';
export const META_PERMISSIONS = ['instagram_basic', 'pages_show_list', 'pages_read_engagement'];

function graphVersion() { return process.env.META_GRAPH_VERSION || DEFAULT_VERSION; }
function graphBase() { return `https://graph.facebook.com/${graphVersion()}`; }
function secretKey() {
  const value = process.env.META_TOKEN_ENCRYPTION_KEY;
  if (!value) throw new Error('META_TOKEN_ENCRYPTION_KEY is not configured');
  return createHash('sha256').update(value).digest();
}

export function metaConfigAvailable() {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_TOKEN_ENCRYPTION_KEY);
}
export function metaRedirectUri(requestOrigin?: string) {
  return process.env.META_REDIRECT_URI || `${(requestOrigin || process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')}/api/meta/callback`;
}
export function buildMetaLoginUrl(state: string, requestOrigin?: string) {
  const appId = process.env.META_APP_ID;
  if (!appId) throw new Error('META_APP_ID is not configured');
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: metaRedirectUri(requestOrigin),
    state,
    response_type: 'code',
    scope: META_PERMISSIONS.join(','),
  });
  return `https://www.facebook.com/${graphVersion()}/dialog/oauth?${params}`;
}

export function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secretKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((value) => value.toString('base64url')).join('.');
}
export function decryptToken(value: string) {
  const [ivText, tagText, ciphertextText] = value.split('.');
  if (!ivText || !tagText || !ciphertextText) throw new Error('Invalid encrypted token');
  const decipher = createDecipheriv('aes-256-gcm', secretKey(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, 'base64url')), decipher.final()]).toString('utf8');
}
export function verifyMetaSignedRequest(value: string) {
  const [encodedSignature, encodedPayload] = value.split('.', 2);
  if (!encodedSignature || !encodedPayload || !process.env.META_APP_SECRET) return null;
  const signature = Buffer.from(encodedSignature.replace(/-/g, '+').replace(/_/g, '/') + '==', 'base64');
  const expected = createHmac('sha256', process.env.META_APP_SECRET).update(encodedPayload).digest();
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;
  try {
    return JSON.parse(Buffer.from(encodedPayload.replace(/-/g, '+').replace(/_/g, '/') + '==', 'base64').toString('utf8')) as { user_id?: string; algorithm?: string };
  } catch {
    return null;
  }
}

type GraphPage = { id: string; name?: string; tasks?: string[] };
type GraphPageDetails = GraphPage & { instagram_business_account?: { id: string } };
type GraphInstagramUser = { id: string; username?: string; name?: string; profile_picture_url?: string };
type GraphMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
};
type GraphToken = { access_token?: string; expires_in?: number };

async function graphGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${graphBase()}${path}`);
  url.searchParams.set('access_token', token);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { cache: 'no-store' });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok || !data || typeof data !== 'object' || 'error' in data) throw new Error('Meta API request failed');
  return data as T;
}

async function exchangeFacebookCode(code: string, redirectUri: string) {
  const url = new URL(`${graphBase()}/oauth/access_token`);
  url.searchParams.set('client_id', process.env.META_APP_ID || '');
  url.searchParams.set('client_secret', process.env.META_APP_SECRET || '');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code', code);
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json().catch(() => ({})) as GraphToken;
  if (!response.ok || !data.access_token) throw new Error('Meta OAuth code exchange failed');
  return { token: data.access_token, expiresIn: Number(data.expires_in || 3600) };
}

async function exchangeLongLivedToken(token: string) {
  const url = new URL(`${graphBase()}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', process.env.META_APP_ID || '');
  url.searchParams.set('client_secret', process.env.META_APP_SECRET || '');
  url.searchParams.set('fb_exchange_token', token);
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json().catch(() => ({})) as GraphToken;
  if (!response.ok || !data.access_token) return { token, expiresIn: 3600 };
  return { token: data.access_token, expiresIn: Number(data.expires_in || 60 * 60 * 24 * 60) };
}

export async function completeMetaConnection(storeId: string, code: string, requestOrigin?: string) {
  const supabase = createServerClient();
  const short = await exchangeFacebookCode(code, metaRedirectUri(requestOrigin));
  const long = await exchangeLongLivedToken(short.token);
  const me = await graphGet<{ id: string }>('/me', long.token, { fields: 'id' });
  const pages = await graphGet<{ data?: GraphPage[] }>('/me/accounts', long.token, { fields: 'id,name,tasks' });
  let selected: { page: GraphPage; pageDetails: GraphPageDetails } | null = null;
  for (const page of pages.data || []) {
    try {
      const pageDetails = await graphGet<GraphPageDetails>(`/${page.id}`, long.token, { fields: 'id,name,instagram_business_account' });
      if (pageDetails.instagram_business_account?.id) {
        selected = { page, pageDetails };
        break;
      }
    } catch {
      // Ignore pages without readable Instagram links.
    }
  }
  const igUserId = selected?.pageDetails.instagram_business_account?.id;
  if (!selected || !igUserId) throw new Error('No eligible Instagram professional account was found on the managed Facebook Pages.');
  const ig = await graphGet<GraphInstagramUser>(`/${igUserId}`, long.token, { fields: 'id,username,name,profile_picture_url' });
  const expiresAt = new Date(Date.now() + Math.max(long.expiresIn, 3600) * 1000).toISOString();
  const { error } = await supabase.from('instagram_connections').upsert({
    store_id: storeId,
    meta_user_id: String(me.id || ''),
    ig_user_id: String(ig.id),
    page_id: String(selected.page.id),
    page_name: String(selected.page.name || ''),
    username: String(ig.username || ig.name || ''),
    profile_picture_url: String(ig.profile_picture_url || ''),
    encrypted_access_token: encryptToken(long.token),
    token_expires_at: expiresAt,
    status: 'connected',
  }, { onConflict: 'store_id' });
  if (error) throw error;
  return { username: ig.username || ig.name || '', pageName: selected.page.name || '' };
}

function mapConnection(row: InstagramConnectionRow): InstagramConnection {
  return {
    id: row.id,
    storeId: row.store_id,
    igUserId: row.ig_user_id,
    pageId: row.page_id,
    pageName: row.page_name,
    username: row.username,
    profilePictureUrl: row.profile_picture_url,
    tokenExpiresAt: row.token_expires_at,
    status: row.status,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getInstagramConnection(storeId: string): Promise<InstagramConnection | null> {
  const row = await getConnectionSecret(storeId);
  return row ? mapConnection(row) : null;
}

async function getConnectionSecret(storeId: string): Promise<InstagramConnectionRow | null> {
  const { data, error } = await createServerClient().from('instagram_connections').select('*')
    .eq('store_id', storeId).maybeSingle();
  if (error) throw error;
  return data;
}

function mediaTitle(media: GraphMedia) {
  const caption = String(media.caption || '').trim();
  const first = caption.split(/\r?\n/)[0]?.trim();
  return (first || `${String(media.media_type || 'Post').replaceAll('_', ' ')} from Instagram`).slice(0, 120);
}

export async function syncInstagramMedia(storeId: string): Promise<number> {
  const supabase = createServerClient();
  const connection = await getConnectionSecret(storeId);
  if (!connection) throw new Error('Instagram is not connected.');
  if (connection.token_expires_at && new Date(connection.token_expires_at).getTime() <= Date.now()) {
    const { error } = await supabase.from('instagram_connections').update({ status: 'expired' }).eq('store_id', storeId);
    if (error) throw error;
    throw new Error('The Instagram connection has expired. Reconnect to refresh it.');
  }
  const token = decryptToken(connection.encrypted_access_token);
  const data = await graphGet<{ data?: GraphMedia[] }>(`/${connection.ig_user_id}/media`, token, {
    fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username',
    limit: '100',
  });
  const { data: store, error: storeError } = await supabase.from('stores').select('currency').eq('id', storeId).single();
  if (storeError) throw storeError;
  let imported = 0;
  for (const media of data.data || []) {
    const image = [media.media_url, media.thumbnail_url].find((value) => typeof value === 'string' && isHttpUrl(value));
    const sourceId = String(media.id);
    const fields: Partial<ProductRow> = {
      sku: `ig:${sourceId}`.slice(0, 64),
      title: mediaTitle(media),
      description: String(media.caption || '').slice(0, 2000),
      image_urls: image ? [image] : [],
      external_link: media.permalink || null,
      source_user_id: String(connection.meta_user_id || ''),
    };
    // Updating only the media fields preserves a merchant's price, currency,
    // availability and publication decision when an existing post is re-synced.
    const { data: existing, error: readError } = await supabase.from('products').select('id')
      .eq('store_id', storeId).eq('source', 'instagram').eq('source_id', sourceId).maybeSingle();
    if (readError) throw readError;
    if (existing) {
      const { error } = await supabase.from('products').update(fields).eq('id', existing.id).eq('store_id', storeId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('products').insert({
        ...fields,
        store_id: storeId,
        price: 0,
        currency: store.currency,
        category: 'Instagram',
        availability: 'in_stock',
        sort_order: imported,
        is_draft: true,
        source: 'instagram',
        source_id: sourceId,
      });
      if (error) {
        if (error.code !== '23505') throw error;
        // A concurrent sync may have inserted this same source. If it was a
        // different SKU collision, fail instead of updating an unrelated row.
        const { data: concurrent, error: concurrentError } = await supabase.from('products').select('id')
          .eq('store_id', storeId).eq('source', 'instagram').eq('source_id', sourceId).maybeSingle();
        if (concurrentError) throw concurrentError;
        if (!concurrent) throw error;
        const { error: updateError } = await supabase.from('products').update(fields).eq('id', concurrent.id).eq('store_id', storeId);
        if (updateError) throw updateError;
      }
    }
    imported++;
  }
  const { error } = await supabase.from('instagram_connections')
    .update({ last_synced_at: new Date().toISOString(), status: 'connected' }).eq('store_id', storeId);
  if (error) throw error;
  return imported;
}

export async function disconnectInstagram(storeId: string): Promise<void> {
  const { error } = await createServerClient().from('instagram_connections').delete().eq('store_id', storeId);
  if (error) throw error;
}

/** Only call this after verifying Meta's signed, server-to-server request. */
export async function deleteMetaData(metaUserId: string): Promise<void> {
  const admin = createAdminClient();
  const { error: productsError } = await admin.from('products').delete()
    .eq('source', 'instagram').eq('source_user_id', metaUserId);
  if (productsError) throw productsError;
  const { error: connectionError } = await admin.from('instagram_connections').delete().eq('meta_user_id', metaUserId);
  if (connectionError) throw connectionError;
  // Both deletes are idempotent so a callback can safely retry a partial failure.
}

/** A confirmation code authorizes only status fields, never Meta identity data. */
export async function getMetaDeletionStatus(confirmationCode: string) {
  if (!confirmationCode) return null;
  const { data, error } = await createAdminClient().from('instagram_deletion_requests')
    .select('status, created_at, completed_at')
    .eq('confirmation_code', confirmationCode)
    .maybeSingle();
  if (error) throw error;
  return data;
}

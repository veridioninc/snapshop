import { describe, expect, it } from 'vitest';
import { isPrivateHost, isSafeImageUrl, productOrderUrl, validateSlug } from '@/src/lib/domain';
import type { Product, Store } from '@/src/lib/types';

const store: Store = { id: 's', slug: 'shop', name: 'Test Shop', themeColor: '#111111', currency: 'USD', status: 'published', email: 'hello@example.com', whatsappNumber: '14155550123', instagramHandle: 'testshop', createdAt: '', updatedAt: '' };
const product: Product = { id: 'p', storeId: 's', title: 'Blue Mug', price: 24, currency: 'USD', imageUrls: [], availability: 'in_stock', sortOrder: 0, createdAt: '', updatedAt: '' };

describe('domain helpers', () => {
  it('rejects reserved and malformed slugs', () => { expect(validateSlug('admin')).toContain('reserved'); expect(validateSlug('A bad slug')).toContain('lowercase'); expect(validateSlug('ok')).toContain('3 to 40'); expect(validateSlug('good-shop')).toBeNull(); });
  it('blocks private image hosts', () => { expect(isPrivateHost('127.0.0.1')).toBe(true); expect(isPrivateHost('192.168.1.2')).toBe(true); expect(isSafeImageUrl('http://127.0.0.1/a.jpg')).toBe(false); expect(isSafeImageUrl('https://example.com/a.jpg')).toBe(true); });
  it('prefers WhatsApp and URL-encodes the order message', () => { const link = productOrderUrl(store, product); expect(link.channel).toBe('whatsapp'); expect(link.href).toContain('wa.me/14155550123'); expect(link.href).toContain('%22Blue%20Mug%22'); });
  it('falls back to email then Instagram', () => { const email = productOrderUrl({ ...store, whatsappNumber: null }, product); expect(email.channel).toBe('email'); const instagram = productOrderUrl({ ...store, whatsappNumber: null, email: null }, product); expect(instagram.channel).toBe('instagram'); });
});

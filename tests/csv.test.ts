import { describe, expect, it } from 'vitest';
import { parseCsv } from '@/src/lib/csv';

describe('CSV import parser', () => {
  it('accepts BOM, quoted commas, and semicolon delimiters', () => { const result = parseCsv('\ufefftitle;price;image_url;description\n"Coffee, mug";12.345;https://example.com/mug.jpg;"Warm\nceramic"'); expect(result.rowsFound).toBe(1); expect(result.validRows[0].title).toBe('Coffee, mug'); expect(result.validRows[0].price).toBe('12.35'); expect(result.errors.some((e) => e.level === 'warning')).toBe(true); });
  it('reports missing columns and invalid rows', () => { const missing = parseCsv('title,price\nThing,10'); expect(missing.errors[0].message).toContain('image_url'); const invalid = parseCsv('title,price,image_url,sku\nThing,-1,not-a-url,dup\nThing 2,5,https://example.com/a.jpg,dup'); expect(invalid.invalidRows).toHaveLength(2); expect(invalid.errors.some((e) => e.message.includes('Duplicate SKU'))).toBe(true); });
  it('matches existing products by sku or title for preview counts', () => { const result = parseCsv('title,price,image_url,sku\nExisting,10,https://example.com/a.jpg,sku-1\nAnother,11,https://example.com/b.jpg,', [{ id: 'p', storeId: 's', title: 'Existing', price: 1, currency: 'USD', imageUrls: [], availability: 'in_stock', sortOrder: 0, sku: 'sku-1', createdAt: '', updatedAt: '' }]); expect(result.updates).toBe(1); expect(result.creates).toBe(1); });
});

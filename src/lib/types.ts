export type Currency = 'USD' | 'CAD' | 'EUR' | 'GBP';
export type StoreStatus = 'draft' | 'published';
export type Availability = 'in_stock' | 'out_of_stock';

export type User = { id: string; openId: string; email?: string | null; name?: string | null; isOperator: boolean };
export type Store = {
  id: string; ownerId?: string | null; slug: string; name: string; tagline?: string | null; aboutText?: string | null;
  email?: string | null; whatsappNumber?: string | null; instagramHandle?: string | null; logoUrl?: string | null;
  themeColor: string; currency: Currency; status: StoreStatus; publishedAt?: string | null; createdAt: string; updatedAt: string;
};
export type Product = {
  id: string; storeId: string; sku?: string | null; title: string; description?: string | null; price: number;
  currency: Currency; imageUrls: string[]; category?: string | null; availability: Availability; sortOrder: number;
  externalLink?: string | null; createdAt: string; updatedAt: string;
};
export type ImportError = { row: number; field: string; message: string; level?: 'error' | 'warning' };
export type ImportPreview = { headers: string[]; rowsFound: number; validRows: CsvProductRow[]; invalidRows: CsvProductRow[]; errors: ImportError[]; creates: number; updates: number; warnings: string[] };
export type CsvProductRow = { title: string; price: string; image_url: string; description?: string; category?: string; currency?: string; availability?: string; external_link?: string; sku?: string; [key: string]: string | undefined };

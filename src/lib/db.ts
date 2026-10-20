import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise';
import { randomUUID } from 'crypto';

let pool: Pool | undefined;
let schemaReady: Promise<void> | undefined;

export function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not configured');
    pool = mysql.createPool({ uri: url, connectionLimit: 6, waitForConnections: true, ssl: url.includes('ssl') ? { rejectUnauthorized: false } : undefined });
  }
  return pool;
}

export async function ensureSchema() {
  if (!schemaReady) schemaReady = bootstrap();
  return schemaReady;
}

async function bootstrap() {
  const db = getPool();
  await db.query(`CREATE TABLE IF NOT EXISTS profiles (id CHAR(36) PRIMARY KEY, open_id VARCHAR(191) NOT NULL UNIQUE, email VARCHAR(255), name VARCHAR(120), is_operator BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  await db.query(`CREATE TABLE IF NOT EXISTS stores (id CHAR(36) PRIMARY KEY, owner_id CHAR(36) NULL, slug VARCHAR(40) NOT NULL UNIQUE, name VARCHAR(80) NOT NULL, tagline VARCHAR(120), about_text TEXT, email VARCHAR(255), whatsapp_number VARCHAR(32), instagram_handle VARCHAR(120), logo_url TEXT, theme_color VARCHAR(7) NOT NULL DEFAULT '#111111', currency CHAR(3) NOT NULL DEFAULT 'USD', status ENUM('draft','published') NOT NULL DEFAULT 'draft', published_at TIMESTAMP NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, CONSTRAINT fk_stores_owner FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL, INDEX idx_stores_owner (owner_id), INDEX idx_stores_status (status))`);
  await db.query(`CREATE TABLE IF NOT EXISTS products (id CHAR(36) PRIMARY KEY, store_id CHAR(36) NOT NULL, sku VARCHAR(64) NULL, title VARCHAR(120) NOT NULL, description TEXT, price DECIMAL(10,2) NOT NULL DEFAULT 0, currency CHAR(3) NOT NULL DEFAULT 'USD', image_urls LONGTEXT NOT NULL, category VARCHAR(60), availability ENUM('in_stock','out_of_stock') NOT NULL DEFAULT 'in_stock', sort_order INT NOT NULL DEFAULT 0, external_link TEXT, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, CONSTRAINT fk_products_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE, INDEX idx_products_store (store_id), INDEX idx_products_category (store_id, category), INDEX idx_products_title (store_id, title), UNIQUE KEY uq_products_store_sku (store_id, sku))`);
  await db.query(`CREATE TABLE IF NOT EXISTS imports (id CHAR(36) PRIMARY KEY, store_id CHAR(36) NOT NULL, created_by CHAR(36) NOT NULL, filename VARCHAR(255) NOT NULL, row_count INT NOT NULL DEFAULT 0, imported_count INT NOT NULL DEFAULT 0, error_report LONGTEXT NOT NULL, status ENUM('previewed','committed','cancelled') NOT NULL DEFAULT 'previewed', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fk_imports_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE, CONSTRAINT fk_imports_creator FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE, INDEX idx_imports_store (store_id))`);
  await seedDemo(db);
}

async function seedDemo(db: Pool) {
  const [rows] = await db.query<RowDataPacket[]>('SELECT id FROM stores WHERE slug = ?', ['demo-studio']);
  if (rows.length) return;
  const storeId = randomUUID();
  await db.query<ResultSetHeader>('INSERT INTO stores (id, slug, name, tagline, about_text, email, whatsapp_number, instagram_handle, theme_color, currency, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())', [storeId, 'demo-studio', 'Demo Studio', 'Small-batch goods, ready to share.', 'A seeded storefront to prove the public browsing and ordering flow.', 'hello@example.com', '14155550123', 'demo.studio', '#0f766e', 'USD', 'published']);
  const products = [
    ['linen-tote', 'Linen Carryall', 'Roomy everyday tote with a soft structured shape.', 38, 'Accessories', 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=80'],
    ['ceramic-mug', 'Hand-thrown Mug', 'A warm, tactile mug for the daily ritual.', 28, 'Home', 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80'],
    ['soy-candle', 'Cedar Candle', 'A clean-burning candle with cedar and citrus notes.', 24, 'Home', 'https://images.unsplash.com/photo-1602874801006-e26d3e7df5ad?auto=format&fit=crop&w=900&q=80']
  ];
  for (let i = 0; i < products.length; i++) {
    const [sku, title, description, price, category, image] = products[i];
    await db.query('INSERT INTO products (id, store_id, sku, title, description, price, currency, image_urls, category, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [randomUUID(), storeId, sku, title, description, price, 'USD', JSON.stringify([image]), category, i]);
  }
}

export async function query<T extends RowDataPacket[] | ResultSetHeader = RowDataPacket[]>(sql: string, params: unknown[] = []) {
  await ensureSchema();
  const [result] = await getPool().query<T>(sql, params);
  return result;
}

export function parseJsonArray(value: unknown): string[] { try { const parsed = typeof value === 'string' ? JSON.parse(value) : value; return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []; } catch { return []; } }

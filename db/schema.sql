CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) PRIMARY KEY,
  open_id VARCHAR(191) NOT NULL UNIQUE,
  email VARCHAR(255),
  name VARCHAR(120),
  is_operator BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stores (
  id CHAR(36) PRIMARY KEY,
  owner_id CHAR(36) NULL,
  slug VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  tagline VARCHAR(120),
  about_text TEXT,
  email VARCHAR(255),
  whatsapp_number VARCHAR(32),
  instagram_handle VARCHAR(120),
  logo_url TEXT,
  theme_color VARCHAR(7) NOT NULL DEFAULT '#111111',
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  status ENUM('draft','published') NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_stores_owner FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE SET NULL,
  INDEX idx_stores_owner (owner_id),
  INDEX idx_stores_status (status)
);

CREATE TABLE IF NOT EXISTS products (
  id CHAR(36) PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  sku VARCHAR(64) NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  image_urls LONGTEXT NOT NULL,
  category VARCHAR(60),
  availability ENUM('in_stock','out_of_stock') NOT NULL DEFAULT 'in_stock',
  sort_order INT NOT NULL DEFAULT 0,
  external_link TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  INDEX idx_products_store (store_id),
  INDEX idx_products_category (store_id, category),
  INDEX idx_products_title (store_id, title),
  UNIQUE KEY uq_products_store_sku (store_id, sku)
);

CREATE TABLE IF NOT EXISTS imports (
  id CHAR(36) PRIMARY KEY,
  store_id CHAR(36) NOT NULL,
  created_by CHAR(36) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  row_count INT NOT NULL DEFAULT 0,
  imported_count INT NOT NULL DEFAULT 0,
  error_report LONGTEXT NOT NULL,
  status ENUM('previewed','committed','cancelled') NOT NULL DEFAULT 'previewed',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_imports_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  CONSTRAINT fk_imports_creator FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_imports_store (store_id)
);

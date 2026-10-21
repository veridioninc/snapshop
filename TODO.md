# Snap Shop Phase 1 TODO
## 1. Persistent data model and access control
- [ ] Create profiles, stores, products, and imports in Supabase Postgres through versioned migrations with the specified fields, enums/status values, foreign keys, cascading product/import deletion, indexes, and RLS policies.
- [ ] Enforce server-side ownership checks: operators can access all stores; store owners can access only their own store; anonymous visitors can read only published stores/products; imports remain private.
- [ ] Validate slugs as lowercase letters/numbers/hyphens, 3–40 characters, reject reserved slugs, and return a clear uniqueness error without silently appending numbers.
- [ ] Keep protected application/session values server-only and never expose database credentials or role decisions to client code.
## 2. Authentication and admin shell
- [ ] Implement Supabase Auth email magic links at `/login` and `/auth/callback`, with safe redirect handling, session refresh, and non-disclosing “check your email” feedback.
- [ ] Keep `/admin` and all nested admin routes server-protected; show the store list with status, product count, and last-updated information.
- [ ] Support operator-created stores and store-owner access to exactly their own store.
## 3. Store settings and publishing
- [ ] Implement `/admin/stores/new` with required store name and slug validation.
- [ ] Implement settings fields for name, tagline, about text, contact email, WhatsApp number, Instagram handle, theme color, supported currency, and logo URL/upload placeholder.
- [ ] Implement explicit save feedback and publish/unpublish behavior; publishing warns when the store has zero products, while unpublishing is immediate and reversible.
- [ ] Revalidate affected public content after store/settings changes.
## 4. Product management
- [ ] Implement product list, create/edit form, availability toggle, delete, ordering controls, and product export CSV.
- [ ] Validate required title, non-negative numeric price, supported currency, and HTTP(S) external links.
- [ ] Store up to five ordered image URLs and use the first image as the primary image; show a placeholder when absent.
- [ ] Show products with title, price, category, availability, and sort order; keep out-of-stock products visible.
## 5. CSV import
- [ ] Accept `.csv` files only, maximum 2 MB and 200 data rows, with UTF-8/BOM, comma or semicolon delimiters, quoted fields, normalized headers, ignored unknown columns with warnings, and skipped empty lines.
- [ ] Require title, price, and image_url columns; validate URLs, title/description/category/SKU lengths, availability aliases, currencies, external links, duplicate SKUs, and prices with more than two decimals as warnings.
- [ ] Show rows found, valid, invalid, first 20 valid preview rows, and create-versus-update counts before commit.
- [ ] Commit valid rows in one transaction, match by SKU then case-insensitive trimmed title, leave products absent from the CSV unchanged, and make repeat commit a no-op.
- [ ] Provide a downloadable template CSV and downloadable error report.
- [ ] Block private-network image hosts before persistence and record image failures as warnings without losing the product row.
## 6. Public storefront and order links
- [ ] Render published storefronts at `/s/[slug]` and products at `/s/[slug]/p/[productId]` with server-generated body HTML; unpublished or missing resources return a real 404.
- [ ] Provide category/search/in-stock filtering, responsive product cards, availability badges, product detail navigation, and an about/contact section.
- [ ] Build URL-encoded order links with priority WhatsApp, then email, then Instagram, using the specified prefilled message; out-of-stock products use “Ask about restock”.
- [ ] Track storefront, product, and order-click events without personal data.
## 7. SEO, accessibility, and platform routes
- [ ] Provide route-specific title/description, canonical URL when configured, Open Graph/Twitter metadata, LocalBusiness/Product structured data, and the correct public 404 behavior.
- [ ] Provide `/sitemap.xml` and `/robots.txt`; sitemap includes published stores and products and robots disallows admin/login/auth.
- [ ] Keep public content keyboard reachable, provide image alt text, avoid horizontal overflow, honor reduced motion, and use accessible contrast defaults.
## 8. Verification and delivery
- [ ] Add unit tests for CSV parsing/validation, slug rules, order-link priority and encoding, and currency formatting.
- [ ] Add checks for create/publish/public rendering, draft protection, re-import matching, private-network URL blocking, and route-manifest validity.
- [ ] Start the app on port 3000, verify representative public pages, run typecheck/tests/build, and save a standalone checkpoint with publication still disabled.

## Phase 2 — Instagram Connect
- [ ] Connect only professional Instagram Business or Creator accounts linked to a Facebook Page the owner manages, using Facebook Login with CSRF state validation and server-side code exchange.
- [ ] Store one connection per store with Instagram user ID, Facebook Page ID, profile identity, encrypted token, expiry, status, and last sync time; never expose tokens to browser code or logs.
- [ ] Provide `/admin/[storeId]/instagram` with connect, connection status, manual refresh, and disconnect controls.
- [ ] Read the connected Instagram profile and media from the current Facebook Login Graph API contract; synced media becomes draft products and does not guess prices from captions.
- [ ] Allow owners to review and publish synced draft products through the existing product editor; published storefronts must not show draft products.
- [ ] Disconnect by deleting tokens and the connection row while keeping synced products detached; a signed Meta data-deletion callback must remove Facebook-derived connection/product data and return a confirmation code plus human-readable status URL.
- [ ] Add unit tests for token encryption/decryption, OAuth state validation, signed-request verification, media-to-draft mapping, and draft visibility.

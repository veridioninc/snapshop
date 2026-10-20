# Snap Shop Phase 1 implementation plan

## Scope and implementation approach

This first build prioritizes working behavior over UI/UX and branding polish. It will implement the Phase 1 routes and core flows from the specification: public storefronts, product detail, operator/store-owner admin pages, product CRUD, CSV preview/commit, publish/unpublish, order links, exports, SEO documents, and a runnable testable data layer.

The managed Webdev project provides a persistent MySQL-compatible database and server runtime. Because this environment does not have a configured Supabase project, the working build uses the managed database and Manus OAuth session contract supplied by the project. The application-facing repositories are isolated in `src/lib`, so a later Supabase migration can replace the persistence/auth adapters without changing the route behavior.

Database initialization is deterministic and additive. `src/lib/db.ts` creates the required tables and indexes on first server use; `db/schema.sql` documents the same schema for migration review. A first-run seed creates a demo store and three products so the public route is demonstrably useful before an operator creates a real store. Admin routes require a validated Manus OAuth application session; the first authenticated profile becomes an operator, while later profiles are store owners unless explicitly promoted in the database.

CSV import is implemented as a four-state workflow in the import screen: upload/validate, preview, commit, and report. The parser accepts UTF-8/BOM, comma or semicolon delimiters, quoted fields, normalized headers, maximum 200 rows and 2 MB. Valid rows can be committed in one transaction and match by SKU or normalized title; invalid rows remain in the report. Image URLs are validated as public HTTP(S) URLs with private-network host blocking before they are persisted. Product image URLs are kept as an ordered JSON array for this first functional slice; durable object-storage uploads can be added without changing the product route contract.

Public store and product pages render meaningful HTML on the server, return not-found for drafts/missing records, expose per-route metadata, structured data, canonical paths when `NEXT_PUBLIC_SITE_URL` is configured, and generated sitemap/robots documents. Order links follow WhatsApp, email, then Instagram priority and emit a lightweight server-side analytics log without personal data.

## Project structure

- `app/`: Next.js App Router pages, route handlers, metadata, sitemap, robots, and auth callback.
- `src/lib/`: database access, schema bootstrap, auth/session validation, domain types, slug/order helpers, CSV parser/validation, authorization, and shared formatting.
- `src/components/`: small client components only where browser interaction is required, such as filters and CSV preview/commit.
- `db/schema.sql`: reviewable MySQL schema and indexes.
- `public/`: route manifest and downloadable CSV template.
- `tests/`: unit tests for pure domain behavior and CSV parsing.
- `scripts/`: migration/seed entry points for local or deployment checks.

## Build workflow

1. Create the Next.js/TypeScript project files and pinned dependency configuration.
2. Add database schema bootstrap, seed data, auth/session helpers, and pure domain utilities.
3. Add public routes and SEO documents.
4. Add admin routes and mutation handlers with server-side authorization.
5. Add CSV import preview/commit and product/store exports.
6. Start the development service on port 3000 and verify the route manifest, public demo store, draft protection, and build/typecheck/tests.
7. Add the platform logo metadata, commit the working slice, and record the checkpoint. Publication remains off unless explicitly requested.

## Design direction for this functional pass

Three possible directions were considered only to prevent accidental branding decisions: utilitarian admin console (0.06), editorial boutique storefront (0.05), and playful marketplace (0.04). The selected direction is **utilitarian admin console** for now.

- **Design Movement:** quiet software-tool minimalism.
- **Core Principles:** clarity before decoration, visible state, short paths to action, and accessible defaults.
- **Color Philosophy:** neutral surfaces with one restrained action color so data state and operational feedback stay legible.
- **Layout Paradigm:** straightforward vertical task flows with compact tables and clear action rails; no decorative hero or brand system yet.
- **Signature Elements:** status badges, inline validation summaries, and explicit publish/import state panels.
- **Interaction Philosophy:** every mutation is explicit, reversible where possible, and followed by plain-language confirmation.
- **Animation:** no non-essential animation; honor reduced-motion preferences.
- **Typography System:** system sans-serif with simple size hierarchy; branding typography deferred.
- **Brand Essence:** a fast path from product list to shareable storefront for small businesses; practical, calm, direct.
- **Brand Voice:** short operational copy such as “Import products” and “Your store is live.”
- **Wordmark & Logo:** deferred until branding work begins.
- **Signature Brand Color:** deferred until branding work begins.

## Phase 2 Instagram Connect implementation

Phase 2 follows the current Page-linked Facebook Login contract documented by Meta. The integration uses server-only environment variables for the Meta app ID, app secret, graph version, redirect URI, and token-encryption key. The connection flow stores a short-lived CSRF state cookie bound to the current store, redirects through Facebook Login, exchanges the authorization code server-side, reads the user’s managed Pages, selects a Page with a connected Instagram professional account, reads the Instagram profile, and stores only an encrypted long-lived access token.

The database adds `instagram_connections` for one active connection per store and `instagram_deletion_requests` for signed data-deletion callback tracking. Products gain draft/source metadata so manually refreshed Instagram media becomes hidden draft products with a stable `ig:<media-id>` source key. Owners can review and publish those products through the existing product edit flow. Media sync reads caption, media type, image/thumbnail URL, permalink, timestamp, and username; it never attempts to infer a price from captions.

The new admin route `/admin/[storeId]/instagram` exposes connection status, connect, manual refresh, and disconnect. `/api/meta/callback` handles the OAuth callback, `/api/meta/data-deletion` verifies Meta’s HMAC-signed request and removes the related connection and Instagram-sourced products, and `/meta/deletion-status` provides the human-readable deletion status URL required by Meta. Token renewal is represented by expiry/status handling and a manual refresh path; scheduled daily sync is intentionally not added until the manual flow is proven.

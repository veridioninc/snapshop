# Snap Shop

Snap Shop turns a CSV product catalog into a public, mobile-friendly storefront with WhatsApp, email, and Instagram contact links.

## Standalone architecture

- Next.js 14 App Router and TypeScript
- Supabase Postgres with versioned migrations and Row Level Security
- Supabase Auth email magic links
- Supabase Storage buckets for product images and store logos
- Optional Meta Instagram Connect integration
- Docker or Vercel deployment

The application does not require Manus services, Manus OAuth, Manus session cookies, a platform-owned database, or runtime schema creation.

## Local setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SITE_URL`.
3. Apply migrations with the Supabase CLI:

   ```bash
   npx supabase db push
   ```

   Or run `supabase/migrations/0001_snapshop.sql` and `0002_profile_bootstrap.sql` in the Supabase SQL editor.
4. In Supabase Auth URL Configuration, add `${NEXT_PUBLIC_SITE_URL}/auth/callback` as an allowed redirect URL. Configure SMTP for production magic-link delivery.
5. Install and run:

   ```bash
   pnpm install
   pnpm dev
   ```

Without Supabase variables, the public `/s/demo-studio` fallback is available for UI review. Administration and mutations intentionally require a configured Supabase project.

## Deployment

Build and run the standalone container:

```bash
pnpm build
PORT=3000 pnpm start
```

The Dockerfile produces the same standalone Next.js server. Set the environment variables in Vercel or the container host; never commit `.env.local` or service-role keys.

## Optional Instagram integration

Set the `META_*` variables, configure the Meta OAuth redirect to `/api/meta/callback`, and keep `META_TOKEN_ENCRYPTION_KEY` server-only. Instagram-sourced products remain drafts until reviewed and published.

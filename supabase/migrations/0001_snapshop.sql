create extension if not exists pgcrypto;

do $$ begin
  create type public.store_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.availability_status as enum ('in_stock', 'out_of_stock');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.import_status as enum ('previewed', 'committed', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.instagram_connection_status as enum ('connected', 'expired', 'error', 'revoked');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_operator boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9-]{3,40}$'),
  name text not null check (char_length(name) between 1 and 80),
  tagline text check (tagline is null or char_length(tagline) <= 120),
  about_text text check (about_text is null or char_length(about_text) <= 2000),
  email text,
  whatsapp_number text,
  instagram_handle text,
  logo_url text,
  theme_color text not null default '#111111' check (theme_color ~ '^#[0-9A-Fa-f]{6}$'),
  currency char(3) not null default 'USD',
  status public.store_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  sku text,
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 2000),
  price numeric(10,2) not null default 0 check (price >= 0),
  currency char(3) not null default 'USD',
  image_urls text[] not null default '{}',
  category text check (category is null or char_length(category) <= 60),
  availability public.availability_status not null default 'in_stock',
  sort_order integer not null default 0,
  external_link text,
  is_draft boolean not null default false,
  source text,
  source_id text,
  source_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(image_urls) <= 5)
);

create unique index if not exists products_store_sku_unique on public.products(store_id, sku) where sku is not null and sku <> '';
create unique index if not exists products_source_unique on public.products(store_id, source, source_id) where source is not null and source_id is not null;
create index if not exists products_store_idx on public.products(store_id);
create index if not exists products_category_idx on public.products(store_id, category);
create index if not exists products_title_idx on public.products(store_id, lower(title));

create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  filename text not null,
  row_count integer not null default 0,
  imported_count integer not null default 0,
  error_report jsonb not null default '{}'::jsonb,
  status public.import_status not null default 'previewed',
  created_at timestamptz not null default now()
);

create table if not exists public.instagram_connections (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores(id) on delete cascade,
  meta_user_id text,
  ig_user_id text not null,
  page_id text not null,
  page_name text,
  username text,
  profile_picture_url text,
  encrypted_access_token text not null,
  token_expires_at timestamptz,
  status public.instagram_connection_status not null default 'connected',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists instagram_connections_meta_user_idx on public.instagram_connections(meta_user_id);

create table if not exists public.instagram_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  meta_user_id text not null,
  confirmation_code text not null unique,
  status text not null default 'received' check (status in ('received', 'completed', 'error')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists stores_updated_at on public.stores;
create trigger stores_updated_at before update on public.stores for each row execute function public.set_updated_at();
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
drop trigger if exists instagram_connections_updated_at on public.instagram_connections;
create trigger instagram_connections_updated_at before update on public.instagram_connections for each row execute function public.set_updated_at();

create or replace function public.is_operator() returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce((select is_operator from public.profiles where id = auth.uid()), false); $$;

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.imports enable row level security;
alter table public.instagram_connections enable row level security;
alter table public.instagram_deletion_requests enable row level security;

drop policy if exists profiles_self_or_operator on public.profiles;
create policy profiles_self_or_operator on public.profiles for select using (id = auth.uid() or public.is_operator());
drop policy if exists stores_public_read on public.stores;
create policy stores_public_read on public.stores for select using (status = 'published' or owner_id = auth.uid() or public.is_operator());
drop policy if exists stores_owner_insert on public.stores;
create policy stores_owner_insert on public.stores for insert with check (owner_id = auth.uid() or public.is_operator());
drop policy if exists stores_owner_update on public.stores;
create policy stores_owner_update on public.stores for update using (owner_id = auth.uid() or public.is_operator()) with check (owner_id = auth.uid() or public.is_operator());
drop policy if exists stores_owner_delete on public.stores;
create policy stores_owner_delete on public.stores for delete using (owner_id = auth.uid() or public.is_operator());

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select using ((not is_draft) and exists (select 1 from public.stores s where s.id = store_id and s.status = 'published') or exists (select 1 from public.stores s where s.id = store_id and (s.owner_id = auth.uid() or public.is_operator())));
drop policy if exists products_owner_insert on public.products;
create policy products_owner_insert on public.products for insert with check (exists (select 1 from public.stores s where s.id = store_id and (s.owner_id = auth.uid() or public.is_operator())));
drop policy if exists products_owner_update on public.products;
create policy products_owner_update on public.products for update using (exists (select 1 from public.stores s where s.id = store_id and (s.owner_id = auth.uid() or public.is_operator()))) with check (exists (select 1 from public.stores s where s.id = store_id and (s.owner_id = auth.uid() or public.is_operator())));
drop policy if exists products_owner_delete on public.products;
create policy products_owner_delete on public.products for delete using (exists (select 1 from public.stores s where s.id = store_id and (s.owner_id = auth.uid() or public.is_operator())));

 drop policy if exists imports_owner_read on public.imports;
create policy imports_owner_read on public.imports for select using (created_by = auth.uid() or exists (select 1 from public.stores s where s.id = store_id and (s.owner_id = auth.uid() or public.is_operator())));
drop policy if exists imports_owner_insert on public.imports;
create policy imports_owner_insert on public.imports for insert with check (created_by = auth.uid() and exists (select 1 from public.stores s where s.id = store_id and (s.owner_id = auth.uid() or public.is_operator())));
drop policy if exists imports_owner_update on public.imports;
create policy imports_owner_update on public.imports for update using (created_by = auth.uid() or public.is_operator());

drop policy if exists instagram_owner_access on public.instagram_connections;
create policy instagram_owner_access on public.instagram_connections for all using (exists (select 1 from public.stores s where s.id = store_id and (s.owner_id = auth.uid() or public.is_operator()))) with check (exists (select 1 from public.stores s where s.id = store_id and (s.owner_id = auth.uid() or public.is_operator())));

create or replace function public.commit_import(p_store_id uuid, p_import_id uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  imp public.imports%rowtype;
  item jsonb;
  existing_id uuid;
  default_currency char(3);
  imported integer := 0;
  sku_value text;
  title_value text;
  currency_value char(3);
  images text[];
begin
  select * into imp from public.imports where id = p_import_id and store_id = p_store_id for update;
  if not found then raise exception 'Import not found'; end if;
  if not (public.is_operator() or exists (select 1 from public.stores where id = p_store_id and owner_id = auth.uid())) then raise exception 'Not authorized'; end if;
  if imp.status = 'committed' then return jsonb_build_object('count', imp.imported_count, 'alreadyCommitted', true); end if;
  select currency into default_currency from public.stores where id = p_store_id;
  for item in select value from jsonb_array_elements(coalesce(imp.error_report->'validRows', '[]'::jsonb)) loop
    sku_value := nullif(trim(item->>'sku'), '');
    title_value := trim(item->>'title');
    currency_value := coalesce(nullif(upper(item->>'currency'), ''), default_currency);
    images := string_to_array(coalesce(item->>'image_url', ''), ',');
    select id into existing_id from public.products where store_id = p_store_id and ((sku_value is not null and sku = sku_value) or (sku_value is null and lower(trim(title)) = lower(title_value))) limit 1;
    if existing_id is null then
      insert into public.products (store_id, sku, title, description, price, currency, image_urls, category, availability, external_link) values (p_store_id, sku_value, title_value, nullif(item->>'description',''), coalesce((item->>'price')::numeric, 0), currency_value, images[1:5], nullif(item->>'category',''), case when coalesce(nullif(lower(trim(item->>'availability')), ''), 'in_stock') in ('yes','in_stock') then 'in_stock'::public.availability_status else 'out_of_stock'::public.availability_status end, nullif(item->>'external_link',''));
    else
      update public.products set sku = sku_value, title = title_value, description = nullif(item->>'description',''), price = coalesce((item->>'price')::numeric, 0), currency = currency_value, image_urls = images[1:5], category = nullif(item->>'category',''), availability = case when coalesce(nullif(lower(trim(item->>'availability')), ''), 'in_stock') in ('yes','in_stock') then 'in_stock'::public.availability_status else 'out_of_stock'::public.availability_status end, external_link = nullif(item->>'external_link','') where id = existing_id;
    end if;
    imported := imported + 1;
  end loop;
  update public.imports set imported_count = imported, status = 'committed' where id = p_import_id;
  return jsonb_build_object('count', imported, 'alreadyCommitted', false);
end; $$;

grant execute on function public.commit_import(uuid, uuid) to authenticated;

insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('store-logos', 'store-logos', true) on conflict (id) do nothing;

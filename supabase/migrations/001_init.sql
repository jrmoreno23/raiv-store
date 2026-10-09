-- RAIV STORE · Etapa 1 · Tablas, seguridad (RLS) y almacenamiento de fotos
-- Pega TODO este archivo en Supabase > SQL Editor > Run.

create extension if not exists pgcrypto;

-- 1) Administradores: solo quien esté en esta tabla puede modificar la tienda
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2) Categorías
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  emoji text not null default '🛍️',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- 3) Productos
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null check (char_length(name) between 2 and 140),
  description text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  price numeric(10,2) not null check (price >= 0),
  wholesale_price numeric(10,2) check (wholesale_price is null or wholesale_price >= 0),
  wholesale_min int check (wholesale_min is null or wholesale_min >= 1),
  stock int not null default 0 check (stock >= 0),          -- nunca negativo
  status text not null default 'draft' check (status in ('published','hidden','draft')),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_status_idx on public.products(status, created_at desc);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- 4) Fotos de cada producto (position 0 = portada)
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  path text not null,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images(product_id, position);

-- 5) RLS: visitantes SOLO leen lo publicado; solo el admin escribe
alter table public.admins          enable row level security;
alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.product_images  enable row level security;

drop policy if exists admins_self_read on public.admins;
create policy admins_self_read on public.admins for select to authenticated using (user_id = auth.uid());

drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select to anon, authenticated using (true);
drop policy if exists categories_admin on public.categories;
create policy categories_admin on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_read on public.products;
create policy products_read on public.products for select to anon, authenticated
  using (status = 'published' or public.is_admin());
drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists images_read on public.product_images;
create policy images_read on public.product_images for select to anon, authenticated
  using (public.is_admin() or exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
drop policy if exists images_admin_write on public.product_images;
create policy images_admin_write on public.product_images for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 6) Almacenamiento de fotos (bucket público para ver, solo admin para subir/borrar)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images','product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "raiv_img_insert" on storage.objects;
create policy "raiv_img_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "raiv_img_update" on storage.objects;
create policy "raiv_img_update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "raiv_img_delete" on storage.objects;
create policy "raiv_img_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- 7) Categorías iniciales (las de tu catálogo actual)
insert into public.categories (name, emoji, sort) values
  ('Maquillaje','💄',1),('Juguetes','🧸',2),('Organizadores','🗂️',3),
  ('Accesorios','🎀',4),('Joyería','💎',5),('Ropa','👗',6),('Productos de Bebé','🍼',7)
on conflict (name) do nothing;

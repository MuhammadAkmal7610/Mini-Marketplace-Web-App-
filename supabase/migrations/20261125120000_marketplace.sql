create extension if not exists pgcrypto;

create table if not exists public.users (
  id text primary key,
  name text not null check (char_length(name) between 2 and 80),
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  role text not null check (role in ('buyer', 'seller', 'admin')),
  status text not null check (status in ('pending', 'approved', 'hidden')),
  created_at timestamptz not null default now()
);

create unique index if not exists one_marketplace_admin
  on public.users (role) where role = 'admin';

create table if not exists public.sessions (
  token_hash text primary key,
  user_id text not null references public.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on public.sessions (user_id);
create index if not exists sessions_expires_at_idx on public.sessions (expires_at);

create table if not exists public.products (
  id text primary key,
  seller_id text references public.users(id) on delete set null,
  seller_name text not null,
  title text not null check (char_length(title) between 3 and 120),
  base_price numeric(12, 2) not null check (base_price >= 0),
  compare_at_price numeric(12, 2) not null check (compare_at_price >= base_price),
  description text not null default '',
  category text not null,
  images jsonb not null default '[]'::jsonb
    check (jsonb_typeof(images) = 'array'),
  options jsonb not null
    check (jsonb_typeof(options) = 'object'),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_status_idx on public.products (status);
create index if not exists products_seller_id_idx on public.products (seller_id);

create table if not exists public.orders (
  id text primary key,
  buyer_id text not null references public.users(id),
  buyer_name text not null,
  buyer_email text not null,
  address text not null,
  status text not null default 'New'
    check (status in ('New', 'Confirmed', 'Shipped', 'Delivered')),
  created_at timestamptz not null default now(),
  total numeric(12, 2) not null check (total >= 0),
  items jsonb not null check (jsonb_typeof(items) = 'array')
);

create index if not exists orders_buyer_id_idx on public.orders (buyer_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

revoke all on table public.users from public, anon, authenticated;
revoke all on table public.sessions from public, anon, authenticated;
revoke all on table public.orders from public, anon, authenticated;
grant all on table public.users to service_role;
grant all on table public.sessions to service_role;
grant all on table public.orders to service_role;

revoke all on table public.products from public, anon, authenticated;
grant select on table public.products to anon, authenticated;
grant all on table public.products to service_role;

drop policy if exists "Anyone can view approved marketplace listings"
  on public.products;
create policy "Anyone can view approved marketplace listings"
  on public.products
  for select
  to anon, authenticated
  using (status = 'approved');

insert into public.products (
  id,
  seller_name,
  title,
  base_price,
  compare_at_price,
  description,
  category,
  images,
  options,
  status
)
values (
  'prague-divan-bed',
  'Demo Seller',
  'Prague Divan Bed',
  269.99,
  539.98,
  'A softly upholstered divan bed with a clean, tailored finish. Choose your fabric colour, size, storage, headboard and base to make it yours.',
  'Furniture > Divan Beds',
  '[
    "/images/divan-front.svg",
    "/images/divan-angle.svg",
    "/images/divan-detail.svg",
    "/images/divan-storage.svg",
    "/images/divan-room.svg"
  ]'::jsonb,
  $options${
    "colors": [
      {"name":"Cream Naples","hex":"#e9e2d4"},
      {"name":"Beige Naples","hex":"#c9b9a2"},
      {"name":"Silver Naples","hex":"#c4c6c5"},
      {"name":"Grey Naples","hex":"#858582"},
      {"name":"Charcoal Naples","hex":"#4b4a49"},
      {"name":"Black Naples","hex":"#272626"},
      {"name":"Brown Naples","hex":"#755d4d"},
      {"name":"Blue Naples","hex":"#657783"}
    ],
    "sizes": [
      {"label":"Small Single 2FT6","extraPrice":90},
      {"label":"Single 3FT","extraPrice":95},
      {"label":"Small Double 4FT","extraPrice":100},
      {"label":"Double 4FT6","extraPrice":110},
      {"label":"King 5FT","extraPrice":125},
      {"label":"Super King 6FT","extraPrice":150}
    ],
    "storage": [
      {"label":"No Storage","extraPrice":0},
      {"label":"2 Drawers Left Side","extraPrice":50},
      {"label":"2 Drawers Right Side","extraPrice":45},
      {"label":"2 Drawers Foot End","extraPrice":155},
      {"label":"4 Drawers","extraPrice":210}
    ],
    "headboards": [
      {"label":"FREE 26\" Headboard","extraPrice":0},
      {"label":"54\" Floor Standing Headboard","extraPrice":10}
    ],
    "bases": [
      {"label":"Standard Base (holds 50 stone)","extraPrice":0},
      {"label":"Reinforced Base (holds 100 stone)","extraPrice":25}
    ],
    "assemblyPrice":39.99
  }$options$::jsonb,
  'approved'
)
on conflict (id) do nothing;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view marketplace product photos"
  on storage.objects;
create policy "Anyone can view marketplace product photos"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Marketplace server can manage product photos"
  on storage.objects;
create policy "Marketplace server can manage product photos"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

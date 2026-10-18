-- Enable UUID extension if needed
create extension if not exists "uuid-ossp";

-- 1. Create the products table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10, 2) not null,
  image_url text,
  stock integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.products enable row level security;

-- 3. Create a public read policy so frontend clients can query products
create policy "Allow public read access on products"
  on public.products
  for select
  using (true);

-- 4. Seed sample e-commerce products
insert into public.products (name, description, price, image_url, stock)
values
  (
    'AeroFlow Running Shoes',
    'Lightweight, breathable engineered mesh with responsive nitrogen-infused foam cushioning.',
    2499.00,
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80',
    45
  ),
  (
    'SonicPro Wireless Headphones',
    'Premium studio-grade sound with active noise cancellation and 40-hour battery life.',
    4999.00,
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
    30
  ),
  (
    'Classic Heavyweight Cotton T-Shirt',
    'Relaxed fit crafted from 100% combed organic ring-spun cotton with reinforced collar.',
    799.00,
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
    120
  ),
  (
    'Vanguard Minimalist Chrono Watch',
    'Surgical grade 316L stainless steel case with sapphire crystal glass and genuine leather strap.',
    3499.00,
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
    25
  ),
  (
    'Everyday Commuter Leather Backpack',
    'Weatherproof waxed canvas and vegetable-tanned leather backpack with 16-inch laptop compartment.',
    2999.00,
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80',
    18
  );

-- 5. Create orders table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null default 'Customer',
  customer_email text,
  customer_phone text,
  total_price numeric(10, 2) not null,
  status text not null default 'Pending', -- 'Pending', 'Processing', 'Shipped', 'Delivered'
  razorpay_payment_id text,
  razorpay_order_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Create order_items table
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id text,
  product_name text not null,
  quantity integer not null default 1,
  unit_price numeric(10, 2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Enable RLS on orders & order_items
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- 8. RLS Policies for orders (allow public insert, select, and update for admin/users)
create policy "Allow all access on orders"
  on public.orders
  for all
  using (true)
  with check (true);

create policy "Allow all access on order_items"
  on public.order_items
  for all
  using (true)
  with check (true);

-- 9. Create public storage bucket for product-images if not exists
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Policy to allow public viewing of product images
create policy "Allow public viewing of product images"
  on storage.objects
  for select
  using (bucket_id = 'product-images');

-- Policy to allow uploads to product-images bucket
create policy "Allow image uploads to product-images bucket"
  on storage.objects
  for insert
  with check (bucket_id = 'product-images');



-- =============================================
-- reviv.ai — Supabase SQL Setup
-- Cole no SQL Editor do Supabase e Execute
-- =============================================

-- 1. Users table (extends auth.users)
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  plan text not null default 'free' check (plan in ('free','subscription','package')),
  credits integer not null default 0,
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

-- 2. Photos table
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  original_url text not null,
  restored_url text,
  status text not null default 'pending' check (status in ('pending','processing','done','error')),
  model_used text,
  diagnosis text,
  created_at timestamptz not null default now()
);

-- 3. Orders table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null check (type in ('per_photo','subscription','package')),
  stripe_id text unique,
  amount integer not null default 0,
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  created_at timestamptz not null default now()
);

-- 4. RLS Policies
alter table public.users  enable row level security;
alter table public.photos enable row level security;
alter table public.orders enable row level security;

create policy "users_own" on public.users  for all using (auth.uid() = id);
create policy "photos_own" on public.photos for all using (auth.uid() = user_id);
create policy "orders_own" on public.orders for all using (auth.uid() = user_id);

-- 5. Functions
create or replace function debit_credit(user_id_param uuid)
returns void language plpgsql security definer as $$
begin
  update public.users
  set credits = greatest(credits - 1, 0)
  where id = user_id_param and credits > 0;
end;
$$;

create or replace function add_credits(user_id_param uuid, amount int)
returns void language plpgsql security definer as $$
begin
  update public.users
  set credits = credits + amount
  where id = user_id_param;
end;
$$;

-- 6. Storage bucket
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict do nothing;

create policy "photos_upload" on storage.objects
  for insert with check (bucket_id = 'photos' and auth.role() = 'authenticated');

create policy "photos_public_read" on storage.objects
  for select using (bucket_id = 'photos');

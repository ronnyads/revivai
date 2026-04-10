-- =============================================
-- reviv.ai — Migration: plans + settings tables
-- Cole no SQL Editor do Supabase e Execute
-- =============================================

-- Plans table (admin-configurable pricing)
create table if not exists public.plans (
  id text primary key,  -- 'perPhoto' | 'subscription' | 'package'
  name text not null,
  price numeric(10,2) not null,
  credits integer not null default 1,
  description text,
  updated_at timestamptz default now()
);

-- Seed default plans (idempotent)
insert into public.plans (id, name, price, credits, description) values
  ('perPhoto',     'Restauração Avulsa',  19.00,  1,  '1 foto restaurada com IA em alta resolução'),
  ('subscription', 'Assinatura Mensal',   59.00,  10, '10 fotos por mês + histórico + download 4K'),
  ('package',      'Pacote 10 Créditos', 129.00,  10, '10 créditos sem expiração, use quando quiser')
on conflict (id) do nothing;

-- Settings table (key/value for global config)
create table if not exists public.settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

-- RLS: only service role can read/write
alter table public.plans enable row level security;
alter table public.settings enable row level security;

-- No public read on settings (pixel id is safe but let's keep it server-side only)
create policy "service only" on public.plans for all using (false);
create policy "service only" on public.settings for all using (false);

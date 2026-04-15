-- ─────────────────────────────────────────────────────────────────────────────
-- Studio v2: posições de nós no canvas + tabela de conexões
-- ─────────────────────────────────────────────────────────────────────────────

-- Posição dos nós no canvas
alter table public.studio_assets
  add column if not exists position_x float not null default 0,
  add column if not exists position_y float not null default 0;

-- Conexões entre nós (arestas do canvas)
create table if not exists public.studio_connections (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.studio_projects(id) on delete cascade not null,
  source_id     uuid references public.studio_assets(id)   on delete cascade not null,
  target_id     uuid references public.studio_assets(id)   on delete cascade not null,
  source_handle text not null default 'output',
  target_handle text not null,
  created_at    timestamptz not null default now()
);

alter table public.studio_connections enable row level security;

create policy "connections_own"
  on public.studio_connections for all
  using (
    exists (
      select 1 from public.studio_projects
      where id = project_id and user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Ad Studio — Schema completo (versão corrigida e atualizada)
-- Execute no Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Studio Projects
create table if not exists public.studio_projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users(id) on delete cascade not null,
  title       text not null default 'Novo Projeto',
  template    text not null default 'blank'
                check (template in ('blank','before_after','testimonial','product_showcase')),
  status      text not null default 'draft'
                check (status in ('draft','ready')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.studio_projects enable row level security;

create policy "studio_projects_own"
  on public.studio_projects for all
  using (auth.uid() = user_id);

-- Studio Assets (todos os tipos + posição no canvas)
create table if not exists public.studio_assets (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.studio_projects(id) on delete cascade not null,
  user_id       uuid references public.users(id) on delete cascade not null,
  type          text not null
                  check (type in ('image','video','voice','upscale','script','caption','model','animate','compose','render')),
  status        text not null default 'idle'
                  check (status in ('idle','processing','done','error')),
  input_params  jsonb not null default '{}',
  result_url    text,
  last_frame_url text,
  error_msg     text,
  credits_cost  integer not null default 1,
  board_order   integer not null default 0,
  position_x    float default 0,
  position_y    float default 0,
  created_at    timestamptz not null default now()
);

alter table public.studio_assets enable row level security;

create policy "studio_assets_own"
  on public.studio_assets for all
  using (auth.uid() = user_id);

-- Studio Connections (arestas do canvas React Flow)
create table if not exists public.studio_connections (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid references public.studio_projects(id) on delete cascade not null,
  source_id     uuid not null,
  target_id     uuid not null,
  source_handle text not null default 'output',
  target_handle text not null,
  created_at    timestamptz not null default now()
);

alter table public.studio_connections enable row level security;

create policy "studio_connections_own"
  on public.studio_connections for all
  using (
    auth.uid() = (
      select user_id from public.studio_projects
      where id = project_id
    )
  );

-- ElevenLabs voice_id por usuário (clonagem de voz)
alter table public.users
  add column if not exists elevenlabs_voice_id text;

-- Bucket studio (público — imagens, vídeos, vozes gerados)
insert into storage.buckets (id, name, public)
  values ('studio', 'studio', true)
  on conflict (id) do nothing;

create policy "studio_upload"
  on storage.objects for insert
  with check (bucket_id = 'studio' and auth.role() = 'authenticated');

create policy "studio_public_read"
  on storage.objects for select
  using (bucket_id = 'studio');

create policy "studio_delete_own"
  on storage.objects for delete
  using (bucket_id = 'studio' and auth.uid()::text = (storage.foldername(name))[1]);

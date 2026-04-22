create table if not exists public.prompt_categories (
  name text primary key check (length(trim(name)) > 0),
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.prompt_categories (name, sort_order)
values
  ('Fantasia Cinematica', 1),
  ('Moda High-End', 2),
  ('Lifestyle Urbano', 3),
  ('Influencer Corredora', 4),
  ('Influencer + Produto', 5),
  ('Influencer Academia', 6)
on conflict (name) do nothing;

insert into public.prompt_categories (name, sort_order)
select
  trim(category) as name,
  coalesce(min(sort_order), 0) as sort_order
from public.prompt_templates
where trim(coalesce(category, '')) <> ''
group by trim(category)
on conflict (name) do update
set
  sort_order = least(public.prompt_categories.sort_order, excluded.sort_order),
  updated_at = now();

alter table if exists public.prompt_templates
  drop constraint if exists prompt_templates_category_fkey;

alter table if exists public.prompt_templates
  add constraint prompt_templates_category_fkey
  foreign key (category)
  references public.prompt_categories(name)
  on update cascade
  on delete cascade;

create index if not exists prompt_categories_sort_idx
  on public.prompt_categories (sort_order, name);

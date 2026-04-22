alter table public.prompt_templates
  add column if not exists generation_mode text not null default 'identity_scene'
    check (generation_mode in ('identity_scene', 'product_model', 'virtual_tryon')),
  add column if not exists input_mode text not null default 'single_image'
    check (input_mode in ('single_image', 'person_and_product')),
  add column if not exists required_images_count integer not null default 1,
  add column if not exists credit_cost integer not null default 12,
  add column if not exists usage_label text,
  add column if not exists identity_lock boolean not null default true;

update public.prompt_templates
set
  generation_mode = case
    when coalesce(category, '') ilike '%produto%' then 'product_model'
    else 'identity_scene'
  end,
  input_mode = case
    when coalesce(category, '') ilike '%produto%' then 'person_and_product'
    else 'single_image'
  end,
  required_images_count = case
    when coalesce(category, '') ilike '%produto%' then 2
    else 1
  end,
  credit_cost = coalesce(credit_cost, 12),
  usage_label = coalesce(
    nullif(trim(usage_label), ''),
    case
      when coalesce(category, '') ilike '%produto%' then 'Envie a foto da modelo e do produto.'
      else 'Envie sua foto e gere no mesmo estilo.'
    end
  ),
  identity_lock = coalesce(identity_lock, true)
where true;

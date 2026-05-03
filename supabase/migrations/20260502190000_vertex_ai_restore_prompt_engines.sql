alter table if exists public.restoration_modes
  add column if not exists engine_profile text;

update public.restoration_modes
set engine_profile = case
  when lower(coalesce(name, '')) like '%grupo%' then 'vertex_imagen4_ultra'
  when lower(coalesce(name, '')) like '%famil%' then 'vertex_imagen4_ultra'
  when lower(coalesce(name, '')) like '%leve%' then 'vertex_imagen4_fast'
  when coalesce(model, '') = 'gemini-2.0-flash-preview-image-generation' then 'vertex_imagen4_fast'
  when coalesce(model, '') = 'gemini-2.0-flash-exp-image-generation' then 'vertex_imagen4'
  when coalesce(model, '') = 'gemini-2.5-flash-image' then 'vertex_imagen4_ultra'
  else coalesce(engine_profile, 'vertex_imagen4_ultra')
end
where engine_profile is null;

alter table if exists public.prompt_templates
  add column if not exists engine_profile text;

update public.prompt_templates
set engine_profile = case
  when generation_mode = 'virtual_tryon' then 'vertex_vto'
  when generation_mode = 'product_model' then 'vertex_imagen4'
  else 'vertex_imagen4_ultra'
end
where engine_profile is null;

alter table if exists public.photos
  add column if not exists engine_profile text,
  add column if not exists analysis_model_id text,
  add column if not exists render_model_id text,
  add column if not exists upscale_model_id text,
  add column if not exists target_model_id text,
  add column if not exists photo_type text,
  add column if not exists restoration_risk text,
  add column if not exists confidence_flag text;

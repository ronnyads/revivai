alter table if exists public.prompt_templates
  add column if not exists outfit_source text not null default 'identity'
    check (outfit_source in ('identity', 'template'));

update public.prompt_templates
set outfit_source = 'identity'
where outfit_source is null
   or outfit_source not in ('identity', 'template');

update public.prompt_templates
set outfit_source = 'template'
where lower(title) in (
  'selfie com mario',
  'selfie com luigi',
  'selfie com a princesa',
  'selfie com kong academia',
  'rei bowser koopa',
  'yoshi'
);

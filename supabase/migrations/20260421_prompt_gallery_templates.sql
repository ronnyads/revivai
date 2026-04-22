create table if not exists public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null,
  format text not null default 'TEXT' check (format in ('TEXT', 'JSON')),
  prompt text not null,
  cover_image_url text,
  example_images text[] not null default '{}'::text[],
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prompt_templates_visible_sort_idx
  on public.prompt_templates (is_visible, sort_order, created_at desc);

insert into public.prompt_templates
  (title, description, category, format, prompt, cover_image_url, example_images, is_visible, sort_order)
values
  (
    'Alpha Fitness Elite',
    'Parametros otimizados para iluminacao volumetrica e definicao muscular em ambientes de treino indoor.',
    'Influencer Academia',
    'JSON',
    '{"scene":"high-tech modern gym with blue neon lighting","subject":"fit athletic woman mid-workout","lighting":"volumetric rim light, dramatic highlights, clean skin texture","camera":"85mm, shallow depth of field, premium ad composition","mood":"discipline, aspiration, elite performance"}',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD7ogBWK0zY2_HtFED56kMiV5FnPJxW6GpfHETUgANVgewdVfiHVyEW3-iVs07Qp1tzEoIQrvQFckXlUVq_8ZmxGsTAs8xJ3VqS-O3FAptDeveC1H5Ia0QThiNN_Jkg-sJkPJYNiRPPA2Cu3D1BdIsyxwGmG-bCOvNx-3wuIrz1sklMCK96-T6GhU_8l7Sr1AWv718mLPgIO7i8pLYti83jQrkwRaOmHxTrvQQMtpJhWg7x_IjfLbVTHVCM9jF1ZSRWonvrKufWy9gS',
    array['https://lh3.googleusercontent.com/aida-public/AB6AXuD7ogBWK0zY2_HtFED56kMiV5FnPJxW6GpfHETUgANVgewdVfiHVyEW3-iVs07Qp1tzEoIQrvQFckXlUVq_8ZmxGsTAs8xJ3VqS-O3FAptDeveC1H5Ia0QThiNN_Jkg-sJkPJYNiRPPA2Cu3D1BdIsyxwGmG-bCOvNx-3wuIrz1sklMCK96-T6GhU_8l7Sr1AWv718mLPgIO7i8pLYti83jQrkwRaOmHxTrvQQMtpJhWg7x_IjfLbVTHVCM9jF1ZSRWonvrKufWy9gS'],
    true,
    1
  ),
  (
    'Cyber Vogue Editorial',
    'Controle de exposicao de alto contraste e texturas metalicas para editoriais de moda futurista.',
    'Moda High-End',
    'TEXT',
    'High fashion editorial portrait of a woman in a metallic silver dress against a brutalist concrete wall at night, ultra-premium styling, high contrast shadows, cyan edge light, cinematic texture, luxury magazine framing, obsidian mood, sharp textile detail.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAKWnOHuMDRVk3M4byLqnfo-V-Rs04FLvoYui6LjTgzVCbCKLcgXfa3c1iZtRxOwy2Vh7zIUUbyuGtJ3iDU3fkReCdCyr9NmJcaedUcttv1dhAPGClJlHAc5pBujYrlKHcBc_BPiFyKpniRqmM3PFosPeEaIJl3OgpU4ySUskS3lnCuMe9XuGWZCBdznfGw9Pyk3gsqFySYjyRC7jkchK92O-GB4xSCnFKisvlIMX6QCmVdWlK07RG37gah9gu_ZNV9z2xk69cLi77S',
    array['https://lh3.googleusercontent.com/aida-public/AB6AXuAKWnOHuMDRVk3M4byLqnfo-V-Rs04FLvoYui6LjTgzVCbCKLcgXfa3c1iZtRxOwy2Vh7zIUUbyuGtJ3iDU3fkReCdCyr9NmJcaedUcttv1dhAPGClJlHAc5pBujYrlKHcBc_BPiFyKpniRqmM3PFosPeEaIJl3OgpU4ySUskS3lnCuMe9XuGWZCBdznfGw9Pyk3gsqFySYjyRC7jkchK92O-GB4xSCnFKisvlIMX6QCmVdWlK07RG37gah9gu_ZNV9z2xk69cLi77S'],
    true,
    2
  ),
  (
    'Urban Pulse Shoes',
    'Macro fotografia de calcados com foco em materiais premium e reflexos de asfalto molhado.',
    'Lifestyle Urbano',
    'JSON',
    '{"subject":"premium sneakers","scene":"wet asphalt street with city neon reflections","style":"macro product ad","lighting":"blue rim light with glossy reflections","focus":"materials, sole texture, water highlights","mood":"urban night energy"}',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAkBIDJmMlZseKi8if57hIhGq-EkWd96dVA1CKqn3h9rzWqI1icyQ9lGLvmYDK8yjm1opMtYPhAyxtuHURJdlkMjvtuqLDDgTN5P4-MiLLAIzpmYP5S7yay3tERzdiZAiK_NroI7voGRZ-zW3xUo-_IiD6uvwoCZPXAjMixb4nEH9YywL3mGmGGp0IfRBZKlhi0ZnpUye1V623l5o9a1tiu2JVwGG-WTpFNnwEO0wRAuG0en6lnYjPN45GbkoATQnJaSHnRoOSD4v0V',
    array['https://lh3.googleusercontent.com/aida-public/AB6AXuAkBIDJmMlZseKi8if57hIhGq-EkWd96dVA1CKqn3h9rzWqI1icyQ9lGLvmYDK8yjm1opMtYPhAyxtuHURJdlkMjvtuqLDDgTN5P4-MiLLAIzpmYP5S7yay3tERzdiZAiK_NroI7voGRZ-zW3xUo-_IiD6uvwoCZPXAjMixb4nEH9YywL3mGmGGp0IfRBZKlhi0ZnpUye1V623l5o9a1tiu2JVwGG-WTpFNnwEO0wRAuG0en6lnYjPN45GbkoATQnJaSHnRoOSD4v0V'],
    true,
    3
  ),
  (
    'Neon Horizon Runner',
    'Captura de movimento em alta velocidade com luz de preenchimento solar e silhuetas nitidas.',
    'Influencer Corredora',
    'TEXT',
    'Male runner in silhouette against a vibrant sunrise over a futuristic city bridge, premium sports campaign, strong motion energy, crisp silhouette, golden atmosphere, cinematic long-lens framing, subtle neon reflections, aspirational performance mood.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAYck0Htykjg-R1WQvHsmoFXf6sogvvjEqAkyiskMmerS8viHLLt1xEzouQH9PxCXC8B3q2X1mUMf_TPQE6AW9PvDGGBApkkmmffVr0ZwuGUlh5iPWM-9NVjh4zxRhPoVowjwLYLtawopMzDiGQqDY8_F9tnW1uLDds07rHGsnfVFHGIdjSirLLInv_BZvvKgWxPd6ebEPiFJ_WDSne7_Op3O86eW8fqiF1o8mzgC5htPrz3Bl1yetQZAETo2ds_yT4QlzhS7Y9DpaH',
    array['https://lh3.googleusercontent.com/aida-public/AB6AXuAYck0Htykjg-R1WQvHsmoFXf6sogvvjEqAkyiskMmerS8viHLLt1xEzouQH9PxCXC8B3q2X1mUMf_TPQE6AW9PvDGGBApkkmmffVr0ZwuGUlh5iPWM-9NVjh4zxRhPoVowjwLYLtawopMzDiGQqDY8_F9tnW1uLDds07rHGsnfVFHGIdjSirLLInv_BZvvKgWxPd6ebEPiFJ_WDSne7_Op3O86eW8fqiF1o8mzgC5htPrz3Bl1yetQZAETo2ds_yT4QlzhS7Y9DpaH'],
    true,
    4
  )
on conflict do nothing;

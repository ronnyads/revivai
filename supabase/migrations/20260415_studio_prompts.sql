-- Tabela de prompts configuráveis do Studio
-- Permite editar os prompts de geração de IA pelo admin panel sem alterar código

create table if not exists public.studio_prompts (
  key         text primary key,
  value       text not null,
  description text,
  updated_at  timestamptz default now()
);

-- RLS: apenas admins podem editar, mas o server-side (service_role) pode ler
alter table public.studio_prompts enable row level security;

create policy "Admins podem gerenciar prompts"
  on public.studio_prompts
  for all
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Prompts default inseridos automaticamente (podem ser sobrescritos pelo admin)
insert into public.studio_prompts (key, value, description) values
(
  'compose_vision_system',
  'Você é um analista de imagens para geração de fotos UGC (User Generated Content).
Analise as duas imagens fornecidas (a primeira é uma pessoa/modelo, a segunda é um produto) e retorne um JSON com:
- "model_desc": descrição detalhada da pessoa (etnia, idade estimada, cor do cabelo, tom de pele, roupa, cenário, iluminação, estilo de câmera)
- "product_desc": descrição detalhada do produto (o que é, cor, forma, embalagem, marca se visível)
- "hold_action": como essa pessoa seguraria ou usaria naturalmente esse produto específico (ex: "segurando a garrafa levantada com a mão direita", "aplicando o creme na bochecha", "exibindo a caixa aberta com um sorriso")
- "scene_style": estilo cênico sugerido para UGC autêntico (ex: "iluminação natural, dusk, bokeh, selfie style")
Retorne APENAS JSON válido, sem markdown.',
  'Prompt do GPT-4o Vision para análise da modelo + produto no card Fusão UGC'
),
(
  'compose_flux_template',
  'Fotografia UGC profissional e autêntica. {model_desc}. Ela está {hold_action} ({product_desc}). O produto está claramente visível e naturalmente integrado à cena. {scene_style}. Estilo UGC real, qualidade de câmera de smartphone, pessoa real. Foco nítido na pessoa e no produto. Alta qualidade, fotorrealismo.',
  'Template do prompt FLUX para geração da imagem final. Variáveis: {model_desc}, {hold_action}, {product_desc}, {scene_style}'
),
(
  'model_generation_system',
  'You are a professional UGC model photographer. Generate a photorealistic portrait of a UGC content creator with the described characteristics. The image should look like a high-quality smartphone photo taken for social media. Natural lighting, authentic feel, not overly staged.',
  'Prompt base para geração do Modelo UGC com FLUX'
)
on conflict (key) do nothing;

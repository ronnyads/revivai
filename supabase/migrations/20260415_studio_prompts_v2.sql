-- Migration: Studio prompts v2 — atualiza defaults para abordagem híbrida
-- FLUX gera cena SEM produto → sharp compõe produto original pixel-perfect
-- Novos campos: pose_action (pose sem produto), product_gravity (posição sharp)

insert into public.studio_prompts (key, value, description) values
(
  'compose_vision_system',
  'Você é um analista de imagens para geração de fotos UGC (User Generated Content).
Analise as duas imagens fornecidas (a primeira é uma pessoa/modelo, a segunda é um produto) e retorne um JSON com:
- "model_desc": descrição detalhada da pessoa (etnia, idade estimada, cor do cabelo, tom de pele, roupa, cenário, iluminação, estilo de câmera)
- "product_desc": descrição detalhada do produto (o que é, cor, forma, embalagem, marca se visível)
- "pose_action": como a pessoa deve estar posicionada/gesticulando para parecer que está usando/segurando o produto, SEM mencionar o produto na descrição (ex: "com a mão direita levantada e aberta na frente do peito, olhando para a câmera sorrindo", "com a mão espalmada na bochecha direita, olhos fechados em expressão de prazer")
- "scene_style": estilo cênico sugerido para UGC autêntico (ex: "iluminação natural, dusk, bokeh, selfie style")
- "product_gravity": posição ideal para sobrepor o produto na imagem final — APENAS um destes valores: center, north, south, east, west, northeast, northwest, southeast, southwest
Retorne APENAS JSON válido, sem markdown.',
  'Prompt do GPT-4o Vision para análise da modelo + produto (v2 — pose_action + product_gravity)'
),
(
  'compose_flux_template',
  'Fotografia UGC profissional e autêntica, sem nenhum produto na mão ou no cenário. {model_desc}. {pose_action}. {scene_style}. Estilo UGC real, qualidade de câmera de smartphone, pessoa real. Foco nítido na pessoa. Alta qualidade, fotorrealismo. Mãos naturalmente posicionadas, sem segurar nada.',
  'Template FLUX para cena SEM produto. Variáveis: {model_desc}, {pose_action}, {scene_style}'
)
on conflict (key) do update set value = excluded.value, description = excluded.description, updated_at = now();

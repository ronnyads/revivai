export type PromptTemplateFormat = 'JSON' | 'TEXT'
export type PromptGenerationMode = 'identity_scene' | 'product_model' | 'virtual_tryon'
export type PromptInputMode = 'single_image' | 'person_and_product'
export type PromptOutfitSource = 'identity' | 'template'

export const PENDING_GENERATION_STORAGE_KEY = 'revivai-pending-generation-template'
export const HERO_SELFIE_TEMPLATE_ID = 'alpha-fitness-elite'

export interface PromptGalleryTemplate {
  id: string
  title: string
  description: string
  category: string
  format: PromptTemplateFormat
  prompt: string
  coverImageUrl: string
  exampleImages: string[]
  isVisible: boolean
  sortOrder: number
  generationMode: PromptGenerationMode
  inputMode: PromptInputMode
  requiredImagesCount: number
  creditCost: number
  usageLabel: string
  identityLock: boolean
  outfitSource: PromptOutfitSource
}

export type ClientPromptGalleryTemplate = Omit<PromptGalleryTemplate, 'prompt'>

export interface PendingPromptGenerationSession {
  templateId: string
  title: string
  category: string
  prompt: string
  generationMode: PromptGenerationMode
  inputMode: PromptInputMode
  requiredImagesCount: number
  creditCost: number
  usageLabel: string
  identityLock: boolean
  outfitSource: PromptOutfitSource
  uploadedUrls: string[]
}

export interface PromptTemplateRow {
  id: string
  title: string
  description: string | null
  category: string | null
  format: PromptTemplateFormat | null
  prompt: string
  cover_image_url: string | null
  example_images: string[] | null
  is_visible: boolean | null
  sort_order: number | null
  generation_mode: string | null
  input_mode: string | null
  required_images_count: number | null
  credit_cost: number | null
  usage_label: string | null
  identity_lock: boolean | null
  outfit_source: string | null
}

export interface PromptCategoryRow {
  name: string | null
  is_visible: boolean | null
  sort_order: number | null
}

const HERO_SELFIE_PROMPT = `Create a cinematic smartphone selfie in a modern city street with four iconic heroic characters standing behind the main subject: a spider-themed hero in a red and blue suit, a red and gold armored hero, a large green super-strong hero, and an ice queen in a blue dress. Replace the original child completely with the person from person[1] as the exclusive identity reference. Preserve the exact face, bone structure, age appearance, skin tone, hair, expression, body proportions and overall identity from the uploaded photo. The uploaded person must be the only real human subject in the foreground taking the selfie with one arm extended toward the camera. Do not keep any trace of the original child from the example scene. Commercial cinematic lighting, natural daylight, shallow depth of field, soft bokeh, highly realistic integration, fun heroic family-friendly atmosphere, Hasselblad H6D, Zeiss Otus 85mm f/1.4, Kodak Portra 400, film grain, 8K.`

const CANONICAL_TEMPLATE_OVERRIDES = {
  [HERO_SELFIE_TEMPLATE_ID]: {
    title: 'Selfie Heroica com Personagens',
    description: 'Envie qualquer rosto e transforme a pessoa em uma selfie cinematografica com personagens heroicos ao fundo.',
    category: 'Fantasia Cinematica',
    format: 'TEXT' as PromptTemplateFormat,
    prompt: HERO_SELFIE_PROMPT,
    generationMode: 'identity_scene' as PromptGenerationMode,
    inputMode: 'single_image' as PromptInputMode,
    requiredImagesCount: 1,
    creditCost: 12,
    usageLabel: 'Envie 1 foto da pessoa. O sistema troca o sujeito da selfie pela referencia enviada.',
    identityLock: true,
    outfitSource: 'identity' as PromptOutfitSource,
  },
} satisfies Partial<Record<string, Partial<PromptGalleryTemplate>>>

const DEFAULT_SCENE_PRESET = {
  generationMode: 'identity_scene' as const,
  inputMode: 'single_image' as const,
  requiredImagesCount: 1,
  creditCost: 12,
  usageLabel: 'Envie sua foto e gere no mesmo estilo.',
  identityLock: true,
  outfitSource: 'identity' as const,
}

const DEFAULT_PRODUCT_PRESET = {
  generationMode: 'product_model' as const,
  inputMode: 'person_and_product' as const,
  requiredImagesCount: 2,
  creditCost: 12,
  usageLabel: 'Envie a foto da modelo e do produto.',
  identityLock: true,
  outfitSource: 'identity' as const,
}

function normalizeOutfitSource(value: string | null | undefined): PromptOutfitSource {
  return value === 'template' ? 'template' : 'identity'
}

function inferPresetFromCategory(category: string | null | undefined) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized.includes('produto')) return DEFAULT_PRODUCT_PRESET
  return DEFAULT_SCENE_PRESET
}

function normalizeGenerationMode(value: string | null | undefined, category: string | null | undefined): PromptGenerationMode {
  if (value === 'identity_scene' || value === 'product_model' || value === 'virtual_tryon') {
    return value
  }

  return inferPresetFromCategory(category).generationMode
}

function normalizeInputMode(value: string | null | undefined, generationMode: PromptGenerationMode): PromptInputMode {
  if (value === 'single_image' || value === 'person_and_product') return value
  return generationMode === 'product_model' || generationMode === 'virtual_tryon' ? 'person_and_product' : 'single_image'
}

function buildTemplate(
  template: Omit<PromptGalleryTemplate, 'generationMode' | 'inputMode' | 'requiredImagesCount' | 'creditCost' | 'usageLabel' | 'identityLock' | 'outfitSource'> &
    Partial<Pick<PromptGalleryTemplate, 'generationMode' | 'inputMode' | 'requiredImagesCount' | 'creditCost' | 'usageLabel' | 'identityLock' | 'outfitSource'>>,
): PromptGalleryTemplate {
  const preset = inferPresetFromCategory(template.category)
  return {
    ...template,
    generationMode: template.generationMode ?? preset.generationMode,
    inputMode: template.inputMode ?? preset.inputMode,
    requiredImagesCount: template.requiredImagesCount ?? preset.requiredImagesCount,
    creditCost: template.creditCost ?? preset.creditCost,
    usageLabel: template.usageLabel ?? preset.usageLabel,
    identityLock: template.identityLock ?? preset.identityLock,
    outfitSource: template.outfitSource ?? preset.outfitSource,
  }
}

export const DEFAULT_PROMPT_TEMPLATES: PromptGalleryTemplate[] = [
  buildTemplate({
    id: 'alpha-fitness-elite',
    title: 'Selfie Heroica com Personagens',
    description:
      'Envie qualquer rosto e transforme a pessoa em uma selfie cinematografica com personagens heroicos ao fundo.',
    category: 'Fantasia Cinematica',
    format: 'TEXT',
    coverImageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD7ogBWK0zY2_HtFED56kMiV5FnPJxW6GpfHETUgANVgewdVfiHVyEW3-iVs07Qp1tzEoIQrvQFckXlUVq_8ZmxGsTAs8xJ3VqS-O3FAptDeveC1H5Ia0QThiNN_Jkg-sJkPJYNiRPPA2Cu3D1BdIsyxwGmG-bCOvNx-3wuIrz1sklMCK96-T6GhU_8l7Sr1AWv718mLPgIO7i8pLYti83jQrkwRaOmHxTrvQQMtpJhWg7x_IjfLbVTHVCM9jF1ZSRWonvrKufWy9gS',
    exampleImages: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD7ogBWK0zY2_HtFED56kMiV5FnPJxW6GpfHETUgANVgewdVfiHVyEW3-iVs07Qp1tzEoIQrvQFckXlUVq_8ZmxGsTAs8xJ3VqS-O3FAptDeveC1H5Ia0QThiNN_Jkg-sJkPJYNiRPPA2Cu3D1BdIsyxwGmG-bCOvNx-3wuIrz1sklMCK96-T6GhU_8l7Sr1AWv718mLPgIO7i8pLYti83jQrkwRaOmHxTrvQQMtpJhWg7x_IjfLbVTHVCM9jF1ZSRWonvrKufWy9gS',
    ],
    prompt: HERO_SELFIE_PROMPT,
    isVisible: true,
    sortOrder: 1,
    generationMode: 'identity_scene',
    inputMode: 'single_image',
    requiredImagesCount: 1,
    creditCost: 12,
    usageLabel: 'Envie 1 foto da pessoa. O sistema troca o sujeito da selfie pela referencia enviada.',
    identityLock: true,
  }),
  buildTemplate({
    id: 'cyber-vogue-editorial',
    title: 'Cyber Vogue Editorial',
    description:
      'Controle de exposicao de alto contraste e texturas metalicas para editoriais de moda futurista.',
    category: 'Moda High-End',
    format: 'TEXT',
    coverImageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAKWnOHuMDRVk3M4byLqnfo-V-Rs04FLvoYui6LjTgzVCbCKLcgXfa3c1iZtRxOwy2Vh7zIUUbyuGtJ3iDU3fkReCdCyr9NmJcaedUcttv1dhAPGClJlHAc5pBujYrlKHcBc_BPiFyKpniRqmM3PFosPeEaIJl3OgpU4ySUskS3lnCuMe9XuGWZCBdznfGw9Pyk3gsqFySYjyRC7jkchK92O-GB4xSCnFKisvlIMX6QCmVdWlK07RG37gah9gu_ZNV9z2xk69cLi77S',
    exampleImages: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAKWnOHuMDRVk3M4byLqnfo-V-Rs04FLvoYui6LjTgzVCbCKLcgXfa3c1iZtRxOwy2Vh7zIUUbyuGtJ3iDU3fkReCdCyr9NmJcaedUcttv1dhAPGClJlHAc5pBujYrlKHcBc_BPiFyKpniRqmM3PFosPeEaIJl3OgpU4ySUskS3lnCuMe9XuGWZCBdznfGw9Pyk3gsqFySYjyRC7jkchK92O-GB4xSCnFKisvlIMX6QCmVdWlK07RG37gah9gu_ZNV9z2xk69cLi77S',
    ],
    prompt:
      'High fashion editorial portrait of a woman in a metallic silver dress against a brutalist concrete wall at night, ultra-premium styling, high contrast shadows, cyan edge light, cinematic texture, luxury magazine framing, obsidian mood, sharp textile detail.',
    isVisible: true,
    sortOrder: 2,
  }),
  buildTemplate({
    id: 'urban-pulse-shoes',
    title: 'Urban Pulse Shoes',
    description:
      'Macro fotografia de calcados com foco em materiais premium e reflexos de asfalto molhado.',
    category: 'Lifestyle Urbano',
    format: 'JSON',
    coverImageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAkBIDJmMlZseKi8if57hIhGq-EkWd96dVA1CKqn3h9rzWqI1icyQ9lGLvmYDK8yjm1opMtYPhAyxtuHURJdlkMjvtuqLDDgTN5P4-MiLLAIzpmYP5S7yay3tERzdiZAiK_NroI7voGRZ-zW3xUo-_IiD6uvwoCZPXAjMixb4nEH9YywL3mGmGGp0IfRBZKlhi0ZnpUye1V623l5o9a1tiu2JVwGG-WTpFNnwEO0wRAuG0en6lnYjPN45GbkoATQnJaSHnRoOSD4v0V',
    exampleImages: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAkBIDJmMlZseKi8if57hIhGq-EkWd96dVA1CKqn3h9rzWqI1icyQ9lGLvmYDK8yjm1opMtYPhAyxtuHURJdlkMjvtuqLDDgTN5P4-MiLLAIzpmYP5S7yay3tERzdiZAiK_NroI7voGRZ-zW3xUo-_IiD6uvwoCZPXAjMixb4nEH9YywL3mGmGGp0IfRBZKlhi0ZnpUye1V623l5o9a1tiu2JVwGG-WTpFNnwEO0wRAuG0en6lnYjPN45GbkoATQnJaSHnRoOSD4v0V',
    ],
    prompt:
      '{"subject":"premium sneakers","scene":"wet asphalt street with city neon reflections","style":"macro product ad","lighting":"blue rim light with glossy reflections","focus":"materials, sole texture, water highlights","mood":"urban night energy"}',
    isVisible: true,
    sortOrder: 3,
  }),
  buildTemplate({
    id: 'neon-horizon-runner',
    title: 'Neon Horizon Runner',
    description:
      'Captura de movimento em alta velocidade com luz de preenchimento solar e silhuetas nitidas.',
    category: 'Influencer Corredora',
    format: 'TEXT',
    coverImageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAYck0Htykjg-R1WQvHsmoFXf6sogvvjEqAkyiskMmerS8viHLLt1xEzouQH9PxCXC8B3q2X1mUMf_TPQE6AW9PvDGGBApkkmmffVr0ZwuGUlh5iPWM-9NVjh4zxRhPoVowjwLYLtawopMzDiGQqDY8_F9tnW1uLDds07rHGsnfVFHGIdjSirLLInv_BZvvKgWxPd6ebEPiFJ_WDSne7_Op3O86eW8fqiF1o8mzgC5htPrz3Bl1yetQZAETo2ds_yT4QlzhS7Y9DpaH',
    exampleImages: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAYck0Htykjg-R1WQvHsmoFXf6sogvvjEqAkyiskMmerS8viHLLt1xEzouQH9PxCXC8B3q2X1mUMf_TPQE6AW9PvDGGBApkkmmffVr0ZwuGUlh5iPWM-9NVjh4zxRhPoVowjwLYLtawopMzDiGQqDY8_F9tnW1uLDds07rHGsnfVFHGIdjSirLLInv_BZvvKgWxPd6ebEPiFJ_WDSne7_Op3O86eW8fqiF1o8mzgC5htPrz3Bl1yetQZAETo2ds_yT4QlzhS7Y9DpaH',
    ],
    prompt:
      'Male runner in silhouette against a vibrant sunrise over a futuristic city bridge, premium sports campaign, strong motion energy, crisp silhouette, golden atmosphere, cinematic long-lens framing, subtle neon reflections, aspirational performance mood.',
    isVisible: true,
    sortOrder: 4,
  }),
  buildTemplate({
    id: 'metropolis-motion',
    title: 'Metropolis Motion',
    description:
      'Simulacao de desfoque de movimento em fundo urbano com foco em roupas de alta-costura.',
    category: 'Lifestyle Urbano',
    format: 'JSON',
    coverImageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuArkIgWtDJW9PDoyWbH7BRpl9KPVZ1VnQ1S_8o3wA1sBlOtuAcXwYXKFr-TznDacawzKTqLfLTXWW38X3YAei4jC4Vl_Eiu74QaCFGH6YbEObEVOm5rqqVoLE954VJ7eqCUzndEPxkI6ZMZLCZKl15SFL8Z8RpwDYd86pXAykWMYwKG6tlKIHYMtF51obHLT8_En_UQuI_zGtCI4Lh3bRAOk3E-08DQ8WSgiIQjWYxECkOWHiwAopHy9LIwR9MjIClA-U-_FMcqm-yT',
    exampleImages: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuArkIgWtDJW9PDoyWbH7BRpl9KPVZ1VnQ1S_8o3wA1sBlOtuAcXwYXKFr-TznDacawzKTqLfLTXWW38X3YAei4jC4Vl_Eiu74QaCFGH6YbEObEVOm5rqqVoLE954VJ7eqCUzndEPxkI6ZMZLCZKl15SFL8Z8RpwDYd86pXAykWMYwKG6tlKIHYMtF51obHLT8_En_UQuI_zGtCI4Lh3bRAOk3E-08DQ8WSgiIQjWYxECkOWHiwAopHy9LIwR9MjIClA-U-_FMcqm-yT',
    ],
    prompt:
      '{"subject":"woman crossing a metropolitan avenue in luxury streetwear","camera":"editorial full body, controlled motion blur","background":"city lights and traffic bokeh","style":"high-end urban fashion campaign","focus":"fabric movement, confidence, metropolitan rush"}',
    isVisible: true,
    sortOrder: 5,
  }),
  buildTemplate({
    id: 'obsidian-tech-product',
    title: 'Obsidian Tech Product',
    description:
      'Ideal para produtos minimalistas com superficies foscas e iluminacao de contorno dramatica.',
    category: 'Influencer + Produto',
    format: 'JSON',
    coverImageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAP716EAtTJZH1sbhW3DNcScN1bm4w8bqMiF-r8ZanJeLI7xxk6zB3IweIIDUXW528ELJE902PMdza3pXZjX3zNfC9BnLT-BdRNSH8WG_YR4LmB5cYv9YivN4e4xlfBTrxTOyN6cobSjGem-V8hRUmRjkecMjKvfz3wizJ4Tp-1rDKYSLgGMoynKVWnbU65Zk3WY75WqYbBe19_aMM_LvljUqxJ9mgwxrTU7-owY8kEdwbniDhDaSZw_iBm_GD_OQf1RORXawbr72Iy',
    exampleImages: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAP716EAtTJZH1sbhW3DNcScN1bm4w8bqMiF-r8ZanJeLI7xxk6zB3IweIIDUXW528ELJE902PMdza3pXZjX3zNfC9BnLT-BdRNSH8WG_YR4LmB5cYv9YivN4e4xlfBTrxTOyN6cobSjGem-V8hRUmRjkecMjKvfz3wizJ4Tp-1rDKYSLgGMoynKVWnbU65Zk3WY75WqYbBe19_aMM_LvljUqxJ9mgwxrTU7-owY8kEdwbniDhDaSZw_iBm_GD_OQf1RORXawbr72Iy',
    ],
    prompt:
      '{"subject":"wireless earbuds floating above a dark reflective liquid surface","lighting":"blue rim light, premium contour highlights","composition":"centered luxury product hero shot","textures":"matte shell, crisp reflections, elegant ripples","mood":"minimal tech luxury"}',
    isVisible: true,
    sortOrder: 6,
  }),
  buildTemplate({
    id: 'elemental-grit-training',
    title: 'Elemental Grit Training',
    description:
      'Estetica rustica e texturas organicas combinadas com iluminacao fria e sombras profundas.',
    category: 'Influencer Academia',
    format: 'TEXT',
    coverImageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA8gzUJ4wwi0Dp-uYMHShrdNjmx-Z5yU2b6_TjiLqQ5Rw_LeA24upu4WfpkYpvhqAFcfuWkuY38sUsuT-RECOYxxqF2CxessM41cZ6NmgYz8h_KT5mZNaZ9Zbh3pfbVTOA-al_aXopedEUs0noa9mFggu5tDoT98NJxWoBeaX0AkfxoD1FwmxVCXKIPmBeiBbCcF9yAIV2rWrSCh7pO7PjRX1VUH0_wrzLUdkgl49QjVEWJidd_esnG8t443Rgo9f996v7dve81ScMB',
    exampleImages: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA8gzUJ4wwi0Dp-uYMHShrdNjmx-Z5yU2b6_TjiLqQ5Rw_LeA24upu4WfpkYpvhqAFcfuWkuY38sUsuT-RECOYxxqF2CxessM41cZ6NmgYz8h_KT5mZNaZ9Zbh3pfbVTOA-al_aXopedEUs0noa9mFggu5tDoT98NJxWoBeaX0AkfxoD1FwmxVCXKIPmBeiBbCcF9yAIV2rWrSCh7pO7PjRX1VUH0_wrzLUdkgl49QjVEWJidd_esnG8t443Rgo9f996v7dve81ScMB',
    ],
    prompt:
      'Athlete training on a coastal rock at twilight, stormy sea in the background, cinematic dark clouds, rugged premium sportswear, cold atmosphere, dramatic side light, raw grit, elevated endurance campaign aesthetic.',
    isVisible: true,
    sortOrder: 7,
  }),
  buildTemplate({
    id: 'synthetic-fiber-macro',
    title: 'Synthetic Fiber Macro',
    description:
      'Foco extremo em fibras sinteticas e iluminacao led integrada para vestuario inteligente.',
    category: 'Moda High-End',
    format: 'JSON',
    coverImageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCLrGmQp7mP3mOK_K_XzfIdZlWXO7ZF5lEaBcC6xnkwO5f5klWyDhfmvhK4DEgL9YJqWPXKAmPl-EfAF7mcGwqysrorZezTNwZ9vGowj9s3HOFpTEPol2jLjarqw4d5uDTdG3liJeATzBWOt3r56_wj9mbAI35s5MWsK-birbCQOaRsjr2uVgBPBDKHrGA0xlgy3ev4Vw5ZSgU7L8_XFJzXENdMTmNCarqXxw_Thn9lchBjj3o7YPlOOif3AimrloabGlY9eVgFRzV6',
    exampleImages: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCLrGmQp7mP3mOK_K_XzfIdZlWXO7ZF5lEaBcC6xnkwO5f5klWyDhfmvhK4DEgL9YJqWPXKAmPl-EfAF7mcGwqysrorZezTNwZ9vGowj9s3HOFpTEPol2jLjarqw4d5uDTdG3liJeATzBWOt3r56_wj9mbAI35s5MWsK-birbCQOaRsjr2uVgBPBDKHrGA0xlgy3ev4Vw5ZSgU7L8_XFJzXENdMTmNCarqXxw_Thn9lchBjj3o7YPlOOif3AimrloabGlY9eVgFRzV6',
    ],
    prompt:
      '{"subject":"high-tech fabric garment close-up","camera":"macro lens, extreme detail","lighting":"embedded LED glow with cyan accents","focus":"fiber texture, seam precision, futuristic textile language","mood":"premium wearable technology"}',
    isVisible: true,
    sortOrder: 8,
  }),
]

export function normalizePromptTemplate(row: PromptTemplateRow): PromptGalleryTemplate {
  const canonicalOverride: Partial<PromptGalleryTemplate> =
    CANONICAL_TEMPLATE_OVERRIDES[row.id as keyof typeof CANONICAL_TEMPLATE_OVERRIDES] ?? {}

  const resolvedCategory = row.category ?? canonicalOverride.category ?? 'Sem categoria'
  const generationMode = normalizeGenerationMode(
    row.generation_mode ?? canonicalOverride.generationMode,
    resolvedCategory,
  )
  const inputMode = normalizeInputMode(
    row.input_mode ?? canonicalOverride.inputMode,
    generationMode,
  )
  const inferredPreset = generationMode === 'product_model' || generationMode === 'virtual_tryon'
    ? DEFAULT_PRODUCT_PRESET
    : DEFAULT_SCENE_PRESET

  return {
    id: row.id,
    title: row.title ?? canonicalOverride.title ?? '',
    description: row.description ?? canonicalOverride.description ?? '',
    category: resolvedCategory,
    format: row.format === 'JSON' ? 'JSON' : (canonicalOverride.format ?? 'TEXT'),
    prompt: row.prompt ?? canonicalOverride.prompt ?? '',
    coverImageUrl: row.cover_image_url ?? canonicalOverride.coverImageUrl ?? '',
    exampleImages: row.example_images ?? canonicalOverride.exampleImages ?? [],
    isVisible: row.is_visible ?? true,
    sortOrder: row.sort_order ?? 0,
    generationMode,
    inputMode,
    requiredImagesCount:
      row.required_images_count ?? canonicalOverride.requiredImagesCount ?? inferredPreset.requiredImagesCount,
    creditCost: row.credit_cost ?? canonicalOverride.creditCost ?? inferredPreset.creditCost,
    usageLabel: row.usage_label ?? canonicalOverride.usageLabel ?? inferredPreset.usageLabel,
    identityLock: row.identity_lock ?? canonicalOverride.identityLock ?? inferredPreset.identityLock,
    outfitSource: normalizeOutfitSource(row.outfit_source ?? canonicalOverride.outfitSource ?? inferredPreset.outfitSource),
  } satisfies PromptGalleryTemplate
}

export function getDefaultPromptTemplateById(id: string) {
  return DEFAULT_PROMPT_TEMPLATES.find((template) => template.id === id) ?? null
}

export function stripPromptTemplate(template: PromptGalleryTemplate): ClientPromptGalleryTemplate {
  const rest = { ...template }
  delete (rest as Partial<PromptGalleryTemplate>).prompt
  return rest
}

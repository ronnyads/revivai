import type { PromptGenerationMode } from '@/lib/prompt-gallery'

export type VertexEngineProfile =
  | 'vertex_imagen4_ultra'
  | 'vertex_imagen4'
  | 'vertex_imagen4_fast'
  | 'vertex_vto'

export interface VertexEngineConfig {
  profile: VertexEngineProfile
  label: string
  shortLabel: string
  summary: string
  qualityHint: string
  restorePresetLabel: string
  restorePresetSummary: string
  intendedModelId: string
  runtimeImageModelId: string
}

const ENGINE_CONFIGS: Record<VertexEngineProfile, VertexEngineConfig> = {
  vertex_imagen4_ultra: {
    profile: 'vertex_imagen4_ultra',
    label: 'Imagen 4 Ultra',
    shortLabel: 'Ultra',
    summary: 'Maior fidelidade visual para retratos, familia e cenas sensiveis.',
    qualityHint: 'Maxima fidelidade, maior custo.',
    restorePresetLabel: 'Premium Restore',
    restorePresetSummary: 'Preset mais cuidadoso para retratos, familia e danos mais delicados.',
    intendedModelId: 'imagen-4.0-ultra-generate-001',
    runtimeImageModelId: 'imagen-4.0-ultra-generate-001',
  },
  vertex_imagen4: {
    profile: 'vertex_imagen4',
    label: 'Imagen 4',
    shortLabel: 'Standard',
    summary: 'Equilibrio entre qualidade, consistencia e custo.',
    qualityHint: 'Equilibrado para uso geral.',
    restorePresetLabel: 'Balanced Restore',
    restorePresetSummary: 'Preset equilibrado para fotos gerais com boa fidelidade e latencia moderada.',
    intendedModelId: 'imagen-4.0-generate-001',
    runtimeImageModelId: 'imagen-4.0-generate-001',
  },
  vertex_imagen4_fast: {
    profile: 'vertex_imagen4_fast',
    label: 'Imagen 4 Fast',
    shortLabel: 'Fast',
    summary: 'Mais rapido para testes, lotes e execucoes conservadoras.',
    qualityHint: 'Mais veloz, menor custo.',
    restorePresetLabel: 'Conservative Fast',
    restorePresetSummary: 'Preset enxuto para limpezas leves e intervencao minima.',
    intendedModelId: 'imagen-4.0-fast-generate-001',
    runtimeImageModelId: 'imagen-4.0-fast-generate-001',
  },
  vertex_vto: {
    profile: 'vertex_vto',
    label: 'Vertex VTO',
    shortLabel: 'VTO',
    summary: 'Fluxo dedicado para provador virtual e troca de roupa.',
    qualityHint: 'Especializado em vestuario e fitting.',
    restorePresetLabel: 'VTO',
    restorePresetSummary: 'Perfil dedicado a provador virtual e nao usado no restore de fotos.',
    intendedModelId: 'vertex-virtual-try-on',
    runtimeImageModelId: 'vertex-virtual-try-on',
  },
}

const LEGACY_RESTORE_MODEL_MAP: Record<string, VertexEngineProfile> = {
  'gemini-2.0-flash-exp-image-generation': 'vertex_imagen4',
  'gemini-2.0-flash-preview-image-generation': 'vertex_imagen4_fast',
  'gemini-2.5-flash-image': 'vertex_imagen4_ultra',
}

const PROMPT_MODE_DEFAULTS: Record<PromptGenerationMode, VertexEngineProfile> = {
  identity_scene: 'vertex_imagen4_ultra',
  product_model: 'vertex_imagen4',
  virtual_tryon: 'vertex_vto',
}

export const VERTEX_ANALYSIS_MODEL_ID = 'gemini-2.5-flash'
export const VERTEX_QC_MODEL_ID = 'gemini-2.5-flash'
export const VERTEX_RESTORE_PRIMARY_MODEL_ID = 'imagen-3.0-capability-001'
// Motor de edição de imagem (image-to-image) — recomendado pelo Google como
// substituto de TODOS os modelos Imagen para edição, incluindo imagen-4.0-ultra.
// Suporta inpainting, remoção de objetos, expansão e restauração.
export const VERTEX_RESTORE_FALLBACK_MODEL_ID = 'gemini-2.5-flash-image'
export const VERTEX_IDENTITY_SCENE_PRIMARY_MODEL_ID = 'imagen-3.0-capability-001'
export const VERTEX_IDENTITY_SCENE_FALLBACK_MODEL_ID = 'gemini-2.5-flash-image'
export const VERTEX_IMAGE_EDIT_MODEL_ID = VERTEX_RESTORE_FALLBACK_MODEL_ID
export const VERTEX_UPSCALE_MODEL_ID = 'imagen-4.0-upscale-preview'

export function isVertexEngineProfile(value: unknown): value is VertexEngineProfile {
  return typeof value === 'string' && value in ENGINE_CONFIGS
}

export function getVertexEngineConfig(profile: VertexEngineProfile): VertexEngineConfig {
  return ENGINE_CONFIGS[profile]
}

export function listVertexEngineConfigs(
  profiles: VertexEngineProfile[] = ['vertex_imagen4_ultra', 'vertex_imagen4', 'vertex_imagen4_fast'],
): VertexEngineConfig[] {
  return profiles.map((profile) => ENGINE_CONFIGS[profile])
}

export function resolvePromptEngineProfile(
  generationMode: PromptGenerationMode,
  explicitProfile?: string | null,
): VertexEngineProfile {
  if (isVertexEngineProfile(explicitProfile)) return explicitProfile
  return PROMPT_MODE_DEFAULTS[generationMode]
}

export function getPromptRuntimeModelId(
  generationMode: PromptGenerationMode,
  profile: VertexEngineProfile,
): string {
  if (generationMode === 'identity_scene') {
    return VERTEX_IDENTITY_SCENE_FALLBACK_MODEL_ID
  }

  return ENGINE_CONFIGS[profile].runtimeImageModelId
}

export function inferRestoreEngineProfile(options: {
  explicitProfile?: string | null
  legacyModel?: string | null
  modeName?: string | null
}): VertexEngineProfile {
  if (isVertexEngineProfile(options.explicitProfile)) return options.explicitProfile

  const fromLegacyModel = LEGACY_RESTORE_MODEL_MAP[String(options.legacyModel ?? '').trim()]
  if (fromLegacyModel) return fromLegacyModel

  const normalizedName = String(options.modeName ?? '').toLowerCase()
  if (normalizedName.includes('famil') || normalizedName.includes('grupo') || normalizedName.includes('retrato')) {
    return 'vertex_imagen4_ultra'
  }
  if (normalizedName.includes('leve') || normalizedName.includes('rap')) {
    return 'vertex_imagen4_fast'
  }

  return 'vertex_imagen4_ultra'
}

export function getPromptEngineBadge(profile: VertexEngineProfile): string {
  return ENGINE_CONFIGS[profile].label
}

export function getRestoreEngineFriendlyName(profile: VertexEngineProfile): string {
  return ENGINE_CONFIGS[profile].restorePresetLabel
}

export function getRestoreEngineSummary(profile: VertexEngineProfile): string {
  return ENGINE_CONFIGS[profile].restorePresetSummary
}

export function getRuntimeModelIdForProfile(profile: VertexEngineProfile): string {
  return ENGINE_CONFIGS[profile].runtimeImageModelId
}

export function getIntendedModelIdForProfile(profile: VertexEngineProfile): string {
  return ENGINE_CONFIGS[profile].intendedModelId
}

export function getRestorePrimaryModelId(): string {
  return VERTEX_RESTORE_PRIMARY_MODEL_ID
}

export function getRestoreFallbackModelId(): string {
  return VERTEX_RESTORE_FALLBACK_MODEL_ID
}

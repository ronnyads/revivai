import { AssetType } from '@/types'

export type StudioEngineReasonCode =
  | 'google_engine_unavailable'
  | 'google_model_not_mapped'
  | 'legacy_fallback_disabled'
  | 'parity_gap_requires_migration'

export type StudioProviderFamily = 'google_cloud' | 'native'
export type StudioParityStatus = 'ready' | 'partial' | 'gap'

export interface StudioAssetEnginePolicy {
  assetType: AssetType
  providerFamily: StudioProviderFamily
  billingRoute: string
  runtimeEngine: string
  runtimeModel: string
  targetEngine: string
  targetModel: string
  parityStatus: StudioParityStatus
  legacyFallbackAllowed: boolean
  legacyFallbackUsed: boolean
  reasonCode?: StudioEngineReasonCode
  notes?: string
}

export class StudioEnginePolicyError extends Error {
  code: StudioEngineReasonCode
  status: number
  policy: StudioAssetEnginePolicy

  constructor(params: {
    code: StudioEngineReasonCode
    message: string
    status?: number
    policy: StudioAssetEnginePolicy
  }) {
    super(params.message)
    this.name = 'StudioEnginePolicyError'
    this.code = params.code
    this.status = params.status ?? 503
    this.policy = params.policy
  }
}

function isLegacyFallbackAllowed(): boolean {
  return process.env.STUDIO_ALLOW_LEGACY_FALLBACKS?.trim().toLowerCase() === 'true'
}

export function normalizeStudioEngineInputParams(params: {
  type: AssetType
  inputParams: Record<string, unknown>
}): Record<string, unknown> {
  const input = { ...params.inputParams }
  const legacyAllowed = isLegacyFallbackAllowed()

  switch (params.type) {
    case 'video':
      return {
        ...input,
        requested_engine: typeof input.engine === 'string' ? input.engine : undefined,
        engine: 'veo',
      }
    case 'model':
      return {
        ...input,
        requested_engine: typeof input.engine === 'string' ? input.engine : undefined,
        engine: 'google',
      }
    case 'talking_video': {
      const requestedMode = String(input.talking_video_mode ?? 'veo_natural') === 'veo_natural'
        ? 'veo_natural'
        : 'exact_speech'
      return {
        ...input,
        talking_video_mode_requested: requestedMode,
        talking_video_mode: requestedMode,
        legacy_fallback_allowed: legacyAllowed,
      }
    }
    case 'voice':
    case 'caption':
    case 'script':
    case 'image':
    case 'music':
      return {
        ...input,
        legacy_fallback_allowed: legacyAllowed,
      }
    default:
      return input
  }
}

export function resolveStudioAssetEnginePolicy(params: {
  type: AssetType
  inputParams: Record<string, unknown>
}): StudioAssetEnginePolicy {
  const input = params.inputParams
  const legacyAllowed = isLegacyFallbackAllowed()
  const talkingMode = String(input.talking_video_mode ?? 'veo_natural') === 'veo_natural'
    ? 'veo_natural'
    : 'exact_speech'
  const isComposeFitting = params.type === 'compose' && String(input.compose_variant ?? 'fitting') === 'fitting'
  const requiresFaceClone = params.type === 'image' && typeof input.source_face_url === 'string' && input.source_face_url.trim().length > 0

  const baseByType: Record<AssetType, StudioAssetEnginePolicy> = {
    image: {
      assetType: 'image',
      providerFamily: 'google_cloud',
      billingRoute: 'vertex_imagen_generate',
      runtimeEngine: 'vertex_imagen_generate',
      runtimeModel: 'imagen-4.0-generate-001',
      targetEngine: 'vertex_imagen_generate',
      targetModel: 'imagen-4.0-generate-001',
      parityStatus: requiresFaceClone ? 'gap' : 'ready',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
      ...(requiresFaceClone
        ? {
            reasonCode: 'parity_gap_requires_migration' as const,
            notes: 'Identity-preserving face clone ainda dependia de Flux/PuLID no fluxo antigo.',
          }
        : {}),
    },
    video: {
      assetType: 'video',
      providerFamily: 'google_cloud',
      billingRoute: 'vertex_veo_predict_long_running',
      runtimeEngine: 'vertex_veo',
      runtimeModel: 'veo-3.1-generate-001',
      targetEngine: 'vertex_veo',
      targetModel: 'veo-3.1-generate-001',
      parityStatus: 'ready',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
    },
    talking_video: {
      assetType: 'talking_video',
      providerFamily: 'google_cloud',
      billingRoute: talkingMode === 'veo_natural'
        ? 'vertex_veo_predict_long_running'
        : 'google_tts_plus_vertex_veo_plus_legacy_lipsync_blocked',
      runtimeEngine: talkingMode === 'veo_natural' ? 'vertex_veo' : 'google_tts_pending_lipsync',
      runtimeModel: talkingMode === 'veo_natural' ? 'veo-3.1-generate-001' : 'lipsync_pending_google_migration',
      targetEngine: 'vertex_veo',
      targetModel: 'veo-3.1-generate-001',
      parityStatus: talkingMode === 'veo_natural' ? 'ready' : 'gap',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
      ...(talkingMode !== 'veo_natural'
        ? {
            reasonCode: 'parity_gap_requires_migration' as const,
            notes: 'Modo fala exata ainda exigia lipsync legado.',
          }
        : {}),
    },
    voice: {
      assetType: 'voice',
      providerFamily: 'google_cloud',
      billingRoute: 'google_cloud_tts',
      runtimeEngine: 'google_cloud_tts',
      runtimeModel: 'texttospeech_v1',
      targetEngine: 'google_cloud_tts',
      targetModel: 'texttospeech_v1',
      parityStatus: 'ready',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
    },
    upscale: {
      assetType: 'upscale',
      providerFamily: 'google_cloud',
      billingRoute: 'vertex_imagen_upscale_pending',
      runtimeEngine: 'vertex_imagen_upscale_pending',
      runtimeModel: 'upscale_mapping_pending',
      targetEngine: 'vertex_imagen_upscale_pending',
      targetModel: 'upscale_mapping_pending',
      parityStatus: 'gap',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
      reasonCode: 'parity_gap_requires_migration',
      notes: 'Upscale ainda dependia de Gemini image preview/Fal clarity.',
    },
    script: {
      assetType: 'script',
      providerFamily: 'google_cloud',
      billingRoute: 'vertex_generate_content',
      runtimeEngine: 'vertex_gemini',
      runtimeModel: 'gemini-2.5-flash',
      targetEngine: 'vertex_gemini',
      targetModel: 'gemini-2.5-flash',
      parityStatus: 'ready',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
    },
    caption: {
      assetType: 'caption',
      providerFamily: 'google_cloud',
      billingRoute: 'google_cloud_speech_to_text',
      runtimeEngine: 'google_cloud_stt',
      runtimeModel: 'speech_v1_recognize',
      targetEngine: 'google_cloud_stt',
      targetModel: 'speech_v1_recognize',
      parityStatus: 'ready',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
    },
    model: {
      assetType: 'model',
      providerFamily: 'google_cloud',
      billingRoute: 'vertex_generate_content_plus_imagen_predict',
      runtimeEngine: 'vertex_imagen_generate',
      runtimeModel: 'gemini-2.5-flash + imagen-4.0-generate-001',
      targetEngine: 'vertex_imagen_generate',
      targetModel: 'gemini-2.5-flash + imagen-4.0-generate-001',
      parityStatus: 'ready',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
    },
    render: {
      assetType: 'render',
      providerFamily: 'native',
      billingRoute: 'local_ffmpeg_merge',
      runtimeEngine: 'ffmpeg_merge',
      runtimeModel: 'local',
      targetEngine: 'ffmpeg_merge',
      targetModel: 'local',
      parityStatus: 'ready',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
    },
    animate: {
      assetType: 'animate',
      providerFamily: 'google_cloud',
      billingRoute: 'vertex_veo_predict_long_running',
      runtimeEngine: 'vertex_veo',
      runtimeModel: 'veo-3.1-generate-001',
      targetEngine: 'vertex_veo',
      targetModel: 'veo-3.1-generate-001',
      parityStatus: 'ready',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
    },
    compose: {
      assetType: 'compose',
      providerFamily: 'google_cloud',
      billingRoute: isComposeFitting ? 'vertex_vto_predict' : 'vertex_imagen_compose_pending',
      runtimeEngine: isComposeFitting ? 'vertex_vto' : 'vertex_imagen_compose_pending',
      runtimeModel: isComposeFitting ? 'virtual-try-on-001' : 'imagen compose pending',
      targetEngine: isComposeFitting ? 'vertex_vto' : 'vertex_imagen_compose',
      targetModel: isComposeFitting ? 'virtual-try-on-001' : 'imagen capability',
      parityStatus: isComposeFitting ? 'ready' : 'partial',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
      ...(isComposeFitting ? {} : {
        notes: 'Compose produto usa fallback interno até Imagen compose estar disponível.',
      }),
    },
    lipsync: {
      assetType: 'lipsync',
      providerFamily: 'google_cloud',
      billingRoute: 'google_talking_video_pending',
      runtimeEngine: 'google_lipsync_pending',
      runtimeModel: 'lipsync_mapping_pending',
      targetEngine: 'google_lipsync_pending',
      targetModel: 'lipsync_mapping_pending',
      parityStatus: 'gap',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
      reasonCode: 'parity_gap_requires_migration',
      notes: 'Lipsync ainda dependia de provider externo.',
    },
    face: {
      assetType: 'face',
      providerFamily: 'native',
      billingRoute: 'direct_input',
      runtimeEngine: 'passthrough',
      runtimeModel: 'none',
      targetEngine: 'passthrough',
      targetModel: 'none',
      parityStatus: 'ready',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
    },
    join: {
      assetType: 'join',
      providerFamily: 'native',
      billingRoute: 'local_ffmpeg_concat',
      runtimeEngine: 'ffmpeg_concat',
      runtimeModel: 'local',
      targetEngine: 'ffmpeg_concat',
      targetModel: 'local',
      parityStatus: 'ready',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
    },
    angles: {
      assetType: 'angles',
      providerFamily: 'google_cloud',
      billingRoute: 'vertex_generate_content',
      runtimeEngine: 'vertex_gemini',
      runtimeModel: 'gemini-3-pro-image-preview',
      targetEngine: 'vertex_gemini',
      targetModel: 'gemini-3-pro-image-preview',
      parityStatus: 'ready',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
    },
    music: {
      assetType: 'music',
      providerFamily: 'google_cloud',
      billingRoute: 'vertex_lyria_predict',
      runtimeEngine: 'vertex_lyria',
      runtimeModel: 'lyria-002',
      targetEngine: 'vertex_lyria',
      targetModel: 'lyria-002',
      parityStatus: 'ready',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
    },
    ugc_bundle: {
      assetType: 'ugc_bundle',
      providerFamily: 'google_cloud',
      billingRoute: 'vertex_imagen_capability_predict',
      runtimeEngine: 'vertex_imagen_capability',
      runtimeModel: 'imagen-3.0-capability-001',
      targetEngine: 'vertex_imagen_capability',
      targetModel: 'imagen-3.0-capability-001',
      parityStatus: 'ready',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
    },
    scene: {
      assetType: 'scene',
      providerFamily: 'google_cloud',
      billingRoute: 'vertex_generate_content',
      runtimeEngine: 'vertex_gemini',
      runtimeModel: 'gemini-2.5-flash',
      targetEngine: 'vertex_gemini',
      targetModel: 'gemini-2.5-flash',
      parityStatus: 'ready',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
    },
    look_split: {
      assetType: 'look_split',
      providerFamily: 'google_cloud',
      billingRoute: 'vertex_generate_content_plus_local_segmentation',
      runtimeEngine: 'vertex_gemini_segmentation',
      runtimeModel: 'gemini-1.5-flash / gemini-2.5-flash',
      targetEngine: 'vertex_gemini_segmentation',
      targetModel: 'gemini-1.5-flash / gemini-2.5-flash',
      parityStatus: 'partial',
      legacyFallbackAllowed: legacyAllowed,
      legacyFallbackUsed: false,
      notes: 'Background removal legado fica inativo; segmentacao principal segue em Google-first.',
    },
  }

  return baseByType[params.type]
}

export function applyStudioEngineMetadata(
  inputParams: Record<string, unknown>,
  policy: StudioAssetEnginePolicy,
): Record<string, unknown> {
  return {
    ...inputParams,
    provider_family: policy.providerFamily,
    billing_route: policy.billingRoute,
    runtime_engine: policy.runtimeEngine,
    runtime_model: policy.runtimeModel,
    target_engine: policy.targetEngine,
    target_model: policy.targetModel,
    engine_parity_status: policy.parityStatus,
    legacy_fallback_allowed: policy.legacyFallbackAllowed,
    legacy_fallback_used: policy.legacyFallbackUsed,
    engine_reason_code: policy.reasonCode ?? '',
    engine_policy_notes: policy.notes ?? '',
  }
}

export function assertStudioAssetExecutionReady(policy: StudioAssetEnginePolicy) {
  if (policy.parityStatus !== 'gap') return

  throw new StudioEnginePolicyError({
    code: policy.reasonCode ?? 'parity_gap_requires_migration',
    message: policy.notes
      ? `Este card ainda nao tem rota Google pronta para producao nesta fase: ${policy.notes}`
      : 'Este card ainda nao tem rota Google pronta para producao nesta fase.',
    policy,
  })
}

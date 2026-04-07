import sharp from 'sharp'

export type ReplicateModel =
  | 'nightmareai/real-esrgan'
  | 'sczhou/codeformer'
  | 'arielreplicate/deoldify'
  | 'stability-ai/stable-diffusion-inpainting'

export interface DiagnosisResult {
  model: ReplicateModel
  label: string
  description: string
  icon: string
  confidence: number // 0-100
}

export interface ImageStats {
  isGrayscale: boolean
  isLowRes: boolean
  isTooSmall: boolean
  width: number
  height: number
  hasAlpha: boolean
  avgBrightness: number // 0-255
  saturation: number    // 0-100 (estimado)
}

/**
 * Analyzes image buffer with Sharp to extract real properties
 * for intelligent model selection.
 */
export async function analyzeImage(buffer: Buffer): Promise<ImageStats> {
  const img    = sharp(buffer)
  const meta   = await img.metadata()
  const stats  = await img.stats()

  const width  = meta.width  ?? 0
  const height = meta.height ?? 0
  const channels = stats.channels

  // Is grayscale: all channels have similar mean values
  const isGrayscale =
    meta.channels === 1 ||
    (channels.length >= 3 &&
      Math.abs(channels[0].mean - channels[1].mean) < 10 &&
      Math.abs(channels[1].mean - channels[2].mean) < 10)

  // Low resolution: smaller than 800px on longest side
  const isLowRes  = Math.max(width, height) < 800
  const isTooSmall = Math.max(width, height) < 200

  // Average brightness
  const avgBrightness = channels.reduce((s, c) => s + c.mean, 0) / channels.length

  // Rough saturation estimate (difference between ch max and min)
  const saturation = channels.length >= 3
    ? Math.min(100, Math.abs(channels[0].mean - channels[2].mean) * 2)
    : 0

  return { isGrayscale, isLowRes, isTooSmall, width, height, hasAlpha: !!meta.hasAlpha, avgBrightness, saturation }
}

/**
 * Smart model selection based on real image analysis
 */
export function selectModel(stats: ImageStats, userHint?: string): DiagnosisResult {
  // User-provided hint overrides auto-detection
  if (userHint === 'colorize' || stats.isGrayscale) {
    return {
      model: 'arielreplicate/deoldify',
      label: 'Colorização',
      description: 'Foto em preto e branco detectada. Adicionaremos cores realistas com IA.',
      icon: '🎨',
      confidence: stats.isGrayscale ? 95 : 75,
    }
  }

  if (userHint === 'inpaint') {
    return {
      model: 'stability-ai/stable-diffusion-inpainting',
      label: 'Remoção de danos',
      description: 'Eliminaremos rasgos, manchas e deterioração com IA generativa.',
      icon: '✦',
      confidence: 80,
    }
  }

  if (userHint === 'face') {
    return {
      model: 'sczhou/codeformer',
      label: 'Restauração de rosto',
      description: 'Reconstruiremos o rosto com altíssimo nível de detalhe e naturalidade.',
      icon: '👤',
      confidence: 85,
    }
  }

  // Auto-detect: very low brightness + grayscale-like = old degraded photo
  if (stats.avgBrightness < 80 && stats.saturation < 15) {
    return {
      model: 'arielreplicate/deoldify',
      label: 'Colorização',
      description: 'Foto antiga e desbotada detectada. Aplicaremos colorização inteligente.',
      icon: '🎨',
      confidence: 82,
    }
  }

  // Low or degraded resolution = upscaling
  if (stats.isLowRes) {
    return {
      model: 'nightmareai/real-esrgan',
      label: 'Upscaling 4x',
      description: `Resolução de ${stats.width}×${stats.height}px detectada. Aumentaremos em até 4x.`,
      icon: '📐',
      confidence: 90,
    }
  }

  // Default = upscaling + sharpening (best general restoration)
  return {
    model: 'nightmareai/real-esrgan',
    label: 'Restauração geral',
    description: 'Aplicaremos upscaling e nitidez avançada para recuperar cada detalhe.',
    icon: '📐',
    confidence: 75,
  }
}

// ── Replicate model version hashes (from Replicate API) ──
export const MODEL_CONFIGS: Record<ReplicateModel, {
  version: string
  buildInput: (imageUrl: string) => Record<string, unknown>
}> = {
  'nightmareai/real-esrgan': {
    version: 'nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd374',
    buildInput: (url) => ({
      image: url,
      scale: 4,
      face_enhance: true,   // também melhora rostos
    }),
  },
  'sczhou/codeformer': {
    version: 'sczhou/codeformer:7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53142edd9d2cd56',
    buildInput: (url) => ({
      image: url,
      codeformer_fidelity: 0.7,
      background_enhance: true,
      face_upsample: true,
      upscale: 2,
    }),
  },
  'arielreplicate/deoldify': {
    version: 'arielreplicate/deoldify:0da600fab0c45a66211339f1c16b71345d22f26ef5fea3dfa1bb0ad586485d04',
    buildInput: (url) => ({
      input_image: url,
      model_name: 'ColorizeStable',
      render_factor: 35,
    }),
  },
  'stability-ai/stable-diffusion-inpainting': {
    version: 'stability-ai/stable-diffusion-inpainting:95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3',
    buildInput: (url) => ({
      image: url,
      prompt: 'old photo restoration, high quality, detailed, clean',
      num_inference_steps: 25,
      guidance_scale: 7.5,
    }),
  },
}

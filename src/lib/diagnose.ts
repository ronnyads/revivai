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

// ── Replicate models ──
export const MODEL_CONFIGS: Record<ReplicateModel, {
  name: string
  buildInput: (imageUrl: string) => Record<string, unknown>
}> = {
  'nightmareai/real-esrgan': {
    name: 'nightmareai/real-esrgan',
    buildInput: (url) => ({
      image: url,
      scale: 4,
      face_enhance: true,   // também melhora rostos
    }),
  },
  'sczhou/codeformer': {
    name: 'sczhou/codeformer',
    buildInput: (url) => ({
      image: url,
      codeformer_fidelity: 0.7,
      background_enhance: true,
      face_upsample: true,
      upscale: 2,
    }),
  },
  'arielreplicate/deoldify': {
    name: 'arielreplicate/deoldify_image', // Valid model confirmed by dynamic script!
    buildInput: (url) => ({
      image: url, // try both image and input_image just to be safe
      input_image: url,
      model_name: 'Artistic', // Replicate demands strictly "Artistic" or "Stable"
      render_factor: 35,
    }),
  },
  'stability-ai/stable-diffusion-inpainting': {
    name: 'stability-ai/stable-diffusion-inpainting',
    buildInput: (url) => ({
      image: url,
      prompt: 'old photo restoration, high quality, detailed, clean',
      num_inference_steps: 25,
      guidance_scale: 7.5,
    }),
  },
}

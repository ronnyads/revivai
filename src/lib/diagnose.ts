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
 * Smart model selection based on real image analysis.
 * ALWAYS starts with colorization (DDColor) as phase 1.
 * Phase 2 (Codeformer) is always run after, regardless.
 */
export function selectModel(stats: ImageStats, userHint?: string): DiagnosisResult {
  // All photos go through colorization pipeline first
  // (DDColor handles both color and B&W photos — it enhances existing colors too)
  return {
    model: 'arielreplicate/deoldify', // maps to piddnad/ddcolor internally
    label: 'Restauração Completa',
    description: stats.isGrayscale
      ? 'Foto em preto e branco detectada. Coloriremos e restauraremos com IA em duas etapas.'
      : 'Aplicaremos colorização avançada e restauração de detalhes em duas etapas.',
    icon: '✨',
    confidence: 95,
  }
}

// ── Pipeline stages ──
// Stage 1: DDColor (colorize / enhance colors)
// Stage 2: CodeFormer (face restoration + upscaling)
export type PipelineStage = 'stage1_colorize' | 'stage2_restore'

// ── Replicate models config ──
export const MODEL_CONFIGS: Record<string, {
  name: string
  buildInput: (imageUrl: string) => Record<string, unknown>
}> = {
  // Stage 1: DDColor — colorizes and enhances any photo
  'piddnad/ddcolor': {
    name: 'piddnad/ddcolor',
    buildInput: (url) => ({
      image: url,
    }),
  },
  // Stage 2: CodeFormer — face restoration + upscale
  'sczhou/codeformer': {
    name: 'sczhou/codeformer',
    buildInput: (url) => ({
      image: url,
      codeformer_fidelity: 0.5, // balanced: 0=max reconstruct, 1=max preserve
      background_enhance: true,
      face_upsample: true,
      upscale: 2,
    }),
  },
  // Legacy mappings (kept for backward compat)
  'arielreplicate/deoldify': {
    name: 'piddnad/ddcolor',
    buildInput: (url) => ({ image: url }),
  },
  'nightmareai/real-esrgan': {
    name: 'nightmareai/real-esrgan',
    buildInput: (url) => ({
      image: url,
      scale: 4,
      face_enhance: true,
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

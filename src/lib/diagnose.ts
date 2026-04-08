import sharp from 'sharp'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ReplicateModel =
  | 'nightmareai/real-esrgan'
  | 'sczhou/codeformer'
  | 'arielreplicate/deoldify'
  | 'stability-ai/stable-diffusion-inpainting'

export type PipelineModel =
  | 'piddnad/ddcolor'
  | 'nightmareai/real-esrgan'
  | 'sczhou/codeformer'
  | 'microsoft/bringing-old-photos-back-to-life'
  | 'megvii-research/nafnet'
  | 'jingyunliang/swinir'
  | 'arielreplicate/deoldify'

export interface DiagnosisResult {
  model: ReplicateModel
  label: string
  description: string
  icon: string
  confidence: number
}

export interface ImageStats {
  isGrayscale: boolean
  isLowRes: boolean
  isTooSmall: boolean
  width: number
  height: number
  hasAlpha: boolean
  avgBrightness: number
  saturation: number
}

// ─── Image Analysis ───────────────────────────────────────────────────────────

export async function analyzeImage(buffer: Buffer): Promise<ImageStats> {
  const img      = sharp(buffer)
  const meta     = await img.metadata()
  const stats    = await img.stats()
  const channels = stats.channels

  const width  = meta.width  ?? 0
  const height = meta.height ?? 0

  const isGrayscale =
    meta.channels === 1 ||
    (channels.length >= 3 &&
      Math.abs(channels[0].mean - channels[1].mean) < 10 &&
      Math.abs(channels[1].mean - channels[2].mean) < 10)

  const isLowRes   = Math.max(width, height) < 600
  const isTooSmall = Math.max(width, height) < 200

  const avgBrightness = channels.reduce((s, c) => s + c.mean, 0) / channels.length

  const saturation = channels.length >= 3
    ? Math.min(100, Math.abs(channels[0].mean - channels[2].mean) * 2)
    : 0

  return { isGrayscale, isLowRes, isTooSmall, width, height, hasAlpha: !!meta.hasAlpha, avgBrightness, saturation }
}

// ─── Model selection (kept for legacy compatibility) ──────────────────────────

export function selectModel(stats: ImageStats, _userHint?: string): DiagnosisResult {
  return {
    model:       'arielreplicate/deoldify',
    label:       'Restauração Completa',
    description: stats.isGrayscale
      ? 'Foto em preto e branco detectada. Coloriremos e restauraremos em duas etapas.'
      : 'Aplicaremos colorização e restauração de detalhes em duas etapas.',
    icon:        '✨',
    confidence:  95,
  }
}

// ─── Model input builders ─────────────────────────────────────────────────────

export const MODEL_CONFIGS: Record<string, {
  name: string
  buildInput: (imageUrl: string, retry?: boolean) => Record<string, unknown>
}> = {
  'piddnad/ddcolor': {
    name: 'piddnad/ddcolor',
    buildInput: (url, retry) => ({
      image: url,
      // retry uses a slightly lower render factor to reduce hallucinations
      ...(retry ? {} : {}),
    }),
  },
  'nightmareai/real-esrgan': {
    name: 'nightmareai/real-esrgan',
    buildInput: (url, retry) => ({
      image:        url,
      scale:        2,  // 2x upscale is enough for high quality without amplifying grain
      face_enhance: true, 
    }),
  },
  'sczhou/codeformer': {
    name: 'sczhou/codeformer',
    buildInput: (url, retry) => ({
      image:               url,
      codeformer_fidelity: retry ? 0.65 : 0.85, // high fidelity = preserve original face structure, not recreate
      background_enhance:  true,
      face_upsample:       true,
      upscale:             1, // ESRGAN already upscaled, no need for 2x more here
    }),
  },
  'microsoft/bringing-old-photos-back-to-life': {
    name: 'microsoft/bringing-old-photos-back-to-life',
    buildInput: (url) => ({
      image: url,
      HR: false, // Turn off HR to bypass Red Mask bug on extreme physical damage
      with_scratch: true
    }),
  },
  'megvii-research/nafnet': {
    name: 'megvii-research/nafnet',
    buildInput: (url) => ({
      image: url,
      task_type: 'Image Deblurring', // handles both motion blur and noise
    }),
  },
  'jingyunliang/swinir': {
    name: 'jingyunliang/swinir',
    buildInput: (url) => ({
      image:     url,
      task_type: 'JPEG Compression Artifact Reduction',
      jpeg:      40, // threshold for artifact removal
    }),
  },
  // Legacy aliases
  'arielreplicate/deoldify': {
    name: 'piddnad/ddcolor',
    buildInput: (url) => ({ image: url }),
  },
}

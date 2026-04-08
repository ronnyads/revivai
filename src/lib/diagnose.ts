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
      scale:        retry ? 2 : 4,  // 4x upscale → 16x more pixels for Codeformer
      face_enhance: true,            // pre-enhances faces before Codeformer pass
    }),
  },
  'sczhou/codeformer': {
    name: 'sczhou/codeformer',
    buildInput: (url, retry) => ({
      image:               url,
      // fidelity 0.5 = balanced: reconstructs detail strongly while preserving identity
      // fidelity 0.0 = ignores original → creates generic AI face (wrong identity!)
      // fidelity 1.0 = keeps original exactly → no improvement on degraded photo
      // 0.5 is the professional standard for old photo restoration
      codeformer_fidelity: retry ? 0.3 : 0.5,
      background_enhance:  true,
      face_upsample:       true,  // critical: detects + restores each face separately
      upscale:             2,
    }),
  },
  // Legacy aliases
  'arielreplicate/deoldify': {
    name: 'piddnad/ddcolor',
    buildInput: (url) => ({ image: url }),
  },
}

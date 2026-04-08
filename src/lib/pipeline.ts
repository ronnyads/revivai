import { ImageStats, PipelineModel } from './diagnose'

// ─── Pipeline Builder ─────────────────────────────────────────────────────────

/**
 * Builds the optimal processing pipeline based on image analysis.
 * Rules:
 *  1. DDColor ALWAYS first (colorizes B&W, enhances faded colors)
 *  2. Real-ESRGAN ONLY if resolution < 600px (upscale before face restoration)
 *  3. Codeformer ALWAYS last (face restoration + final upscale)
 */
export function buildPipeline(stats: ImageStats): PipelineModel[] {
  const steps: PipelineModel[] = []

  // Stage 1 — always colorize / enhance
  steps.push('piddnad/ddcolor')

  // Stage 2 — upscale if low resolution (before face restoration)
  if (stats.isLowRes) {
    steps.push('nightmareai/real-esrgan')
  }

  // Final stage — always face restoration + quality upscale
  steps.push('sczhou/codeformer')

  return steps
}

// ─── Phase Labels ─────────────────────────────────────────────────────────────

const MODEL_LABELS: Record<PipelineModel, string> = {
  'piddnad/ddcolor':          'Colorindo e melhorando cores',
  'nightmareai/real-esrgan':  'Aumentando resolução',
  'sczhou/codeformer':        'Restaurando rostos e detalhes',
}

export function getPhaseLabel(stepIndex: number, totalSteps: number, model: PipelineModel): string {
  return `Fase ${stepIndex + 1}/${totalSteps}: ${MODEL_LABELS[model]}...`
}

// ─── DB State Encoding ────────────────────────────────────────────────────────
// Stored in `restored_url` during processing: "PIPE:{stepIndex}:{predictionId}"

export function encodePipeState(stepIndex: number, predictionId: string): string {
  return `PIPE:${stepIndex}:${predictionId}`
}

export function decodePipeState(value: string): { stepIndex: number; predictionId: string } | null {
  if (!value?.startsWith('PIPE:')) return null
  const parts = value.split(':')
  if (parts.length < 3) return null
  const stepIndex = parseInt(parts[1])
  const predictionId = parts.slice(2).join(':') // safe join in case predId had colons
  if (isNaN(stepIndex) || !predictionId) return null
  return { stepIndex, predictionId }
}

// ─── Webhook URL Builder ──────────────────────────────────────────────────────

export interface WebhookParams {
  photoId:  string
  userId:   string
  step:     number
  pipeline: PipelineModel[]
  bestUrl:  string       // best result URL so far (empty string if none)
  inputW:   number
  inputH:   number
  isGray:   boolean
  retry:    number
}

export function buildWebhookUrl(baseUrl: string, params: WebhookParams): string {
  const url = new URL(`${baseUrl}/api/webhooks/replicate`)
  url.searchParams.set('photoId',  params.photoId)
  url.searchParams.set('userId',   params.userId)
  url.searchParams.set('step',     String(params.step))
  url.searchParams.set('pipeline', params.pipeline.join(','))
  url.searchParams.set('bestUrl',  params.bestUrl)
  url.searchParams.set('inputW',   String(params.inputW))
  url.searchParams.set('inputH',   String(params.inputH))
  url.searchParams.set('isGray',   params.isGray ? '1' : '0')
  url.searchParams.set('retry',    String(params.retry))
  return url.toString()
}

export function parseWebhookParams(searchParams: URLSearchParams): WebhookParams {
  return {
    photoId:  searchParams.get('photoId')  ?? '',
    userId:   searchParams.get('userId')   ?? '',
    step:     parseInt(searchParams.get('step')  ?? '0'),
    pipeline: (searchParams.get('pipeline') ?? '').split(',').filter(Boolean) as PipelineModel[],
    bestUrl:  searchParams.get('bestUrl')  ?? '',
    inputW:   parseInt(searchParams.get('inputW') ?? '0'),
    inputH:   parseInt(searchParams.get('inputH') ?? '0'),
    isGray:   searchParams.get('isGray') === '1',
    retry:    parseInt(searchParams.get('retry') ?? '0'),
  }
}

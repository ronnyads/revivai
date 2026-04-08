import { ImageStats, PipelineModel } from './diagnose'
import { SovereignAnalysis, EnterpriseAnalysis } from './openai'

// ─── Enterprise Pipeline Builder ─────────────────────────────────────────────
// Phase 1: Restoration only. DDColor is NEVER included here.
// Colorization is Phase 2 (separate credit, /api/colorize).

export function buildEnterprisePipeline(analysis: EnterpriseAnalysis): PipelineModel[] {
  const pipe: PipelineModel[] = []

  // Step 0: Physical damage (scratches, tears, mold, folds)
  if (analysis.has_scratches || analysis.has_tears_or_holes || analysis.has_mold_or_stains) {
    pipe.push('microsoft/bringing-old-photos-back-to-life')
  }

  // Step 0b: Generative inpainting for severe damage (mold/tears destroy large areas)
  // FLUX Fill Pro reconstructs missing regions using surrounding context
  if (analysis.has_mold_or_stains || analysis.has_tears_or_holes) {
    pipe.push('black-forest-labs/flux-fill-pro')
  }

  // Step 1: Optical damage (blur + grain — NAFNet handles both)
  if (analysis.has_blur || analysis.has_grain_or_noise) {
    pipe.push('megvii-research/nafnet')
  }

  // Step 2: Digital compression artifacts (before upscale — ESRGAN would amplify them)
  if (analysis.has_jpeg_artifacts) {
    pipe.push('jingyunliang/swinir')
  }

  // Step 3: Upscale (always)
  pipe.push('nightmareai/real-esrgan')

  // Step 4: Face restoration
  if (analysis.has_faces) {
    pipe.push('sczhou/codeformer')
  }

  return pipe
}

// ─── Legacy Pipeline Builder (kept for compatibility) ─────────────────────────

export function buildPipelineFromSovereign(analysis: SovereignAnalysis): PipelineModel[] {
  const pipe: PipelineModel[] = []
  if (analysis.needs_scratch_removal) pipe.push('microsoft/bringing-old-photos-back-to-life')
  // NOTE: needs_colorization intentionally excluded — colorization is now Phase 2
  pipe.push('nightmareai/real-esrgan')
  if (analysis.needs_face_restoration) pipe.push('sczhou/codeformer')
  return pipe
}

// ─── Phase Labels ─────────────────────────────────────────────────────────────

const MODEL_LABELS: Record<PipelineModel, string> = {
  'piddnad/ddcolor':                            'Colorindo e melhorando cores',
  'nightmareai/real-esrgan':                    'Aumentando resolução',
  'sczhou/codeformer':                          'Restaurando rostos e detalhes',
  'microsoft/bringing-old-photos-back-to-life': 'Removendo riscos e danos físicos',
  'megvii-research/nafnet':                      'Removendo desfoque e granulação',
  'jingyunliang/swinir':                        'Removendo artefatos de compressão',
  'black-forest-labs/flux-fill-pro':            'Reconstruindo áreas severamente danificadas',
  'arielreplicate/deoldify':                    'Colorindo (Legacy)',
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

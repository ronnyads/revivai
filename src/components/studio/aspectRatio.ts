export type StudioAspectRatio = '9:16' | '4:5' | '1:1' | '16:9'

export const STUDIO_ASPECT_RATIO_PRESETS: Array<{ value: StudioAspectRatio; label: string; hint?: string }> = [
  { value: '9:16', label: 'Reels', hint: '9:16' },
  { value: '4:5', label: 'Feed', hint: '4:5' },
  { value: '16:9', label: 'YouTube', hint: '16:9' },
  { value: '1:1', label: 'Catalogo', hint: '1:1' },
]

export function mapScriptFormatToAspectRatio(format?: unknown): StudioAspectRatio {
  const normalized = String(format ?? '').trim().toLowerCase()
  if (normalized === 'feed') return '4:5'
  if (normalized === 'youtube') return '16:9'
  return '9:16'
}

export function normalizeStudioAspectRatio(value?: unknown, fallback: StudioAspectRatio = '9:16'): StudioAspectRatio {
  const normalized = String(value ?? '').trim()
  if (normalized === '9:16' || normalized === '4:5' || normalized === '1:1' || normalized === '16:9') return normalized
  return fallback
}

export function getStudioAspectRatioFrameClass(value?: unknown, fallback: StudioAspectRatio = '4:5') {
  const ratio = normalizeStudioAspectRatio(value, fallback)
  if (ratio === '16:9') return 'aspect-video'
  if (ratio === '9:16') return 'aspect-[9/16]'
  if (ratio === '1:1') return 'aspect-square'
  return 'aspect-[4/5]'
}

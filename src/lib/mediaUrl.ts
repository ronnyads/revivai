export function getPreviewMediaUrl(url: string): string {
  if (!url) return url

  try {
    const parsed = new URL(url)
    parsed.searchParams.delete('_media_preview')
    parsed.hash = 'media-preview'
    return parsed.toString()
  } catch {
    const cleaned = url.replace(/([?&])_media_preview=1(&|$)/, '$1').replace(/[?&]$/, '')
    const hashSeparator = cleaned.includes('#') ? '&' : '#'
    return `${cleaned}${hashSeparator}media-preview`
  }
}

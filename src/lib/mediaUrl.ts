export function getPreviewMediaUrl(url: string): string {
  if (!url) return url

  try {
    const parsed = new URL(url)
    parsed.searchParams.set('_media_preview', '1')
    return parsed.toString()
  } catch {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}_media_preview=1`
  }
}

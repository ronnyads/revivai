import sharp from 'sharp'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QualityResult {
  passed:  boolean
  score:   number   // 0–100
  issues:  string[]
  outputStats?: {
    width:      number
    height:     number
    saturation: number
    brightness: number
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

async function analyzeBuffer(buffer: Buffer) {
  const img      = sharp(buffer)
  const meta     = await img.metadata()
  const stats    = await img.stats()
  const channels = stats.channels

  const width      = meta.width  ?? 0
  const height     = meta.height ?? 0
  const brightness = channels.reduce((s, c) => s + c.mean, 0) / channels.length
  const saturation = channels.length >= 3
    ? Math.min(100, Math.abs(channels[0].mean - channels[2].mean) * 2)
    : 0

  return { width, height, brightness, saturation }
}

// ─── Per-Stage Quality Checkers ───────────────────────────────────────────────

/**
 * DDColor quality check:
 *  - URL must be accessible              (+30)
 *  - Valid dimensions                    (+20)
 *  - If input was B&W: saturation ≥ 20  (+30)
 *  - Brightness normal (40–220)         (+20)
 *  Pass threshold: 60/100
 */
export async function checkColorization(
  outputUrl: string,
  wasGrayscale: boolean,
): Promise<QualityResult> {
  const issues: string[] = []
  let score = 0

  const buffer = await fetchImageBuffer(outputUrl)
  if (!buffer) return { passed: false, score: 0, issues: ['Output URL inacessível'] }
  score += 30

  try {
    const { width, height, brightness, saturation } = await analyzeBuffer(buffer)

    if (width > 0 && height > 0) score += 20
    else issues.push('Dimensões inválidas')

    if (wasGrayscale) {
      if (saturation >= 20) score += 30
      else issues.push(`Saturação baixa pós-colorização: ${saturation.toFixed(1)} (esperado ≥ 20)`)
    } else {
      score += 30 // color photo doesn't need to gain saturation
    }

    if (brightness >= 40 && brightness <= 220) score += 20
    else issues.push(`Brilho anormal: ${brightness.toFixed(1)}`)

    return { passed: score >= 60, score, issues, outputStats: { width, height, saturation, brightness } }
  } catch (err: any) {
    return { passed: false, score, issues: [`Sharp error: ${err.message}`] }
  }
}

/**
 * Real-ESRGAN quality check:
 *  - URL accessible                                  (+30)
 *  - Output resolution ≥ input resolution            (+40)
 *  - Brightness normal                               (+30)
 *  Pass threshold: 60/100
 */
export async function checkUpscale(
  outputUrl: string,
  inputW: number,
  inputH: number,
): Promise<QualityResult> {
  const issues: string[] = []
  let score = 0

  const buffer = await fetchImageBuffer(outputUrl)
  if (!buffer) return { passed: false, score: 0, issues: ['Output URL inacessível'] }
  score += 30

  try {
    const { width, height, brightness, saturation } = await analyzeBuffer(buffer)

    if (width >= inputW && height >= inputH) score += 40
    else issues.push(`Resolução não aumentou: ${width}×${height} vs ${inputW}×${inputH}`)

    if (brightness >= 40 && brightness <= 220) score += 30
    else issues.push(`Brilho anormal: ${brightness.toFixed(1)}`)

    return { passed: score >= 60, score, issues, outputStats: { width, height, saturation, brightness } }
  } catch (err: any) {
    return { passed: false, score, issues: [`Sharp error: ${err.message}`] }
  }
}

/**
 * NAFNet (deblur/denoise) quality check:
 *  - URL accessible                (+30)
 *  - Valid dimensions              (+30)
 *  - Brightness normal             (+40)
 *  Pass threshold: 60/100
 */
export async function checkDeblurDenoise(
  outputUrl: string,
  inputW: number,
  inputH: number,
): Promise<QualityResult> {
  const issues: string[] = []
  let score = 0

  const buffer = await fetchImageBuffer(outputUrl)
  if (!buffer) return { passed: false, score: 0, issues: ['Output URL inacessível'] }
  score += 30

  try {
    const { width, height, brightness, saturation } = await analyzeBuffer(buffer)

    if (width > 0 && height > 0) score += 30
    else issues.push('Dimensões inválidas')

    if (brightness >= 40 && brightness <= 220) score += 40
    else issues.push(`Brilho anormal: ${brightness.toFixed(1)}`)

    return { passed: score >= 60, score, issues, outputStats: { width, height, saturation, brightness } }
  } catch (err: any) {
    return { passed: false, score, issues: [`Sharp error: ${err.message}`] }
  }
}

/**
 * SwinIR (JPEG artifact removal) quality check:
 *  - URL accessible                            (+30)
 *  - Dimensions preserved (≥ input)            (+40)
 *  - Brightness normal                         (+30)
 *  Pass threshold: 60/100
 */
export async function checkArtifactRemoval(
  outputUrl: string,
  inputW: number,
  inputH: number,
): Promise<QualityResult> {
  const issues: string[] = []
  let score = 0

  const buffer = await fetchImageBuffer(outputUrl)
  if (!buffer) return { passed: false, score: 0, issues: ['Output URL inacessível'] }
  score += 30

  try {
    const { width, height, brightness, saturation } = await analyzeBuffer(buffer)

    if (width >= inputW && height >= inputH) score += 40
    else issues.push(`Dimensões menores que entrada: ${width}×${height} vs ${inputW}×${inputH}`)

    if (brightness >= 40 && brightness <= 220) score += 30
    else issues.push(`Brilho anormal: ${brightness.toFixed(1)}`)

    return { passed: score >= 60, score, issues, outputStats: { width, height, saturation, brightness } }
  } catch (err: any) {
    return { passed: false, score, issues: [`Sharp error: ${err.message}`] }
  }
}

/**
 * Codeformer (final) quality check:
 *  - URL accessible                (+30)
 *  - Valid dimensions              (+30)
 *  - Some color present            (+20)
 *  - Brightness normal             (+20)
 *  Pass threshold: 60/100
 */
export async function checkFaceRestoration(outputUrl: string): Promise<QualityResult> {
  const issues: string[] = []
  let score = 0

  const buffer = await fetchImageBuffer(outputUrl)
  if (!buffer) return { passed: false, score: 0, issues: ['Output URL inacessível'] }
  score += 30

  try {
    const { width, height, brightness, saturation } = await analyzeBuffer(buffer)

    if (width > 0 && height > 0) score += 30
    else issues.push('Dimensões inválidas')

    if (saturation > 5) score += 20
    else issues.push(`Saturação muito baixa: ${saturation.toFixed(1)}`)

    if (brightness >= 40 && brightness <= 220) score += 20
    else issues.push(`Brilho anormal: ${brightness.toFixed(1)}`)

    return { passed: score >= 60, score, issues, outputStats: { width, height, saturation, brightness } }
  } catch (err: any) {
    return { passed: false, score, issues: [`Sharp error: ${err.message}`] }
  }
}

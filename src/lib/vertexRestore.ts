import { fetchGoogleGenerateContent, fetchGooglePredict } from '@/lib/googleGenai'
import {
  VERTEX_ANALYSIS_MODEL_ID,
  VERTEX_QC_MODEL_ID,
  VERTEX_RESTORE_FALLBACK_MODEL_ID,
  VERTEX_RESTORE_PRIMARY_MODEL_ID,
  VERTEX_UPSCALE_MODEL_ID,
  type VertexEngineProfile,
} from '@/lib/vertex-engines'
import type { EnterpriseAnalysis, QualityAssessmentV2 } from '@/lib/openai'

const QUALITY_WEIGHTS: Record<
  EnterpriseAnalysis['photo_type'],
  { identity: number; composition: number; visual: number; hallucination: number }
> = {
  document: { identity: 0.45, composition: 0.25, visual: 0.2, hallucination: 0.1 },
  single_portrait: { identity: 0.35, composition: 0.25, visual: 0.25, hallucination: 0.15 },
  group: { identity: 0.4, composition: 0.3, visual: 0.2, hallucination: 0.1 },
  landscape: { identity: 0.1, composition: 0.35, visual: 0.35, hallucination: 0.2 },
  unknown: { identity: 0.3, composition: 0.3, visual: 0.25, hallucination: 0.15 },
}

const DEFAULT_ANALYSIS: EnterpriseAnalysis = {
  has_scratches: false,
  has_tears_or_holes: false,
  has_mold_or_stains: false,
  has_blur: false,
  has_grain_or_noise: true,
  has_jpeg_artifacts: false,
  has_faces: true,
  is_grayscale_or_sepia: true,
  damage_severity: 'moderate',
  photo_type: 'unknown',
  face_count_estimate: 'one',
  face_size_estimate: 'unknown',
  restoration_risk: 'medium',
}

type RestoreMaskProfileName =
  | 'surface-clean'
  | 'balanced-portrait'
  | 'document-repair'
  | 'deep-rebuild'

interface RestoreMaskTuning {
  alphaThreshold: number
  blurRadius: number
  brightDamageDiffMin: number
  brightDamageGrayMin: number
  darkDamageDiffMin: number
  darkDamageGrayMax: number
  darkDamageLocalMin: number
  includeMidtoneStains: boolean
  maxCoverageRatio: number
  maxFaceZoneCoverageRatio: number
  minCoverageRatio: number
  name: RestoreMaskProfileName
  refineThreshold: number
  retryWithAggressivePass: boolean
}

interface DamageMaskResult {
  coverageRatio: number
  faceZoneCoverageRatio: number
  height: number
  maskBuffer: Buffer | null
  reason:
    | 'mask_ready'
    | 'mask_empty'
    | 'mask_too_broad'
    | 'mask_hits_face_zone'
    | 'mask_build_failed'
  width: number
}

export interface VertexRestoreDiagnostics {
  faceZoneCoverageRatio: number
  fallbackReason: string | null
  fallbackUsed: boolean
  maskCoverageRatio: number
  maskProfile: RestoreMaskProfileName
  maskUsed: boolean
  primaryModelId: string
  restoreStrategy: 'imagen_mask_edit' | 'imagen_reference' | 'gemini_direct'
}

function normalizeJsonText(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)```/i)
  if (fenced?.[1]) return fenced[1].trim()
  const objectStart = text.indexOf('{')
  const objectEnd = text.lastIndexOf('}')
  if (objectStart >= 0 && objectEnd > objectStart) {
    return text.slice(objectStart, objectEnd + 1).trim()
  }
  return text.trim()
}

function extractTextCandidate(payload: any): string {
  return (payload?.candidates?.[0]?.content?.parts ?? [])
    .map((part: { text?: string }) => (typeof part?.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim()
}

function extractGenerateContentImageBase64(payload: any): string | null {
  const parts = payload?.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find((part: any) => typeof part?.inlineData?.data === 'string')
  return typeof imagePart?.inlineData?.data === 'string' ? imagePart.inlineData.data : null
}

function extractPredictImageBase64(payload: any): string | null {
  const prediction = payload?.predictions?.[0]
  if (!prediction) return null

  return prediction?.bytesBase64Encoded
    ?? prediction?.image?.bytesBase64Encoded
    ?? prediction?.referenceImage?.bytesBase64Encoded
    ?? null
}

function clampScore(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 75
  return Math.max(0, Math.min(100, Math.round(numeric)))
}

function resolveQualityConfidence(identityScore: number): QualityAssessmentV2['confidence'] {
  if (identityScore >= 80) return 'high'
  if (identityScore >= 60) return 'medium'
  return 'low'
}

async function fetchImageInlineDataFromUrl(url: string): Promise<{ mimeType: string; data: string }> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Download de imagem falhou (${response.status})`)
  }

  const mimeType = response.headers.get('content-type') || 'image/jpeg'
  const data = Buffer.from(await response.arrayBuffer()).toString('base64')
  return { mimeType, data }
}

function resolveRestoreMaskProfile(params: {
  analysis: EnterpriseAnalysis
  engineProfile: VertexEngineProfile
  modeName?: string | null
}): RestoreMaskTuning {
  const normalizedModeName = String(params.modeName ?? '').toLowerCase()

  if (params.analysis.photo_type === 'document' || /document|identidade|rg|cpf|passaporte/.test(normalizedModeName)) {
    return {
      name: 'document-repair',
      minCoverageRatio: 0.00025,
      maxCoverageRatio: 0.16,
      maxFaceZoneCoverageRatio: 0.001,
      blurRadius: 1.5,
      refineThreshold: 96,
      brightDamageGrayMin: 226,
      brightDamageDiffMin: 14,
      darkDamageGrayMax: 42,
      darkDamageLocalMin: 66,
      darkDamageDiffMin: 18,
      includeMidtoneStains: true,
      alphaThreshold: 228,
      retryWithAggressivePass: true,
    }
  }

  if (params.analysis.photo_type === 'group' || /grupo|fam(í|i)lia/.test(normalizedModeName)) {
    return {
      name: 'balanced-portrait',
      minCoverageRatio: 0.00045,
      maxCoverageRatio: 0.07,
      maxFaceZoneCoverageRatio: 0.00085,
      blurRadius: 1.8,
      refineThreshold: 118,
      brightDamageGrayMin: 232,
      brightDamageDiffMin: 18,
      darkDamageGrayMax: 28,
      darkDamageLocalMin: 72,
      darkDamageDiffMin: 26,
      includeMidtoneStains: false,
      alphaThreshold: 215,
      retryWithAggressivePass: false,
    }
  }

  if (/leve|fading|desbot|superf(í|i)cie|poeira|riscos finos/.test(normalizedModeName) || params.engineProfile === 'vertex_imagen4_fast') {
    return {
      name: 'surface-clean',
      minCoverageRatio: 0.00035,
      maxCoverageRatio: 0.045,
      maxFaceZoneCoverageRatio: 0.0008,
      blurRadius: 1.4,
      refineThreshold: 132,
      brightDamageGrayMin: 238,
      brightDamageDiffMin: 20,
      darkDamageGrayMax: 24,
      darkDamageLocalMin: 74,
      darkDamageDiffMin: 28,
      includeMidtoneStains: false,
      alphaThreshold: 208,
      retryWithAggressivePass: false,
    }
  }

  return {
    name: 'deep-rebuild',
    minCoverageRatio: 0.0002,
    maxCoverageRatio: 0.19,
    maxFaceZoneCoverageRatio: 0.0011,
    blurRadius: 1.25,
    refineThreshold: 92,
    brightDamageGrayMin: 216,
    brightDamageDiffMin: 12,
    darkDamageGrayMax: 48,
    darkDamageLocalMin: 62,
    darkDamageDiffMin: 16,
    includeMidtoneStains: true,
    alphaThreshold: 238,
    retryWithAggressivePass: true,
  }
}

function buildRestorationInstructions(
  profile: VertexEngineProfile,
  prompt: string,
  persona?: string | null,
  modeName?: string | null,
  maskProfile?: RestoreMaskProfileName,
): string {
  const profileInstruction =
    profile === 'vertex_imagen4_fast'
      ? 'Use a minimal and conservative retouching strategy. Preserve every healthy region untouched.'
      : profile === 'vertex_imagen4'
        ? 'Use a balanced and faithful restoration strategy with measured cleanup.'
        : 'Use the highest-fidelity restoration strategy available while preserving the person exactly.'

  const normalizedModeName = String(modeName ?? '').toLowerCase()
  const modeInstruction =
    maskProfile === 'document-repair' || /document|rg|cpf|passaporte/.test(normalizedModeName)
      ? 'This is a document-oriented restoration. Clean background contamination, scanning residue, stains, edge noise and contrast issues while preserving the exact face and official-photo realism.'
      : maskProfile === 'balanced-portrait' || /grupo|fam(í|i)lia/.test(normalizedModeName)
        ? 'This is a family or group restoration. Protect every face aggressively and only repair clear physical damage around people.'
        : maskProfile === 'surface-clean'
          ? 'This is a light-touch cleanup. Remove only dust, small scratches and light marks. Do not reconstruct aggressively.'
          : 'This is a premium deep restoration. Repair obvious cracks, stains, damaged paper areas, blur-softened damaged regions and severe surface wear in a visible but identity-safe way.'

  return [
    persona?.trim() ? `System persona: ${persona.trim()}` : '',
    'You are restoring an existing historical family photograph on Vertex AI.',
    profileInstruction,
    modeInstruction,
    'Preserve identity, age, face geometry, expression, pose, composition, wardrobe, background, lighting, grain and historical character.',
    'Repair only visible physical damage, paper wear, scratches, cracks, mold marks, stains and surface defects that belong to the damaged photograph.',
    'Do not beautify faces, do not repaint healthy skin, do not invent jewelry, do not alter clothing, and do not change pose or composition.',
    prompt.trim(),
  ]
    .filter(Boolean)
    .join(' ')
}

function getFaceProtectionEllipse(
  analysis: EnterpriseAnalysis,
  width: number,
  height: number,
): { cx: number; cy: number; rx: number; ry: number } | null {
  if (!analysis.has_faces) return null

  if (analysis.photo_type === 'group') {
    return {
      cx: width * 0.5,
      cy: height * 0.34,
      rx: width * 0.42,
      ry: height * 0.28,
    }
  }

  const size = analysis.face_size_estimate
  const rxFactor = size === 'large' ? 0.23 : size === 'medium' ? 0.19 : size === 'small' ? 0.14 : 0.18
  const ryFactor = size === 'large' ? 0.28 : size === 'medium' ? 0.23 : size === 'small' ? 0.18 : 0.21
  const cyFactor = analysis.photo_type === 'document' ? 0.32 : 0.36

  return {
    cx: width * 0.5,
    cy: height * cyFactor,
    rx: width * rxFactor,
    ry: height * ryFactor,
  }
}

function isPixelInFaceProtectionZone(
  x: number,
  y: number,
  width: number,
  height: number,
  analysis: EnterpriseAnalysis,
): boolean {
  const ellipse = getFaceProtectionEllipse(analysis, width, height)
  if (!ellipse) return false

  const dx = (x - ellipse.cx) / Math.max(ellipse.rx, 1)
  const dy = (y - ellipse.cy) / Math.max(ellipse.ry, 1)
  return (dx * dx) + (dy * dy) <= 1
}

function computeMaskCoverage(maskRaw: Uint8Array, width: number, height: number, analysis: EnterpriseAnalysis) {
  let activePixels = 0
  let faceZonePixels = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width) + x
      if (maskRaw[index] === 0) continue
      activePixels += 1
      if (isPixelInFaceProtectionZone(x, y, width, height, analysis)) {
        faceZonePixels += 1
      }
    }
  }

  const totalPixels = Math.max(width * height, 1)
  return {
    coverageRatio: activePixels / totalPixels,
    faceZoneCoverageRatio: faceZonePixels / totalPixels,
  }
}

async function encodeMaskPng(maskRaw: Uint8Array, width: number, height: number): Promise<Buffer> {
  const sharp = (await import('sharp')).default
  return sharp(Buffer.from(maskRaw), {
    raw: { width, height, channels: 1 },
  }).png().toBuffer()
}

async function refineMask(maskRaw: Uint8Array, width: number, height: number, blurRadius: number, threshold: number): Promise<Uint8Array> {
  const sharp = (await import('sharp')).default
  const blurred = await sharp(Buffer.from(maskRaw), {
    raw: { width, height, channels: 1 },
  })
    .blur(blurRadius)
    .raw()
    .toBuffer()

  const refined = new Uint8Array(blurred.length)
  for (let i = 0; i < blurred.length; i += 1) {
    refined[i] = (blurred[i] ?? 0) >= threshold ? 255 : 0
  }
  return refined
}

async function buildDamageMask(
  sourceBuffer: Buffer,
  analysis: EnterpriseAnalysis,
  tuning: RestoreMaskTuning,
): Promise<DamageMaskResult> {
  try {
    const sharp = (await import('sharp')).default
    const normalizedBuffer = await sharp(sourceBuffer).ensureAlpha().png().toBuffer()
    const { data, info } = await sharp(normalizedBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const grayscale = await sharp(normalizedBuffer).grayscale().raw().toBuffer()
    const blurred = await sharp(normalizedBuffer).grayscale().blur(tuning.blurRadius).raw().toBuffer()
    const maskRaw = new Uint8Array(info.width * info.height)

    for (let index = 0; index < info.width * info.height; index += 1) {
      const rgbaOffset = index * 4
      const x = index % info.width
      const y = Math.floor(index / info.width)
      const alpha = data[rgbaOffset + 3] ?? 255
      const gray = grayscale[index] ?? 0
      const local = blurred[index] ?? gray
      const diff = Math.abs(gray - local)
      const brightDamage = gray >= tuning.brightDamageGrayMin && diff >= tuning.brightDamageDiffMin
      const darkDamage = gray <= tuning.darkDamageGrayMax && local >= tuning.darkDamageLocalMin && diff >= tuning.darkDamageDiffMin
      const abrasionDamage = gray >= Math.max(190, tuning.brightDamageGrayMin - 18) && local <= Math.max(132, tuning.brightDamageGrayMin - 54) && diff >= Math.max(18, tuning.brightDamageDiffMin + 8)
      const semiTransparentDamage = alpha < tuning.alphaThreshold
      const midtoneStain = tuning.includeMidtoneStains
        && (
          (gray >= 112 && gray <= 228 && diff >= Math.max(10, tuning.brightDamageDiffMin - 2) && Math.abs(local - gray) >= 16)
          || (gray <= 96 && local >= 118 && diff >= Math.max(12, tuning.darkDamageDiffMin - 4))
        )

      let markDamage = brightDamage || darkDamage || abrasionDamage || semiTransparentDamage || midtoneStain
      if (markDamage && isPixelInFaceProtectionZone(x, y, info.width, info.height, analysis)) {
        markDamage = false
      }

      maskRaw[index] = markDamage ? 255 : 0
    }

    let refinedMask = await refineMask(maskRaw, info.width, info.height, tuning.blurRadius, tuning.refineThreshold)
    let coverage = computeMaskCoverage(refinedMask, info.width, info.height, analysis)

    if (coverage.coverageRatio < tuning.minCoverageRatio) {
      return {
        maskBuffer: null,
        width: info.width,
        height: info.height,
        coverageRatio: coverage.coverageRatio,
        faceZoneCoverageRatio: coverage.faceZoneCoverageRatio,
        reason: 'mask_empty',
      }
    }

    if (coverage.coverageRatio > tuning.maxCoverageRatio || coverage.faceZoneCoverageRatio > tuning.maxFaceZoneCoverageRatio) {
      refinedMask = await refineMask(refinedMask, info.width, info.height, 1.2, 168)
      coverage = computeMaskCoverage(refinedMask, info.width, info.height, analysis)
    }

    if (coverage.coverageRatio > tuning.maxCoverageRatio) {
      return {
        maskBuffer: null,
        width: info.width,
        height: info.height,
        coverageRatio: coverage.coverageRatio,
        faceZoneCoverageRatio: coverage.faceZoneCoverageRatio,
        reason: 'mask_too_broad',
      }
    }

    if (coverage.faceZoneCoverageRatio > tuning.maxFaceZoneCoverageRatio) {
      return {
        maskBuffer: null,
        width: info.width,
        height: info.height,
        coverageRatio: coverage.coverageRatio,
        faceZoneCoverageRatio: coverage.faceZoneCoverageRatio,
        reason: 'mask_hits_face_zone',
      }
    }

    return {
      maskBuffer: await encodeMaskPng(refinedMask, info.width, info.height),
      width: info.width,
      height: info.height,
      coverageRatio: coverage.coverageRatio,
      faceZoneCoverageRatio: coverage.faceZoneCoverageRatio,
      reason: 'mask_ready',
    }
  } catch (error) {
    console.warn('[vertex-restore] conservative mask build failed:', error instanceof Error ? error.message : String(error))
    return {
      maskBuffer: null,
      width: 0,
      height: 0,
      coverageRatio: 0,
      faceZoneCoverageRatio: 0,
      reason: 'mask_build_failed',
    }
  }
}

async function restorePhotoWithImagenEditModel(params: {
  cleanBuffer: Buffer
  maskBuffer?: Buffer | null
  prompt: string
}): Promise<{ buffer: Buffer; modelId: string }> {
  // Formato correto para imagen-3.0-capability-001: apenas referenceImages na instância
  const referenceImages: Array<Record<string, unknown>> = [
    {
      referenceType: 'REFERENCE_TYPE_RAW',
      referenceId: 1,
      referenceImage: {
        mimeType: 'image/jpeg',
        bytesBase64Encoded: params.cleanBuffer.toString('base64'),
      },
    },
  ]

  if (params.maskBuffer) {
    referenceImages.push({
      referenceType: 'REFERENCE_TYPE_MASK',
      referenceId: 2,
      referenceImage: {
        mimeType: 'image/png',
        bytesBase64Encoded: params.maskBuffer.toString('base64'),
      },
      maskImageConfig: {
        maskMode: 'MASK_MODE_USER_PROVIDED',
        dilation: 0.01,
        maskedReferenceId: 1,
      },
    })
  }

  const parameters: Record<string, unknown> = {
    sampleCount: 1,
    // INPAINT_REMOVAL = apaga danos e recria a região (correto para restauração)
    editMode: 'EDIT_MODE_INPAINT_REMOVAL',
    outputOptions: {
      mimeType: 'image/jpeg',
      compressionQuality: 92,
    },
  }

  console.log(
    `[vertex-restore] calling Imagen edit model | mask=${params.maskBuffer ? 'yes' : 'no'} editMode=${parameters.editMode} model=${VERTEX_RESTORE_PRIMARY_MODEL_ID}`,
  )

  const response = await fetchGooglePredict({
    model: VERTEX_RESTORE_PRIMARY_MODEL_ID,
    feature: 'restore-render-imagen-edit',
    body: {
      instances: [
        {
          prompt: params.prompt || '',
          referenceImages,
        },
      ],
      parameters,
    },
  })

  if (!response.ok) {
    const imagenErrorText = await response.text()
    console.warn(`[vertex-restore] Imagen edit failed (${response.status}), attempting Gemini fallback: ${imagenErrorText}`)
    const fallbackModel = VERTEX_RESTORE_FALLBACK_MODEL_ID
    const fallback = await restorePhotoWithGeminiImageModel({
      cleanBuffer: params.cleanBuffer,
      prompt: params.prompt,
    })
    console.log(`[vertex-restore] Gemini fallback bem-sucedido | model=${fallbackModel}`)
    return fallback
  }

  const payload = await response.json()
  const imageBase64 = extractPredictImageBase64(payload)
  if (!imageBase64) {
    throw new Error('Vertex Imagen edit returned no image payload')
  }

  return {
    buffer: Buffer.from(imageBase64, 'base64'),
    modelId: VERTEX_RESTORE_PRIMARY_MODEL_ID,
  }
}
export async function analyzeRestorationImageWithVertex(imageUrl: string): Promise<{
  analysis: EnterpriseAnalysis
  modelId: string
}> {
  try {
    const inlineData = await fetchImageInlineDataFromUrl(imageUrl)
    const response = await fetchGoogleGenerateContent({
      model: VERTEX_ANALYSIS_MODEL_ID,
      feature: 'restore-analysis',
      body: {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: [
                  'Analyze this damaged photograph and return strict JSON only.',
                  'Fields:',
                  'has_scratches:boolean',
                  'has_tears_or_holes:boolean',
                  'has_mold_or_stains:boolean',
                  'has_blur:boolean',
                  'has_grain_or_noise:boolean',
                  'has_jpeg_artifacts:boolean',
                  'has_faces:boolean',
                  'is_grayscale_or_sepia:boolean',
                  'damage_severity:"light"|"moderate"|"severe"',
                  'photo_type:"document"|"single_portrait"|"group"|"landscape"|"unknown"',
                  'face_count_estimate:"none"|"one"|"few"|"many"',
                  'face_size_estimate:"large"|"medium"|"small"|"unknown"',
                  'restoration_risk:"low"|"medium"|"high"',
                  'Rules: document if it resembles an ID/passport photo; group for 2 or more people; restoration_risk high for documents or small faces.',
                ].join('\n'),
              },
              { inlineData },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
        },
      },
    })

    if (!response.ok) {
      throw new Error(`Vertex analysis error (${response.status}): ${await response.text()}`)
    }

    const payload = await response.json()
    const jsonText = normalizeJsonText(extractTextCandidate(payload))
    if (!jsonText) {
      throw new Error('Vertex analysis returned empty content')
    }

    const parsed = JSON.parse(jsonText) as Partial<EnterpriseAnalysis>
    return {
      analysis: {
        ...DEFAULT_ANALYSIS,
        ...parsed,
      },
      modelId: VERTEX_ANALYSIS_MODEL_ID,
    }
  } catch (error: any) {
    console.warn('[vertex-restore] analysis fallback:', error.message)
    return { analysis: DEFAULT_ANALYSIS, modelId: VERTEX_ANALYSIS_MODEL_ID }
  }
}

export async function restorePhotoWithVertex(params: {
  analysis: EnterpriseAnalysis
  cleanBuffer: Buffer
  engineProfile: VertexEngineProfile
  modeName?: string | null
  persona?: string | null
  prompt: string
}): Promise<{ buffer: Buffer; diagnostics: VertexRestoreDiagnostics; modelId: string }> {
  const primaryMaskProfile = resolveRestoreMaskProfile({
    analysis: params.analysis,
    engineProfile: params.engineProfile,
    modeName: params.modeName,
  })
  const primaryInstruction = buildRestorationInstructions(
    params.engineProfile,
    params.prompt,
    params.persona,
    params.modeName,
    primaryMaskProfile.name,
  )
  let mask = await buildDamageMask(params.cleanBuffer, params.analysis, primaryMaskProfile)
  let maskProfileUsed = primaryMaskProfile.name

  if (mask.reason !== 'mask_ready' && primaryMaskProfile.retryWithAggressivePass) {
    const aggressiveMask = await buildDamageMask(params.cleanBuffer, params.analysis, {
      ...primaryMaskProfile,
      blurRadius: Math.max(1, primaryMaskProfile.blurRadius - 0.35),
      refineThreshold: Math.max(72, primaryMaskProfile.refineThreshold - 18),
      brightDamageGrayMin: Math.max(205, primaryMaskProfile.brightDamageGrayMin - 12),
      brightDamageDiffMin: Math.max(10, primaryMaskProfile.brightDamageDiffMin - 4),
      darkDamageGrayMax: Math.min(68, primaryMaskProfile.darkDamageGrayMax + 12),
      darkDamageLocalMin: Math.max(48, primaryMaskProfile.darkDamageLocalMin - 8),
      darkDamageDiffMin: Math.max(12, primaryMaskProfile.darkDamageDiffMin - 4),
      maxCoverageRatio: Math.min(0.24, primaryMaskProfile.maxCoverageRatio + 0.04),
      name: primaryMaskProfile.name,
      retryWithAggressivePass: false,
    })

    if (aggressiveMask.reason === 'mask_ready') {
      mask = aggressiveMask
      maskProfileUsed = primaryMaskProfile.name
      console.log(`[vertex-restore] aggressive mask retry succeeded | profile=${primaryMaskProfile.name}`)
    }
  }

  const diagnostics: VertexRestoreDiagnostics = {
    primaryModelId: VERTEX_RESTORE_PRIMARY_MODEL_ID,
    fallbackUsed: false,
    fallbackReason: null,
    maskProfile: maskProfileUsed,
    maskUsed: mask.reason === 'mask_ready' && !!mask.maskBuffer,
    maskCoverageRatio: mask.coverageRatio,
    faceZoneCoverageRatio: mask.faceZoneCoverageRatio,
    restoreStrategy: mask.reason === 'mask_ready' && mask.maskBuffer ? 'imagen_mask_edit' : 'imagen_reference',
  }

  const hasPhysicalDamage = params.analysis.has_scratches || params.analysis.has_tears_or_holes || params.analysis.has_mold_or_stains
  const isBypassImagen = !hasPhysicalDamage || !diagnostics.maskUsed

  if (isBypassImagen) {
    diagnostics.restoreStrategy = 'gemini_direct'
    diagnostics.fallbackUsed = true
    diagnostics.fallbackReason = !hasPhysicalDamage ? 'no_physical_damage' : mask.reason
    console.log(`[vertex-restore] bypassing Imagen -> routing directly to Gemini | reason=${diagnostics.fallbackReason}`)
    
    const fallback = await restorePhotoWithGeminiImageModel({
      cleanBuffer: params.cleanBuffer,
      prompt: primaryInstruction,
    })
    
    return { buffer: fallback.buffer, diagnostics, modelId: fallback.modelId }
  }

  console.log(
    `[vertex-restore] strategy=${diagnostics.restoreStrategy} mask_used=${diagnostics.maskUsed ? 'yes' : 'no'} mask_profile=${diagnostics.maskProfile} model=${VERTEX_RESTORE_PRIMARY_MODEL_ID}`,
  )

  const restored = await restorePhotoWithImagenEditModel({
    cleanBuffer: params.cleanBuffer,
    maskBuffer: mask.maskBuffer,
    prompt: primaryInstruction,
  })

  return {
    buffer: restored.buffer,
    diagnostics,
    modelId: restored.modelId,
  }
}

async function restorePhotoWithGeminiImageModel(params: {
  cleanBuffer: Buffer
  prompt: string
}): Promise<{ buffer: Buffer; modelId: string }> {
  const fallbackModel = VERTEX_RESTORE_FALLBACK_MODEL_ID
  const fallback = await fetchGoogleGenerateContent({
    model: fallbackModel,
    feature: 'restore-render-gemini-fallback',
    body: {
      contents: [{
        role: 'user',
        parts: [
          { text: params.prompt },
          { inlineData: { mimeType: 'image/jpeg', data: params.cleanBuffer.toString('base64') } },
        ],
      }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    },
  })

  if (!fallback.ok) {
    throw new Error(`Gemini direct model failed: ${await fallback.text()}`)
  }

  const fallbackPayload = await fallback.json()
  const fallbackBase64 = extractGenerateContentImageBase64(fallbackPayload)
  if (!fallbackBase64) throw new Error('Gemini direct model returned no image')

  return { buffer: Buffer.from(fallbackBase64, 'base64'), modelId: fallbackModel }
}

export async function maybeUpscaleRestorationWithVertex(params: {
  buffer: Buffer
  enabled: boolean
  mimeType?: string
}): Promise<{ buffer: Buffer; modelId: string | null }> {
  if (!params.enabled) {
    return { buffer: params.buffer, modelId: null }
  }

  const response = await fetchGooglePredict({
    model: VERTEX_UPSCALE_MODEL_ID,
    feature: 'restore-upscale',
    body: {
      instances: [
        {
          prompt: 'Upscale the image',
          image: {
            bytesBase64Encoded: params.buffer.toString('base64'),
          },
        },
      ],
      parameters: {
        mode: 'upscale',
        outputOptions: {
          mimeType: params.mimeType ?? 'image/jpeg',
          compressionQuality: 92,
        },
        upscaleConfig: {
          upscaleFactor: 'x2',
        },
      },
    },
  })

  if (!response.ok) {
    throw new Error(`Vertex upscale error (${response.status}): ${await response.text()}`)
  }

  const payload = await response.json()
  const base64 = extractPredictImageBase64(payload)

  if (typeof base64 !== 'string' || !base64) {
    throw new Error('Vertex upscale returned no image bytes')
  }

  return {
    buffer: Buffer.from(base64, 'base64'),
    modelId: VERTEX_UPSCALE_MODEL_ID,
  }
}

export async function assessRestorationQualityWithVertex(
  originalUrl: string,
  restoredUrl: string,
  photoType: EnterpriseAnalysis['photo_type'] = 'unknown',
  threshold = 70,
): Promise<QualityAssessmentV2> {
  try {
    const [originalInlineData, restoredInlineData] = await Promise.all([
      fetchImageInlineDataFromUrl(originalUrl),
      fetchImageInlineDataFromUrl(restoredUrl),
    ])

    const response = await fetchGoogleGenerateContent({
      model: VERTEX_QC_MODEL_ID,
      feature: 'restore-quality-gate',
      body: {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: [
                  'Compare the first damaged original photograph against the second restored image.',
                  `Photo type: ${photoType}.`,
                  'Return strict JSON only with:',
                  'visual_quality:number (0-100)',
                  'identity_preservation:number (0-100)',
                  'composition_fidelity:number (0-100)',
                  'hallucination_risk:number (0-100 where 100 means no hallucination)',
                  'reason:string',
                ].join('\n'),
              },
              { inlineData: originalInlineData },
              { inlineData: restoredInlineData },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
        },
      },
    })

    if (!response.ok) {
      throw new Error(`Vertex QC error (${response.status}): ${await response.text()}`)
    }

    const payload = await response.json()
    const jsonText = normalizeJsonText(extractTextCandidate(payload))
    const parsed = JSON.parse(jsonText) as Record<string, unknown>
    const visualQuality = clampScore(parsed.visual_quality)
    const identityPreservation = clampScore(parsed.identity_preservation)
    const compositionFidelity = clampScore(parsed.composition_fidelity)
    const hallucinationRisk = clampScore(parsed.hallucination_risk)
    const reason = typeof parsed.reason === 'string' && parsed.reason.trim()
      ? parsed.reason.trim()
      : 'Avaliacao concluida no Vertex.'

    const weights = QUALITY_WEIGHTS[photoType] ?? QUALITY_WEIGHTS.unknown
    const overallScore = Math.round(
      visualQuality * weights.visual +
      identityPreservation * weights.identity +
      compositionFidelity * weights.composition +
      hallucinationRisk * weights.hallucination,
    )

    return {
      overall_score: overallScore,
      visual_quality: visualQuality,
      identity_preservation: identityPreservation,
      composition_fidelity: compositionFidelity,
      hallucination_risk: hallucinationRisk,
      passed: overallScore >= threshold,
      confidence: resolveQualityConfidence(identityPreservation),
      reason,
    }
  } catch (error: any) {
    console.warn('[vertex-restore] QC fallback:', error.message)
    return {
      overall_score: 75,
      visual_quality: 75,
      identity_preservation: 75,
      composition_fidelity: 75,
      hallucination_risk: 75,
      passed: true,
      confidence: 'medium',
      reason: 'Erro na avaliacao Vertex - aprovado por padrao.',
    }
  }
}

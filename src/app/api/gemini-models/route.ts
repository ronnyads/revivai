import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAIError, fetchGoogleModelCatalog, getGoogleGenAIPolicy } from '@/lib/googleGenai'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const policy = getGoogleGenAIPolicy()

  let r1: Response
  let r2: Response

  try {
    ;[r1, r2] = await Promise.all([
      fetchGoogleModelCatalog({ apiVersion: 'v1beta', feature: 'debug-gemini-model-catalog' }),
      fetchGoogleModelCatalog({ apiVersion: 'v1alpha', feature: 'debug-gemini-model-catalog' }),
    ])
  } catch (error) {
    const status = error instanceof GoogleGenAIError ? (error.status ?? 503) : 500
    const code = error instanceof GoogleGenAIError ? error.code : 'unknown_google_genai_error'
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message, code, policy }, { status })
  }

  const [d1, d2] = await Promise.all([r1.json(), r2.json()])

  const fmt = (data: any, version: string) =>
    (data.models ?? []).map((m: any) => ({
      version,
      name: m.name,
      displayName: m.displayName,
      methods: m.supportedGenerationMethods ?? [],
    }))

  const v1beta = fmt(d1, 'v1beta')
  const v1alpha = fmt(d2, 'v1alpha')

  const imageModels = [...v1beta, ...v1alpha].filter(m =>
    m.name.includes('image') ||
    m.name.includes('imagen') ||
    m.name.includes('flash-exp') ||
    m.name.includes('flash-preview') ||
    m.methods.includes('generateImage') ||
    m.methods.includes('predict')
  )

  return NextResponse.json({
    policy,
    image_capable: imageModels,
    v1beta_error: d1.error ?? null,
    v1alpha_error: d2.error ?? null,
    v1beta_total: v1beta.length,
    v1alpha_total: v1alpha.length,
  })
}

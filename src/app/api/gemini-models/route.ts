import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GOOGLE_API_KEY não configurada' }, { status: 500 })

  const [r1, r2] = await Promise.all([
    fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=200`),
    fetch(`https://generativelanguage.googleapis.com/v1alpha/models?key=${apiKey}&pageSize=200`),
  ])

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

  // Modelos que suportam geração de imagem (pelo nome ou método)
  const imageModels = [...v1beta, ...v1alpha].filter(m =>
    m.name.includes('image') ||
    m.name.includes('imagen') ||
    m.name.includes('flash-exp') ||
    m.name.includes('flash-preview') ||
    m.methods.includes('generateImage') ||
    m.methods.includes('predict')
  )

  return NextResponse.json({
    image_capable: imageModels,
    v1beta_error: d1.error ?? null,
    v1alpha_error: d2.error ?? null,
    v1beta_total: v1beta.length,
    v1alpha_total: v1alpha.length,
  })
}

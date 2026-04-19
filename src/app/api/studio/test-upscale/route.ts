export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/studio/test-upscale
   Testa 3 motores de upscale em paralelo e retorna os resultados
   Body: { image_url: string }
───────────────────────────────────────────────────────────────────────── */

async function fetchBase64(url: string): Promise<string> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Falha ao baixar imagem: ${r.status}`)
  return Buffer.from(await r.arrayBuffer()).toString('base64')
}

async function testGeminiEnhance(model: string, base64: string, apiKey: string): Promise<string> {
  const prompt = `You are an ultra-high quality photo enhancer. Take this image and output an enhanced version with maximum photorealistic detail — sharp skin texture, crisp fabric details, clear product labels, natural lighting. Preserve EVERYTHING exactly: same person, same product, same composition, same colors. Output at maximum quality.`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: base64 } },
          ],
        }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as any,
      }),
    }
  )
  if (!res.ok) throw new Error(`${model} falhou: ${await res.text()}`)
  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))
  if (!imgPart?.inlineData?.data) {
    const reason = data.candidates?.[0]?.finishReason
    throw new Error(`${model} sem imagem | finishReason=${reason}`)
  }
  return `data:image/png;base64,${imgPart.inlineData.data}`
}

async function testClarityUpscaler(imageUrl: string, falKey: string): Promise<string> {
  const res = await fetch('https://fal.run/fal-ai/clarity-upscaler', {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      upscale_factor: 2,
      creativity: 0.1,
      resemblance: 1.0,
    }),
  })
  if (!res.ok) throw new Error(`clarity-upscaler falhou: ${await res.text()}`)
  const data = await res.json()
  const url = data.image?.url ?? data.images?.[0]?.url
  if (!url) throw new Error('clarity-upscaler sem URL')
  return url
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { image_url } = await req.json()
  if (!image_url) return NextResponse.json({ error: 'image_url obrigatório' }, { status: 400 })

  const googleKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY
  const falKey = process.env.FAL_KEY

  const results: Record<string, { url?: string; error?: string; ms?: number }> = {}

  // Baixa base64 uma vez para os testes Gemini
  let base64: string | null = null
  try { base64 = await fetchBase64(image_url) } catch (e: any) {
    return NextResponse.json({ error: `Falha ao baixar imagem: ${e.message}` }, { status: 400 })
  }

  // Roda os 3 em paralelo
  await Promise.allSettled([
    // 1. gemini-3-pro-image-preview
    (async () => {
      if (!googleKey) { results['gemini-3-pro'] = { error: 'GOOGLE_API_KEY não configurada' }; return }
      const t = Date.now()
      try {
        const url = await testGeminiEnhance('gemini-3-pro-image-preview', base64!, googleKey)
        results['gemini-3-pro'] = { url, ms: Date.now() - t }
      } catch (e: any) {
        results['gemini-3-pro'] = { error: e.message, ms: Date.now() - t }
      }
    })(),

    // 2. gemini-3.1-flash-image-preview
    (async () => {
      if (!googleKey) { results['gemini-3.1-flash'] = { error: 'GOOGLE_API_KEY não configurada' }; return }
      const t = Date.now()
      try {
        const url = await testGeminiEnhance('gemini-3.1-flash-image-preview', base64!, googleKey)
        results['gemini-3.1-flash'] = { url, ms: Date.now() - t }
      } catch (e: any) {
        results['gemini-3.1-flash'] = { error: e.message, ms: Date.now() - t }
      }
    })(),

    // 3. fal-ai/clarity-upscaler
    (async () => {
      if (!falKey) { results['clarity-upscaler'] = { error: 'FAL_KEY não configurada' }; return }
      const t = Date.now()
      try {
        const url = await testClarityUpscaler(image_url, falKey)
        results['clarity-upscaler'] = { url, ms: Date.now() - t }
      } catch (e: any) {
        results['clarity-upscaler'] = { error: e.message, ms: Date.now() - t }
      }
    })(),
  ])

  return NextResponse.json({ results })
}

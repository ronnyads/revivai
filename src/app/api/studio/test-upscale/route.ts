export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/studio/test-upscale?url=<image_url>
   Testa 3 motores de upscale em paralelo e exibe resultado em HTML
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
        contents: [{ role: 'user', parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: base64 } },
        ]}],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as any,
      }),
    }
  )
  if (!res.ok) throw new Error(`${model}: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))
  if (!imgPart?.inlineData?.data) {
    const reason = data.candidates?.[0]?.finishReason
    throw new Error(`Sem imagem | finishReason=${reason}`)
  }
  return `data:image/png;base64,${imgPart.inlineData.data}`
}

async function testClarityUpscaler(imageUrl: string, falKey: string): Promise<string> {
  const res = await fetch('https://fal.run/fal-ai/clarity-upscaler', {
    method: 'POST',
    headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, upscale_factor: 2, creativity: 0.1, resemblance: 1.0 }),
  })
  if (!res.ok) throw new Error(`clarity-upscaler: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const url = data.image?.url ?? data.images?.[0]?.url
  if (!url) throw new Error('Sem URL na resposta')
  return url
}

function html(imageUrl: string, results: Record<string, { url?: string; error?: string; ms?: number }>) {
  const card = (label: string, key: string) => {
    const r = results[key]
    const img = r?.url ? `<img src="${r.url}" style="width:100%;border-radius:8px;display:block">` : `<div style="padding:40px;background:#1a1a1a;color:#f87171;border-radius:8px;font-size:13px;word-break:break-all">${r?.error ?? 'Erro desconhecido'}</div>`
    const badge = r?.ms ? `<span style="font-size:11px;color:#a1a1aa">${r.ms}ms</span>` : ''
    return `<div style="flex:1;min-width:280px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b style="color:#fff;font-size:14px">${label}</b>${badge}</div>${img}</div>`
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Teste Upscale</title></head>
<body style="background:#0a0a0a;font-family:sans-serif;padding:24px;margin:0">
<h2 style="color:#fff;margin-bottom:4px">Comparativo de Motores de Upscale</h2>
<p style="color:#71717a;font-size:13px;margin-bottom:20px">Original: <a href="${imageUrl}" target="_blank" style="color:#3b82f6">${imageUrl.slice(0,80)}...</a></p>
<div style="margin-bottom:20px"><img src="${imageUrl}" style="max-height:200px;border-radius:8px"><p style="color:#a1a1aa;font-size:12px;margin-top:6px">Original</p></div>
<div style="display:flex;gap:20px;flex-wrap:wrap">
  ${card('Gemini 3 Pro Image', 'gemini-3-pro')}
  ${card('Gemini 3.1 Flash Image', 'gemini-3.1-flash')}
  ${card('Fal AI Clarity Upscaler', 'clarity-upscaler')}
</div>
</body></html>`
}

export async function GET(req: NextRequest) {
  const imageUrl = req.nextUrl.searchParams.get('url')
  if (!imageUrl) return new NextResponse('Parâmetro ?url= obrigatório', { status: 400 })

  const googleKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY
  const falKey = process.env.FAL_KEY

  const results: Record<string, { url?: string; error?: string; ms?: number }> = {}

  let base64: string | null = null
  try { base64 = await fetchBase64(imageUrl) } catch (e: any) {
    return new NextResponse(`Falha ao baixar imagem: ${e.message}`, { status: 400 })
  }

  await Promise.allSettled([
    (async () => {
      if (!googleKey) { results['gemini-3-pro'] = { error: 'GOOGLE_API_KEY não configurada' }; return }
      const t = Date.now()
      try { results['gemini-3-pro'] = { url: await testGeminiEnhance('gemini-3-pro-image-preview', base64!, googleKey), ms: Date.now() - t } }
      catch (e: any) { results['gemini-3-pro'] = { error: e.message, ms: Date.now() - t } }
    })(),
    (async () => {
      if (!googleKey) { results['gemini-3.1-flash'] = { error: 'GOOGLE_API_KEY não configurada' }; return }
      const t = Date.now()
      try { results['gemini-3.1-flash'] = { url: await testGeminiEnhance('gemini-3.1-flash-image-preview', base64!, googleKey), ms: Date.now() - t } }
      catch (e: any) { results['gemini-3.1-flash'] = { error: e.message, ms: Date.now() - t } }
    })(),
    (async () => {
      if (!falKey) { results['clarity-upscaler'] = { error: 'FAL_KEY não configurada' }; return }
      const t = Date.now()
      try { results['clarity-upscaler'] = { url: await testClarityUpscaler(imageUrl, falKey), ms: Date.now() - t } }
      catch (e: any) { results['clarity-upscaler'] = { error: e.message, ms: Date.now() - t } }
    })(),
  ])

  return new NextResponse(html(imageUrl, results), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

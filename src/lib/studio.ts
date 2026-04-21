// FORCE_REBUILD_ID: 2716873455033918919
import { VertexAI } from '@google-cloud/vertexai'
import { GoogleAuth } from 'google-auth-library'
import { createAdminClient } from '@/lib/supabase/admin'
import { AssetType } from '@/types'
import { extractLastFrame as extractVideoFrame } from './videoUtils'
import { assessCompositionQuality, ProductProfile } from '@/lib/openai'

export { CREDIT_COST } from '@/constants/studio'

// ── Prompt helper — lê da tabela studio_prompts, usa fallback hardcoded ─────
async function getStudioPrompt(
  admin: ReturnType<typeof createAdminClient>,
  key: string,
  fallback: string,
): Promise<string> {
  try {
    const { data } = await admin
      .from('studio_prompts')
      .select('value')
      .eq('key', key)
      .single()
    return data?.value?.trim() || fallback
  } catch {
    return fallback
  }
}

// ── Image — DALL-E 3 via fetch ─────────────────────────────────────────────
export async function generateImage(params: {
  prompt: string
  style: string
  aspect_ratio: string
  model_prompt?: string
  source_face_url?: string
  assetId: string
  userId: string
}) {
  const admin = createAdminClient()
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada')

  const sizeMap: Record<string, string> = {
    '1:1':  '1024x1024',
    '16:9': '1792x1024',
    '9:16': '1024x1792',
  }
  const size = sizeMap[params.aspect_ratio] ?? '1024x1024'

  const STYLE_FALLBACKS: Record<string, string> = {
    realista:   'UGC style ad photo, shot on film, shot on Hasselblad H6D, Zeiss Otus 85mm f/1.4 lens, Kodak Portra 400, film grain, cinematic lighting, hyper-realistic, 8k, highly detailed, ',
    ugc:        'UGC style ad photo, shot on film, shot on Hasselblad H6D, Zeiss Otus 85mm f/1.4 lens, authentic, candid, real person, photorealistic, film grain, natural depth of field, 8k, ',
    clonado:    'UGC style ad photo, shot on film, shot on Hasselblad H6D, Zeiss Otus 85mm f/1.4 lens, authentic, real person face, photorealistic, 8k, ',
    produto:    'professional product photography, shot on film, shot on Phase One IQ4 150MP, Zeiss Milvus 100mm f/2M lens, clean background, studio lighting, hyper-realistic, 8k resolution, ',
    logo:       'professional logo design, clean vector style, transparent background, minimalist, ',
    mascote:    '3D animated mascot, anthropomorphic character, cinematic lighting, highly detailed 3D render, Pixar style, ',
    cartoon:    'Cartoon Network style, 2D flat animation, vibrant colors, bold outlines, stylized character design, solid color background, ',
    aleatoria:  'lifestyle photography, natural light, aspirational, photorealism, cinematic lighting, ',
  }
  const styleKey = `image_style_${params.style}`
  const stylePrefix = await getStudioPrompt(admin, styleKey, STYLE_FALLBACKS[params.style] ?? STYLE_FALLBACKS.lifestyle)

  // O prompt principal
  const basePrompt = params.model_prompt
    ? `${params.model_prompt}. ${stylePrefix}${params.prompt}`
    : stylePrefix + params.prompt

  // Sulfixo varia se for mascote/cartoon (não usar 'real person' em desenhos)
  const isMascotOrCartoon = ['mascote', 'personagem_cartoon'].includes(params.style)
  
  // Suffixos de realismo via Admin
  const realismKey = isMascotOrCartoon ? `image_realism_${params.style}` : 'image_realism_realista'
  const realismFallback = params.style === 'mascote'
    ? "hyper-detailed 3D render, perfectly consistent character, 8k resolution, cinematic lighting, vibrant colors."
    : params.style === 'personagem_cartoon'
      ? "2D flat cartoon illustration, no 3d elements, vector art, smooth lines, clean colors, cartoon aesthetics."
      : "RAW photo, shot on film, shot on Hasselblad H6D, Zeiss Otus 85mm f/1.4 lens, Kodak Portra 400, hyper-realistic, 8k resolution, highly detailed, photorealism, cinematic lighting, film grain, natural depth of field, not illustrated, not cartoon, real photography."
      
  const realismSuffix = await getStudioPrompt(admin, realismKey, realismFallback)
  const finalPrompt = `${basePrompt}. ${realismSuffix}`

  let tempUrl = ''

  if (params.source_face_url && !isMascotOrCartoon) {
    // PuLID - Exclusivo para Humanos
    const falKey = process.env.FAL_KEY
    if (!falKey) throw new Error('FAL_KEY não configurada no servidor')

    const sizeMap: Record<string, string> = {
      '1:1':  'square_hd',
      '16:9': 'landscape_16_9',
      '9:16': 'portrait_16_9',
    }
    const image_size = sizeMap[params.aspect_ratio] ?? 'square_hd'

    const res = await fetch('https://fal.run/fal-ai/flux-pulid', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        reference_images: [{ image_url: params.source_face_url }],
        image_size: image_size,
        num_images: 1,
        enable_safety_checker: true,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Fal AI erro (PuLID): ${err}`)
    }

    const data = await res.json()
    tempUrl = data.images?.[0]?.url
    if (!tempUrl) throw new Error('Fal AI não retornou URL')
    
  } else {
    // Fallback ou Mascote — Flux Pro 1.1 Ultra
    const falKey = process.env.FAL_KEY
    if (!falKey) throw new Error('FAL_KEY não configurada no servidor')

    const payload: any = {
      prompt: finalPrompt,
      aspect_ratio: params.aspect_ratio || '9:16',
      output_format: 'jpeg',
      safety_tolerance: '3',
    }

    // Se for mascote conectado a uma imagem de rosto
    if (isMascotOrCartoon && params.source_face_url) {
      const payload: any = {
        prompt: finalPrompt,
        image_url: params.source_face_url,
        strength: 0.85,  // Mantém a estrutura principal do mascote recriando o contexto
        num_inference_steps: 40,
        guidance_scale: 3.5,
      }

      const res = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${falKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Flux Image-to-Image erro: ${err}`)
      }

      const data = await res.json()
      tempUrl = data.images?.[0]?.url
      if (!tempUrl) throw new Error('Flux Image-to-Image não retornou URL')
    } else {
      // Geração Pura (Ultra)
      const payload: any = {
        prompt: finalPrompt,
        aspect_ratio: params.aspect_ratio || '9:16',
        output_format: 'jpeg',
        safety_tolerance: '3',
      }

      const res = await fetch('https://fal.run/fal-ai/flux-pro/v1.1-ultra', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${falKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`Flux Ultra erro: ${err}`)
      }

      const data = await res.json()
      tempUrl = data.images?.[0]?.url
      if (!tempUrl) throw new Error('Flux Ultra não retornou URL')
    }
  }

  // Re-upload para bucket studio (URLs OpenAI/Fal expiram)
  const imgRes = await fetch(tempUrl)
  const buffer = Buffer.from(await imgRes.arrayBuffer())
  const path = `${params.userId}/${params.assetId}.jpg`

  const { error: uploadErr } = await admin.storage
    .from('studio')
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })
  if (uploadErr) throw new Error(`Upload falhou: ${uploadErr.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return publicUrl
}

// ── Script — GPT-4o UGC viral em PT via fetch ──────────────────────────────
export async function generateScript(params: {
  product: string
  audience: string
  format: string
  hook_style: string
  assetId: string
  userId: string
}) {
  const admin = createAdminClient()
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada')

  const formatGuideStr = await getStudioPrompt(admin, 'script_format_guide', JSON.stringify({
    reels: 'Reels/TikTok (15-30 segundos, hook nos primeiros 3s)',
    story: 'Stories (até 15 segundos por slide, 3 slides)',
    feed:  'Feed/anúncio (30-60 segundos, mais elaborado)',
  }))
  const hookGuideStr = await getStudioPrompt(admin, 'script_hook_guide', JSON.stringify({
    problema: 'começe identificando um problema real do público',
    resultado: 'começe mostrando o resultado incrível primeiro',
    pergunta:  'começe com uma pergunta provocadora',
    historia:  'começe com uma mini história pessoal',
  }))

  let formatGuide: any = {}
  let hookGuide: any = {}
  try { formatGuide = JSON.parse(formatGuideStr) } catch { /* ignore */ }
  try { hookGuide = JSON.parse(hookGuideStr) } catch { /* ignore */ }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.8,
      messages: [
        {
          role: 'system',
          content: (await getStudioPrompt(
            admin,
            'script_generation_system',
            `Você é um especialista em criação de scripts UGC virais para o mercado brasileiro.
Crie scripts autênticos, conversacionais e de alta conversão. Use linguagem natural e cotidiana do brasileiro.
Inclua indicações de tom, pausas e emoção entre colchetes.`,
          )) + ` Formato: ${formatGuide[params.format] ?? formatGuide.reels}.`,
        },
        {
          role: 'user',
          content: `Produto/Serviço: ${params.product}
Público-alvo: ${params.audience}
Estilo de hook: ${hookGuide[params.hook_style] ?? hookGuide.problema}

Crie um script UGC completo com:
1. HOOK (primeiros 3 segundos)
2. DESENVOLVIMENTO (problema + solução)
3. PROVA SOCIAL (resultado/depoimento)
4. CTA (call-to-action forte)

Inclua também 3 variações de hook alternativas no final.`,
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`GPT-4o erro: ${err.error?.message ?? res.status}`)
  }

  const data = await res.json()
  const script = data.choices?.[0]?.message?.content ?? ''

  // Salva como .txt no bucket
  const path = `${params.userId}/${params.assetId}.txt`
  const { error } = await admin.storage
    .from('studio')
    .upload(path, Buffer.from(script, 'utf-8'), { contentType: 'text/plain', upsert: true })
  if (error) throw new Error(`Upload script falhou: ${error.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return { url: publicUrl, text: script }
}

// ── Voice — ElevenLabs ─────────────────────────────────────────────────────
export const ELEVENLABS_VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (masculino)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (feminino)' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (feminino)' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli (feminino)' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh (masculino)' },
]

export async function generateVoice(params: {
  script: string
  voice_id: string
  speed: number
  assetId: string
  userId: string
}) {
  const admin = createAdminClient()
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY não configurada')

  const configStr = await getStudioPrompt(admin, 'audio_elevenlabs_config', '{}')
  let config: any = {}
  try { config = JSON.parse(configStr) } catch { /* ignore */ }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${params.voice_id}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: params.script,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: config.stability ?? 0.5,
        similarity_boost: config.similarity ?? 0.75,
        style: config.style ?? 0.0,
        use_speaker_boost: config.use_speaker_boost ?? true,
        speed: params.speed ?? 1.0,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs erro ${res.status}: ${err}`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  const path = `${params.userId}/${params.assetId}.mp3`

  const { error } = await admin.storage
    .from('studio')
    .upload(path, buffer, { contentType: 'audio/mpeg', upsert: true })
  if (error) throw new Error(`Upload áudio falhou: ${error.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return publicUrl
}

// ── Caption — Whisper via fetch ────────────────────────────────────────────
export async function generateCaption(params: {
  audio_url: string
  assetId: string
  userId: string
}) {
  const admin = createAdminClient()
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada')

  const audioRes = await fetch(params.audio_url)
  if (!audioRes.ok) throw new Error('Não foi possível baixar o áudio')
  const buffer = Buffer.from(await audioRes.arrayBuffer())

  const configStr = await getStudioPrompt(admin, 'subtitle_whisper_config', '{}')
  let config: any = {}
  try { config = JSON.parse(configStr) } catch { /* ignore */ }

  const ext = params.audio_url.split('.').pop()?.toLowerCase() ?? 'mp3'
  const formData = new FormData()
  formData.append('file', new Blob([buffer], { type: `audio/${ext}` }), `audio.${ext}`)
  formData.append('model', config.model || 'whisper-1')
  formData.append('language', config.language || 'pt')
  formData.append('response_format', 'srt')
  if (config.prompt) formData.append('prompt', config.prompt)

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Whisper erro ${res.status}: ${err}`)
  }

  const srt = await res.text()
  const path = `${params.userId}/${params.assetId}.srt`

  const { error } = await admin.storage
    .from('studio')
    .upload(path, Buffer.from(srt, 'utf-8'), { contentType: 'text/plain', upsert: true })
  if (error) throw new Error(`Upload legenda falhou: ${error.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return { url: publicUrl, srt }
}

// ── Upscale — Gemini 3 Pro → Gemini 3.1 Flash → Clarity fallback ─────────
export async function generateUpscale(params: {
  source_url: string
  scale: number
  quality?: '4k' | '8k'
  assetId?: string
  userId?: string
}) {
  const googleKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY
  const falKey = process.env.FAL_KEY
  const admin = createAdminClient()
  const is8k = params.quality === '8k'

  async function fetchBase64(url: string): Promise<string> {
    const r = await fetch(url)
    if (!r.ok) throw new Error(`Falha ao baixar imagem: ${r.status}`)
    return Buffer.from(await r.arrayBuffer()).toString('base64')
  }

  async function uploadBase64ToStorage(base64: string, suffix = 'upscale'): Promise<string> {
    if (!params.assetId || !params.userId) return `data:image/png;base64,${base64}`
    const buffer = Buffer.from(base64, 'base64')
    const path = `${params.userId}/${params.assetId}-${suffix}.png`
    const { error } = await admin.storage.from('studio').upload(path, buffer, { contentType: 'image/png', upsert: true })
    if (error) return `data:image/png;base64,${base64}`
    const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
    return publicUrl
  }

  async function geminiEnhance(model: string, base64: string): Promise<string> {
    if (!googleKey) throw new Error('GOOGLE_API_KEY não configurada')
    const prompt = `You are an ultra-high quality photo enhancer. Output an enhanced version with maximum photorealistic detail — sharp skin texture, crisp fabric details, clear product labels, natural lighting. Preserve EVERYTHING exactly: same person, same product, same composition, same colors. Output at maximum quality.`
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleKey}`,
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
    if (!res.ok) throw new Error(`${model}: ${res.status}`)
    const data = await res.json()
    const parts = data.candidates?.[0]?.content?.parts ?? []
    const imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))
    if (!imgPart?.inlineData?.data) throw new Error(`${model} sem imagem | reason=${data.candidates?.[0]?.finishReason}`)
    return imgPart.inlineData.data as string
  }

  async function clarityUpscale(imageUrl: string): Promise<string> {
    if (!falKey) throw new Error('FAL_KEY não configurada')
    const res = await fetch('https://fal.run/fal-ai/clarity-upscaler', {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, upscale_factor: 2, creativity: 0.1, resemblance: 1.0 }),
    })
    if (!res.ok) throw new Error(`clarity-upscaler: ${res.status}`)
    const data = await res.json()
    const url = data.image?.url ?? data.images?.[0]?.url
    if (!url) throw new Error('clarity-upscaler sem URL')
    return url
  }

  // ── Passo 1: Gemini enhance
  let sourceBase64: string | null = null
  try { sourceBase64 = await fetchBase64(params.source_url) } catch { /* segue pra fallback */ }

  let geminiResultBase64: string | null = null
  if (googleKey && sourceBase64) {
    for (const model of ['gemini-3-pro-image-preview', 'gemini-3.1-flash-image-preview']) {
      try {
        console.log(`[upscale] Gemini enhance model=${model} quality=${params.quality ?? '4k'}`)
        geminiResultBase64 = await geminiEnhance(model, sourceBase64)
        console.log(`[upscale] Gemini sucesso: ${model}`)
        break
      } catch (e: any) {
        console.warn(`[upscale] ${model} falhou: ${e.message}`)
      }
    }
  }

  // ── Passo 2 (só 8K): Clarity Upscaler em cima do resultado Gemini
  if (is8k && geminiResultBase64) {
    try {
      const intermediateUrl = await uploadBase64ToStorage(geminiResultBase64, 'upscale-intermediate')
      console.log(`[upscale] 8K: rodando Clarity Upscaler no resultado Gemini`)
      const finalUrl = await clarityUpscale(intermediateUrl)
      return finalUrl
    } catch (e: any) {
      console.warn(`[upscale] 8K Clarity falhou, entregando só Gemini: ${e.message}`)
      return await uploadBase64ToStorage(geminiResultBase64)
    }
  }

  // ── 4K: entrega direto resultado Gemini
  if (geminiResultBase64) return await uploadBase64ToStorage(geminiResultBase64)

  // ── Fallback externo: Clarity Upscaler
  console.log('[upscale] Fallback para Clarity Upscaler (Fal AI)')
  try { return await clarityUpscale(params.source_url) } catch (e: any) {
    throw new Error(`Todos os motores falharam. Último: ${e.message}`)
  }
}

// ── Model — GPT-4o gera descrição visual única para UGC ───────────────────
export async function generateModel(params: {
  gender: string
  age_range: string
  skin_tone: string
  body_type: string
  style: string
  extra_details?: string
  engine?: 'google' | 'flux'
  assetId: string
  userId: string
}) {
  const admin = createAdminClient()
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada')

  const seed = Math.random().toString(36).slice(2, 8)

  const GENDER_MAP:    Record<string, string> = { feminino: 'woman', masculino: 'man' }
  const AGE_MAP:       Record<string, string> = { '20-30': 'in her/his mid-twenties', '30-40': 'in her/his mid-thirties', '40-55': 'in her/his mid-forties', '55+': 'in her/his late fifties' }
  const SKIN_MAP:      Record<string, string> = { muito_clara: 'very fair porcelain skin', clara: 'light peachy skin', media: 'medium warm skin', oliva: 'olive-toned skin', morena: 'rich brown skin', negra: 'deep ebony skin' }
  const BODY_MAP:      Record<string, string> = { magro: 'slim slender build', atletico: 'athletic toned build', normal: 'average proportional build', robusto: 'stocky sturdy build', plus_size: 'plus-size full-figured build' }
  const STYLE_MAP:     Record<string, string> = { casual: 'casual everyday streetwear', profissional: 'smart professional business attire', esportivo: 'sporty activewear', elegante: 'elegant formal wear', alternativo: 'alternative edgy fashion' }

  const g = GENDER_MAP[params.gender]   ?? params.gender
  const a = AGE_MAP[params.age_range]   ?? params.age_range
  const s = SKIN_MAP[params.skin_tone]  ?? params.skin_tone
  const b = BODY_MAP[params.body_type]  ?? params.body_type
  const e = STYLE_MAP[params.style]     ?? params.style

  const systemBase = await getStudioPrompt(
    admin,
    'model_generation_system',
    `You are a UGC creative director specializing in AI image generation for ads.
Generate a UNIQUE, vivid, photorealistic visual description of a model for FLUX PRO Ultra API.
Vary vocabulary, hair details, facial features, and scene context every response — never repeat.
Output: one dense English paragraph (3-5 sentences). No names. Pure visual description.`
  )
  const system = `${systemBase}\nSeed for uniqueness: ${seed}.`

  const user = `Create a unique visual model description for: a ${g}, ${a}, ${s}, with a ${b}, wearing ${e}.${params.extra_details ? ' Additional details: ' + params.extra_details : ''} Include specific facial features, hair style, and overall energy suitable for a UGC ad.`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 1.0,
      max_tokens: 280,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`GPT-4o erro: ${err.error?.message ?? res.status}`)
  }

  const data = await res.json()
  const text: string = data.choices?.[0]?.message?.content?.trim() ?? ''

  const fluxSuffix = await getStudioPrompt(
    admin,
    'model_flux_suffix',
    'Skin pores and natural imperfections visible. Real human face, authentic natural lighting, not retouched, not illustrated, not CGI.',
  )
  const negativePrompt = 'outdoor, street, city, building, trees, nature, bokeh background, blurred background, environment, park, cafe, wall, colorful background, any background scene, gradient background, dark background, grey background, textured background, window, curtain, interior room'
  const finalPrompt = `COMMERCIAL PHOTOGRAPHY STUDIO. Seamless pure white paper backdrop, studio strobe lighting, clean white background. ${text} ${fluxSuffix} Shot on film. Shot on Hasselblad H6D, Zeiss Otus 85mm f/1.4 lens, Kodak Portra 400, film grain, natural depth of field, hyper-realistic, 8k. MANDATORY: solid white background only, no environment, no outdoor scene, no bokeh, plain white seamless backdrop, professional studio portrait.`

  let photoBuffer: Buffer | null = null

  if (params.engine === 'google' || !params.engine) {
    try {
      const vertexKey = process.env.GOOGLE_VERTEX_KEY
      const projectId = process.env.VERTEX_PROJECT_ID || 'project-9e7b4eec-0111-46d8-ae0'
      const location = process.env.VERTEX_LOCATION || 'us-central1'

      if (vertexKey) {
        console.log(`[studio] Usando Vertex AI Enterprise (UGC Model) para asset ${params.assetId}...`)
        const vertexToken = await getVertexAccessToken(vertexKey)
        const vertexUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-generate-001:predict`

        const vertexRes = await fetch(vertexUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vertexToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instances: [{ prompt: finalPrompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: '9:16',
              personGeneration: 'allow_adult',
              negativePrompt,
            }
          })
        })

        if (vertexRes.ok) {
          const vertexData = await vertexRes.json()
          const base64 = vertexData.predictions?.[0]?.bytesBase64Encoded
          if (base64) {
            photoBuffer = Buffer.from(base64, 'base64')
          } else {
            throw new Error('Sem imagem no Vertex')
          }
        } else {
          throw new Error(await vertexRes.text())
        }
      } else {
        throw new Error('Sem Vertex Key')
      }
    } catch (vertexError: any) {
      console.warn('[studio] Vertex AI (Model) falhou ou não configurado, tentando Gemini API...', vertexError.message)
      
      // ---- FALLBACK: MOTOR GOOGLE IMAGEN 4.0 (Gemini API) ----
      const googleApiKey = (process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY)
      if (!googleApiKey) throw new Error('GOOGLE_API_KEY não configurada no servidor')

      const imgRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${googleApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: finalPrompt }],
          parameters: {
            sample_count: 1,
            aspect_ratio: '9:16',
            negativePrompt,
          }
        })
      })

      if (!imgRes.ok) {
        const err = await imgRes.text()
        throw new Error(`Google Imagen 4.0 erro (${imgRes.status}): ${err}`)
      }

      const data = await imgRes.json()
      const base64 = data.predictions?.[0]?.bytesBase64Encoded
      if (!base64) throw new Error('Google Imagen 4.0 não retornou imagem. Verifique logs.')

      photoBuffer = Buffer.from(base64, 'base64')
    }

  } else {
    // ---- MOTOR FLUX PRO 1.1 ULTRA (Opcional/Alternativo) ----
    const falKey = process.env.FAL_KEY
    if (!falKey) throw new Error('FAL_KEY não configurada no servidor')

    const res = await fetch('https://fal.run/fal-ai/flux-pro/v1.1-ultra', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        negative_prompt: negativePrompt,
        aspect_ratio: '9:16',
        output_format: 'jpeg',
        safety_tolerance: '3',
        seed: Math.floor(Math.random() * 9999999),
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Flux Ultra (Model) erro: ${err}`)
    }

    const data = await res.json()
    const tempUrl = data.images?.[0]?.url
    if (!tempUrl) throw new Error('Flux Ultra não retornou URL')

    const imgRes = await fetch(tempUrl)
    photoBuffer = Buffer.from(await imgRes.arrayBuffer())
  }

  if (!photoBuffer) throw new Error('Falha ao gerar o buffer da foto do modelo.')

  const path = `${params.userId}/${params.assetId}-model-${Date.now()}.jpg`
  const { error } = await admin.storage
    .from('studio')
    .upload(path, photoBuffer, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(`Upload foto modelo falhou: ${error.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return { url: publicUrl, text }
}

// ── Video — Kling AI via Fal AI (async — usa webhook) ──────────────────
export async function startVideoGeneration(params: {
  source_image_url: string
  motion_prompt: string
  duration: number
  model_prompt?: string
  engine?: string
  assetId: string
  appUrl: string
  userId: string
}) {
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY não configurada no servidor')

  const webhookUrl = `${params.appUrl}/api/studio/webhook?assetId=${params.assetId}&userId=${params.userId}`

  const admin = createAdminClient()
  const configStr = await getStudioPrompt(admin, 'video_kling_config', '{}')
  let config: any = {}
  try { config = JSON.parse(configStr) } catch { /* ignore */ }

  // Injeta contexto do modelo UGC no prompt de movimento
  const modelContext = params.model_prompt
    ? `Person: ${params.model_prompt.slice(0, 200)}. `
    : ''
  const finalMotion = modelContext + (params.motion_prompt || 'smooth product showcase motion')

  const FAL_KLING_PATH = 'fal-ai/kling-video/v1.5/pro/image-to-video'
  const FAL_VEO_PATH   = 'fal-ai/veo3.1/image-to-video'

  let falModelPath = FAL_KLING_PATH
  let endpoint = `https://queue.fal.run/${FAL_KLING_PATH}`
  const rawDuration = Number(params.duration ?? config.duration ?? 5)
  const requestedDuration = rawDuration >= 10 ? '10' : '5'

  let payload: any = {
    image_url: params.source_image_url,
    ...config,
    prompt: finalMotion,
    duration: requestedDuration,
    aspect_ratio: '9:16',
    webhook_url: webhookUrl,
  }

  if (params.engine === 'veo') {
    falModelPath = FAL_VEO_PATH
    endpoint = `https://queue.fal.run/${FAL_VEO_PATH}`
    payload = {
      image_url: params.source_image_url,
      prompt: finalMotion,
      duration: config.veo_duration || `${requestedDuration}s`,
      aspect_ratio: '9:16',
      webhook_url: webhookUrl,
      ...config
    }
  }

  const queueRes = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!queueRes.ok) {
    const err = await queueRes.text()
    throw new Error(`Fal AI erro ao enfileirar vídeo Kling: ${err}`)
  }

  const { request_id } = await queueRes.json()
  if (!request_id) throw new Error('Fal AI não retornou request_id para video')

  await admin.from('studio_assets')
    .update({ input_params: { prediction_id: request_id, provider: 'fal', engine: params.engine ?? 'kling', fal_model_path: falModelPath, source_image_url: params.source_image_url, motion_prompt: params.motion_prompt, duration: requestedDuration } })
    .eq('id', params.assetId)
}

// ── Render — merge áudio + vídeo via Replicate ────────────────────────────
export async function mergeVideoAudio(params: {
  video_url: string
  audio_url: string
  assetId: string
  userId: string
}) {
  const admin   = createAdminClient()
  const os      = await import('os')
  const path    = await import('path')
  const fs      = await import('fs')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegPath = require('ffmpeg-static') as string
  const { default: ffmpeg } = await import('fluent-ffmpeg')
  ffmpeg.setFfmpegPath(ffmpegPath)

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-merge-'))
  const videoPath = path.join(tmpDir, 'video.mp4')
  const audioPath = path.join(tmpDir, 'audio.mp3')
  const outputPath = path.join(tmpDir, 'merged.mp4')

  try {
    // Baixa o video e o audio originais
    const [vidRes, audRes] = await Promise.all([
      fetch(params.video_url),
      fetch(params.audio_url),
    ])
    if (!vidRes.ok || !audRes.ok) throw new Error('Falha ao baixar media originais')

    fs.writeFileSync(videoPath, Buffer.from(await vidRes.arrayBuffer()))
    fs.writeFileSync(audioPath, Buffer.from(await audRes.arrayBuffer()))

    // Executa merge super rapido (stream copy para video)
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .outputOptions([
          '-c:v', 'copy',       // copia stream original sem reencodar video
          '-c:a', 'aac',        // encoder compatível pra audio
          '-map', '0:v:0',      // pega o primeiro track de video
          '-map', '1:a:0',      // pega o primeiro track de audio
          '-shortest',          // acaba quando a variavel mais curta acabar
        ])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(new Error(`FFmpeg merge erro: ${err.message}`)))
        .run()
    })

    // Upload
    const finalBuffer = fs.readFileSync(outputPath)
    const storagePath = `${params.userId}/${params.assetId}-render.mp4`
    const { error: uploadErr } = await admin.storage
      .from('studio')
      .upload(storagePath, finalBuffer, { contentType: 'video/mp4', upsert: true })
    if (uploadErr) throw new Error(`Upload render falhou: ${uploadErr.message}`)

    const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(storagePath)
    return publicUrl

  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignora */ }
  }
}

// Helper: executa fn com retry automático em caso de 429 (respeita retry_after)
async function withReplicateRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err: any) {
      const is429 = err?.message?.includes('429') || err?.status === 429
      if (!is429 || attempt === maxRetries) throw err
      const retryAfter = parseInt(err?.message?.match(/"retry_after":(\d+)/)?.[1] ?? '10', 10)
      await new Promise(r => setTimeout(r, (retryAfter + 1) * 1000))
    }
  }
  throw new Error('Max retries exceeded')
}

// ── Product-Aware Helpers (Fases 1-4) ─────────────────────────────────────────

async function classifyProduct(
  productBuf: Buffer,
  apiKey: string,
): Promise<ProductProfile> {
  const FALLBACK: ProductProfile = {
    category: 'packaged',
    has_text_logo: false,
    deformation_risk: 'medium',
    shape_complexity: 'medium',
    placement_suggestion: 'holding the product at chest level with both hands',
    key_features: [],
  }

  const prompt = `Analyze this product image and return a JSON profile.

Categories:
- "handheld": compact device or tool meant to be held or gripped in one hand (controller, remote, device, tool, gadget)
- "delicate": fragile or thin item (glasses, jewelry, watch, earrings, small accessory)
- "wearable": clothing, hat, shoes, or fabric item
- "packaged": bottle, can, jar, box, or container with visible label or logo
- "no-identity": abstract shape with no distinctive features

deformation_risk rules:
- "high": no visible text/logo AND compact grip-type shape that could be misinterpreted
- "medium": has some distinctive features but shape could be interpreted differently
- "low": has clear text/logo OR very standard recognizable shape (bottle, box)

shape_complexity rules:
- "complex": multi-part device, unusual silhouette, many protrusions or cutouts
- "medium": recognizable shape but with distinctive features (watch, sunglasses)
- "simple": standard symmetric shape (bottle, box, jar, ball)

Respond ONLY with valid JSON — no markdown, no explanation:
{
  "category": "<category>",
  "has_text_logo": <true|false>,
  "deformation_risk": "<low|medium|high>",
  "shape_complexity": "<simple|medium|complex>",
  "placement_suggestion": "<natural instruction for how a model should hold/wear/display this product>",
  "key_features": ["<short visual feature description>", ...]
}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/jpeg', data: productBuf.toString('base64') } },
            ],
          }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    )
    if (!res.ok) throw new Error(`classify HTTP ${res.status}`)
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const parsed = JSON.parse(text) as ProductProfile
    return {
      category: parsed.category ?? FALLBACK.category,
      has_text_logo: parsed.has_text_logo ?? FALLBACK.has_text_logo,
      deformation_risk: parsed.deformation_risk ?? FALLBACK.deformation_risk,
      shape_complexity: parsed.shape_complexity ?? FALLBACK.shape_complexity,
      placement_suggestion: parsed.placement_suggestion || FALLBACK.placement_suggestion,
      key_features: Array.isArray(parsed.key_features) ? parsed.key_features : [],
    }
  } catch (e: any) {
    console.warn('[studio] classifyProduct falhou — usando fallback:', e.message)
    return FALLBACK
  }
}

function buildCompositionPrompt(_profile: ProductProfile, userIntent: string): string {
  return `You are a professional high-end photo compositor. Produce ONE single unified photograph.

You receive two images:
[BASE PHOTO]: The specific UGC model identity.
[PRODUCT]: A client product — this is the EXACT product the client wants to showcase (can be a physical object, clothing, or accessory).

Your task: ${userIntent}

RULES — non-negotiable:
1. FACE & IDENTITY: Preserve the person's exact facial structure, features, skin tone, hair, and makeup exactly as seen in [BASE PHOTO] — do not alter her identity.
2. PRODUCT FIDELITY — CRITICAL: Treat [PRODUCT] like a literal photo restoration. The client's product must appear with 100% fidelity. Every single shape, color, texture, precise text, label, logo, proportion, and detail must be preserved exactly as in [PRODUCT]. Do NOT reimagine, reinterpret, simplify, or substitute anything.
3. CONDITIONAL CLOTHING & INTERACTION:
   - IF [PRODUCT] IS A HELD OBJECT (e.g., mug, jar, device): The person must hold it naturally. Keep the person's existing clothing exactly as in [BASE PHOTO].
   - IF [PRODUCT] IS CLOTHING OR ACCESSORY (e.g., shirt, coat, hat, full look): The person MUST WEAR the [PRODUCT]. Completely replace the relevant parts of the original clothing with the client's product. Fit the new clothing perfectly to her body shape with realistic fabric folds.
4. COMPOSITION: ONE unified photo — not a collage, not side-by-side. Check anatomy strictly: a person has exactly 2 hands and 2 arms — do NOT generate extra hands, extra arms, or disembodied limbs. Adjust hands naturally around the product.
5. BACKGROUND: Pure white (#FFFFFF) — no outdoor, no studio, no city scene.
6. OUTPUT: Natural commercial lighting and shadows that make the product look real and grounded in the scene. No watermarks, borders, or text outside the product itself.`
}

function buildRetryPrompt(basePrompt: string, issues: string[], weakestDimension?: string): string {
  const issueBlock = issues.length > 0
    ? `\n\nPREVIOUS ATTEMPT FAILED. Issues detected: ${issues.join('; ')}. You MUST fix ALL of these.`
    : ''
  const focusBlock = weakestDimension
    ? `\nCRITICAL FOCUS FOR THIS RETRY: ${weakestDimension}. Do not compromise on this dimension.`
    : ''
  return basePrompt + issueBlock + focusBlock
}

function decideRoute(profile: ProductProfile): string {
  if (profile.deformation_risk === 'high') return 'GEMINI_HIGH_RISK'
  if (profile.deformation_risk === 'medium') return 'GEMINI_MEDIUM_RISK'
  return 'GEMINI_LOW_RISK'
}

// ── Compose — Virtual Try-On ou Colar Produto ─────────
export async function composeProductScene(params: {
  portrait_url:   string
  product_url:    string
  compose_mode?:  string   // 'try-on' (default), 'overlay', 'prompt'
  position?:      string
  product_scale?: number
  vton_category?: string
  costume_prompt?: string
  smart_prompt?:  string
  assetId:        string
  userId:         string
}): Promise<string> {
  const admin  = createAdminClient()
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY não configurada')

  let resultBuffer: Buffer

  if (params.compose_mode === 'prompt') {
    // ---- MODO VESTIR VIA PROMPT (FLUX-PULID) ----
    const promptTemplate = await getStudioPrompt(
      admin,
      'compose_pulid_prompt',
      'A beautiful portrait of the person, {prompt}, perfectly fitted, hyperrealistic photography, 8k resolution, raw photo'
    )
    const promptValue = params.costume_prompt || 'wearing beautiful clothes'
    const finalPrompt = promptTemplate.replace('{prompt}', promptValue)

    const pulidRes = await fetch('https://fal.run/fal-ai/flux-pulid', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        reference_images: [
          {
            image_url: params.portrait_url,
            image_size: 1024
          }
        ],
        identity_only: true, // Garante que apenas o rosto seja transferido
        num_inference_steps: 25,
        guidance_scale: 3.5,
        true_cfg: 1,
      })
    })

    if (!pulidRes.ok) {
      const err = await pulidRes.text()
      throw new Error(`Flux Prompt falhou: ${err.slice(0, 300)}`)
    }

    const data = await pulidRes.json()
    const finalUrl = data.images?.[0]?.url || data.image?.url
    if (!finalUrl) throw new Error('Flux Prompt não retornou imagem válida.')

    const imgRes = await fetch(finalUrl)
    resultBuffer = Buffer.from(await imgRes.arrayBuffer())

  } else if (params.compose_mode === 'overlay') {
    // ---- MODO OVERLAY (Colar como objeto com Sombra e Blending) ----
    const sharp = (await import('sharp')).default

    // 1. Remove background do produto
    const bgRes = await fetch('https://fal.run/fal-ai/bria/background-removal', {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: params.product_url })
    })

    let transparentUrl = params.product_url
    if (bgRes.ok) {
      const bgData = await bgRes.json()
      if (bgData.image?.url) transparentUrl = bgData.image.url
    }

    const [portraitRes, productRes] = await Promise.all([
      fetch(params.portrait_url),
      fetch(transparentUrl),
    ])
    
    if (!portraitRes.ok || !productRes.ok) throw new Error('Falha ao baixar imagens para composição')

    const [portraitBuf, productBuf] = await Promise.all([
      portraitRes.arrayBuffer().then(b => Buffer.from(b)),
      productRes.arrayBuffer().then(b => Buffer.from(b)),
    ])

    // ---- VALIDAÇÃO DOS BUFFERS ----
    let portraitMeta = await sharp(portraitBuf).metadata().catch(() => null)
    if (!portraitMeta) throw new Error('Imagem da modelo inválida ou corrompida')

    const portraitWidth = portraitMeta.width ?? 1024
    const portraitHeight = portraitMeta.height ?? 1024
    
    const scale = params.product_scale || 0.45
    const productTargetWidth = Math.round(portraitWidth * scale)

    // Redimensiona o produto e converte para PNG (com alpha)
    const productResized = await sharp(productBuf)
      .resize({ width: productTargetWidth, withoutEnlargement: true })
      .ensureAlpha()
      .toBuffer()

    const productMeta = await sharp(productResized).metadata()
    const pW = productMeta.width ?? 0
    const pH = productMeta.height ?? 0

    // ---- SOMBRA SIMPLES (sem sharp.create) ----
    // Escurece o produto e borra -> vira a sombra
    const shadowBuf = await sharp(productResized)
      .modulate({ brightness: 0.1, saturation: 0 }) // quase preto
      .blur(12)
      .toBuffer()

    // ---- POSICIONAMENTO ----
    let gravity: string | undefined = 'southeast'
    let compositeTop: number | undefined = undefined
    let compositeLeft: number | undefined = undefined

    if (params.position === 'south')      { compositeTop = portraitHeight - pH - 20; compositeLeft = Math.round((portraitWidth - pW) / 2); gravity = undefined }
    if (params.position?.includes('center')) { compositeTop = Math.round((portraitHeight - pH) / 2); compositeLeft = Math.round((portraitWidth - pW) / 2); gravity = undefined }
    if (params.position === 'southwest')  { compositeTop = portraitHeight - pH - 20; compositeLeft = 20; gravity = undefined }
    if (params.position === 'west')       { compositeTop = Math.round((portraitHeight - pH) / 2); compositeLeft = 20; gravity = undefined }
    if (params.position === 'east')       { compositeTop = Math.round((portraitHeight - pH) / 2); compositeLeft = portraitWidth - pW - 20; gravity = undefined }
    if (params.position === 'north')      { compositeTop = 20; compositeLeft = Math.round((portraitWidth - pW) / 2); gravity = undefined }

    const shadowOffset = 8
    const shadowTop  = compositeTop  !== undefined ? compositeTop  + shadowOffset : undefined
    const shadowLeft = compositeLeft !== undefined ? compositeLeft + shadowOffset : undefined

    // ---- COMPOSIÇÃO FINAL (sombra atrás + produto na frente) ----
    resultBuffer = await sharp(portraitBuf)
      .composite([
        // Sombra (ligeiramente deslocada para baixo-direita)
        { input: shadowBuf, ...(gravity ? { gravity } : { top: shadowTop, left: shadowLeft }), blend: 'multiply' },
        // Produto (posição exata)
        { input: productResized, ...(gravity ? { gravity } : { top: compositeTop, left: compositeLeft }) }
      ])
      .jpeg({ quality: 95 })
      .toBuffer()

  } else if (params.compose_mode === 'gemini') {
    // ---- FUSÃO GEMINI NATIVA — Product-Aware Architecture ----
    const apiKey = (process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY)
    if (!apiKey) throw new Error('GOOGLE_API_KEY não configurada')

    const [portraitRes, productRes] = await Promise.all([
      fetch(params.portrait_url),
      fetch(params.product_url),
    ])
    if (!portraitRes.ok || !productRes.ok)
      throw new Error('Falha ao baixar imagens para composição Gemini')

    const [portraitBuf, productBuf] = await Promise.all([
      portraitRes.arrayBuffer().then(b => Buffer.from(b)),
      productRes.arrayBuffer().then(b => Buffer.from(b)),
    ])

    // Classificar produto e decidir rota
    const profile = await classifyProduct(productBuf, apiKey)
    const route = decideRoute(profile)
    console.log(`[studio] product-profile | category=${profile.category} has_text=${profile.has_text_logo} risk=${profile.deformation_risk} complexity=${profile.shape_complexity} route=${route}`)
    console.log(`[studio] key_features: ${profile.key_features.join(', ')}`)

    // Auto-remove product background via Fal AI Bria
    const falKey = process.env.FAL_KEY
    let finalProductBuf = productBuf
    let productMime = 'image/jpeg'
    if (falKey) {
      try {
        const bgRes = await fetch('https://fal.run/fal-ai/bria/background-removal', {
          method: 'POST',
          headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: params.product_url }),
        })
        if (bgRes.ok) {
          const bgData = await bgRes.json()
          const cleanUrl = bgData.image?.url as string | undefined
          if (cleanUrl) {
            const cleanRes = await fetch(cleanUrl)
            if (cleanRes.ok) {
              finalProductBuf = Buffer.from(await cleanRes.arrayBuffer())
              productMime = cleanUrl.includes('.png') ? 'image/png' : (cleanRes.headers.get('content-type') ?? 'image/png')
              console.log('[studio] product background removed')
            }
          }
        }
      } catch (e) {
        console.warn('[studio] Bria falhou, usando produto original:', e)
      }
    }

    const userIntent = params.smart_prompt?.trim()
      || profile.placement_suggestion
      || 'place the product naturally in the model\'s hands, she is holding it'

    const finalPrompt = buildCompositionPrompt(profile, userIntent)

    const COMPOSE_MODELS = [
      'gemini-2.5-flash-image',
      'gemini-3.1-flash-image-preview',
    ]

    async function callGeminiCompose(promptText: string): Promise<string | null> {
      const body = JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: '[BASE PHOTO] — preserve this person exactly:' },
            { inlineData: { mimeType: 'image/jpeg', data: portraitBuf.toString('base64') } },
            { text: '[PRODUCT] — place this into the base photo:' },
            { inlineData: { mimeType: productMime, data: finalProductBuf.toString('base64') } },
            { text: promptText },
          ],
        }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      })
      for (const model of COMPOSE_MODELS) {
        console.log(`[studio] Gemini compose trying: ${model}`)
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
        )
        if (!res.ok) { console.warn(`[studio] ${model} falhou (${res.status})`); continue }
        const json = await res.json()
        const parts = json.candidates?.[0]?.content?.parts ?? []
        const imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))
        if (imgPart?.inlineData?.data) {
          console.log(`[studio] Gemini compose OK | model=${model}`)
          return imgPart.inlineData.data as string
        }
        console.warn(`[studio] ${model} sem imagem | finishReason=${json.candidates?.[0]?.finishReason}`)
      }
      return null
    }

    // Gemini para todos os produtos — 1 retry com prompt adaptado se QC reprovar
    const initialBase64 = await callGeminiCompose(finalPrompt)
    if (!initialBase64) throw new Error('Todos os modelos Gemini falharam na composição')

    let currentBase64 = initialBase64
    resultBuffer = Buffer.from(currentBase64, 'base64')

    const qc1 = await assessCompositionQuality(params.product_url, currentBase64, profile)
    console.log(`[compose-qc] route=${route} attempt=1 | approved=${qc1.approved} score=${qc1.score}`)
    if (!qc1.approved) {
      console.warn(`[compose-qc] REPROVADO | weakest=${qc1.weakest_dimension} | issues: ${qc1.issues.join(', ')}`)
      const retryBase64 = await callGeminiCompose(buildRetryPrompt(finalPrompt, qc1.issues, qc1.weakest_dimension))
      if (retryBase64) {
        const qc2 = await assessCompositionQuality(params.product_url, retryBase64, profile)
        console.log(`[compose-qc] attempt=2 | approved=${qc2.approved} score=${qc2.score}`)
        if (qc2.approved) {
          currentBase64 = retryBase64
          resultBuffer = Buffer.from(currentBase64, 'base64')
        } else {
          console.warn(`[compose-qc] Retry PIOR que original — mantendo attempt=1`)
        }
      }
    } else {
      console.log(`[compose-qc] APROVADO | score=${qc1.score}`)
    }

  } else {
    // ---- MODO VIRTUAL TRY-ON (Vestir Roupa) usando IDM-VTON (Native Fetch) ----
    
    // Mapeamos para 'dresses' quando é Corpo Inteiro para garantir calça e blusa
    let idmCategory = 'upper_body'
    if (params.vton_category === 'bottoms') idmCategory = 'lower_body'
    if (params.vton_category === 'one-pieces') idmCategory = 'dresses'

    // Evita rigorosamente que o IDM-VTON ache que 'dresses' é um vestido de mulher com decote.
    // Força o entendimento de que é um "Conjunto/Terno Masculino Fechado"
    const femaleDesc = await getStudioPrompt(admin, 'compose_vton_description_female', 'Virtual try-on garment, {category}')
    const maleDesc = await getStudioPrompt(admin, 'compose_vton_description_male', 'A fully closed masculine outfit, formal suit with pants, completely buttoned coat, chest fully covered by fabric, formal menswear, highly masculine tailoring, strictly male outfit, no cleavage, no skin visible on chest.')

    let description = ""
    description = (params.vton_category === 'one-pieces') 
      ? maleDesc 
      : femaleDesc.replace('{category}', params.vton_category || 'tops')

    const vtonRes = await fetch('https://fal.run/fal-ai/idm-vton', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        human_image_url: params.portrait_url,
        garment_image_url: params.product_url,
        description: description,
        category: idmCategory,
      })
    })

    if (!vtonRes.ok) {
      const err = await vtonRes.text()
      const status = vtonRes.status
      throw new Error(`IDM-VTON falhou (Status ${status}): ${err.slice(0, 400)}`)
    }

    const data = await vtonRes.json()
    const vtonImageUrl = data.image?.url || data.images?.[0]?.url
    if (!vtonImageUrl) throw new Error('IDM-VTON não retornou imagem válida.')

    const imgRes = await fetch(vtonImageUrl)
    if (!imgRes.ok) throw new Error('Falha ao baixar imagem do IDM-VTON.')
    resultBuffer = Buffer.from(await imgRes.arrayBuffer())
  }

  // Upload final
  const path = `${params.userId}/compose-${params.assetId}.jpg`
  const { error: uploadErr } = await admin.storage
    .from('studio')
    .upload(path, resultBuffer, { contentType: 'image/jpeg', upsert: true })
  if (uploadErr) throw new Error(`Upload falhou: ${uploadErr.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return publicUrl
}

// ── Lip Sync — Fal AI SyncLabs 2.0 Pro (assíncrono via webhook) ────────────────────────
export async function startLipsyncGeneration(params: {
  face_url:  string
  audio_url: string
  assetId:   string
  userId:    string
  appUrl:    string
}) {
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY não configurada no servidor')

  const admin = createAdminClient()
  const webhookUrl = `${params.appUrl}/api/studio/webhook?assetId=${params.assetId}&userId=${params.userId}&provider=fal`

  // 1. Envia o job para a fila da Fal AI (usando SyncLabs 2.0 Pro API)
  const configStr = await getStudioPrompt(admin, 'video_latentsync_config', '{}')
  let config: any = {}
  try { config = JSON.parse(configStr) } catch { /* ignore */ }

  const queueRes = await fetch('https://queue.fal.run/fal-ai/sync-lipsync/v2/pro', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_url: params.face_url,
      audio_url: params.audio_url,
      webhook_url: webhookUrl,
      ...config
    }),
  })

  if (!queueRes.ok) {
    const err = await queueRes.text()
    throw new Error(`Fal AI erro ao enfileirar SyncLabs: ${err}`)
  }

  const { request_id } = await queueRes.json()
  if (!request_id) throw new Error('Fal AI não retornou request_id')

  // Salva request_id para o webhook identificar depois
  await admin.from('studio_assets')
    .update({ input_params: { face_url: params.face_url, audio_url: params.audio_url, prediction_id: request_id } })
    .eq('id', params.assetId)
}

// ── Animate — Fal AI live-portrait (síncrono — mesma estratégia do Lip Sync) ─
export async function startAnimateGeneration(params: {
  portrait_image_url: string
  driving_video_url: string
  assetId: string
  appUrl: string
  userId: string
}) {
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY não configurada no servidor')

  const admin = createAdminClient()

  const configStr = await getStudioPrompt(admin, 'video_liveportrait_config', '{}')
  let config: any = {}
  try { config = JSON.parse(configStr) } catch { /* ignore */ }

  // 1. Envia o job para a Fal AI
  const queueRes = await fetch('https://queue.fal.run/fal-ai/live-portrait', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url:  params.portrait_image_url,
      video_url:  params.driving_video_url,
      ...config
    })
  })

  if (!queueRes.ok) {
    const err = await queueRes.text()
    throw new Error(`Fal AI (animate) erro: ${err}`)
  }

  const { request_id } = await queueRes.json()
  if (!request_id) throw new Error('Fal AI não retornou request_id para animate')

  // Salva prediction_id para permitir sync manual caso o polling expire
  await admin.from('studio_assets')
    .update({ input_params: { prediction_id: request_id, portrait_image_url: params.portrait_image_url, driving_video_url: params.driving_video_url } })
    .eq('id', params.assetId)

  // 2. Polling síncrono — até 240s
  const statusUrl = `https://queue.fal.run/fal-ai/live-portrait/requests/${request_id}`
  const deadline = Date.now() + 240_000
  let videoUrl: string | null = null

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5000))

    const statusRes = await fetch(statusUrl, {
      headers: { 'Authorization': `Key ${falKey}` }
    })
    const status = await statusRes.json()

    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(`${statusUrl}/output`, {
        headers: { 'Authorization': `Key ${falKey}` }
      })
      const result = await resultRes.json()
      videoUrl = result.video?.url ?? result.output?.[0] ?? null
      break
    }

    if (status.status === 'ERROR' || status.status === 'FAILED') {
      throw new Error(`Fal AI (animate) falhou: ${status.error ?? 'erro desconhecido'}`)
    }
  }

  if (!videoUrl) throw new Error('Fal AI (animate): timeout aguardando resultado')

  // 3. Re-upload para Supabase — URL Fal AI expira após horas
  try {
    const videoRes = await fetch(videoUrl)
    if (videoRes.ok) {
      const buffer = Buffer.from(await videoRes.arrayBuffer())
      const path = `${params.userId}/${params.assetId}-animate.mp4`
      const { error: uploadErr } = await admin.storage
        .from('studio')
        .upload(path, buffer, { contentType: 'video/mp4', upsert: true })
      if (!uploadErr) {
        const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
        videoUrl = publicUrl
      }
    }
  } catch (e) {
    console.warn(`[animate] Re-upload Supabase falhou para ${params.assetId}, usando URL Fal AI:`, e)
  }

  // 4. Salva resultado
  await admin.from('studio_assets').update({
    status: 'done',
    result_url: videoUrl,
    last_frame_url: videoUrl,
  }).eq('id', params.assetId)

  for (let i = 0; i < 3; i++) {
    await admin.rpc('debit_credit', { user_id_param: params.userId })
  }

  return videoUrl
}

// ── Join — Costura de vídeos via FFmpeg (Fase 3) ───────────────────────────
export async function joinVideos(params: {
  video_urls: string[]   // array ordenado de URLs de vídeo
  assetId:    string
  userId:     string
}) {
  if (params.video_urls.length < 2) throw new Error('Mínimo de 2 vídeos para unir')

  const admin   = createAdminClient()
  const os      = await import('os')
  const path    = await import('path')
  const fs      = await import('fs')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegPath = require('ffmpeg-static') as string
  const { default: ffmpeg } = await import('fluent-ffmpeg')
  ffmpeg.setFfmpegPath(ffmpegPath)

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-join-'))
  const localPaths: string[] = []

  try {
    // 1. Download de cada vídeo para /tmp
    for (let i = 0; i < params.video_urls.length; i++) {
      const url = params.video_urls[i]
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Falha ao baixar vídeo ${i + 1}: ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      const localPath = path.join(tmpDir, `clip_${i}.mp4`)
      fs.writeFileSync(localPath, buf)
      localPaths.push(localPath)
    }

    // 2. Cria arquivo de concat list para FFmpeg
    const listPath = path.join(tmpDir, 'list.txt')
    const listContent = localPaths.map(p => `file '${p}'`).join('\n')
    fs.writeFileSync(listPath, listContent)

    // 3. Executa FFmpeg concat
    const outputPath = path.join(tmpDir, 'joined.mp4')
    await new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions(['-c', 'copy'])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(new Error(`FFmpeg erro: ${err.message}`)))
        .run()
    })

    // 4. Upload do arquivo final para Supabase
    const finalBuffer = fs.readFileSync(outputPath)
    const storagePath = `${params.userId}/${params.assetId}-joined.mp4`
    const { error: uploadErr } = await admin.storage
      .from('studio')
      .upload(storagePath, finalBuffer, { contentType: 'video/mp4', upsert: true })
    if (uploadErr) throw new Error(`Upload falhou: ${uploadErr.message}`)

    const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(storagePath)
    return publicUrl

  } finally {
    // Limpa arquivos temporários
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignora */ }
  }
}

export async function startVeo3DirectGoogle(params: {
  source_image_url: string
  motion_prompt:    string
  duration?:        number
  quality?:         string
  assetId:          string
  userId:           string
}) {
  const apiKey = (process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY)
  if (!apiKey) throw new Error('GOOGLE_API_KEY não configurada no servidor')

  const admin = createAdminClient()

  // 1. Baixa imagem e converte para base64 (Google API não aceita URLs externas)
  // Se for um vídeo (continuação), extraímos o frame agora mesmo
  let finalSourceUrl = params.source_image_url
  let imgBuffer: Buffer

  if (finalSourceUrl.toLowerCase().includes('.mp4')) {
    console.log(`[studio] Detectado vídeo como origem para Veo3. Extraindo último frame...`)
    try {
      imgBuffer = await extractVideoFrame(finalSourceUrl)
    } catch (e) {
      console.error(`[studio] Falha ao extrair frame on-the-fly:`, e)
      throw new Error('Não foi possível processar a continuação: falha ao extrair frame do vídeo anterior.')
    }
  } else {
    const imgRes = await fetch(finalSourceUrl)
    if (!imgRes.ok) throw new Error('Falha ao baixar imagem fonte para Veo3 Google')
    imgBuffer = Buffer.from(await imgRes.arrayBuffer())
  }

  const base64Image = imgBuffer.toString('base64')
  const mimeType = 'image/jpeg'

  // Tentativa final com Gemini API + AdsLiberty Key (Org Policy Fixed)
  const model = 'veo-3.1-generate-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning?key=${apiKey}`;
  
  const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{
          prompt: params.motion_prompt || (await getStudioPrompt(admin, 'video_veo_default_prompt', 'smooth cinematic product motion')),
          referenceImages: [{
            image: { bytesBase64Encoded: base64Image, mimeType }
          }],
        }],
        parameters: {
          aspectRatio: '9:16'
        },
      }),
    }
  )

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`[Google AI Error] ${res.status}:`, errText);
    throw new Error(`Erro na API do Google (${res.status}): ${errText.slice(0, 300)}`);
  }

  const body = await res.json()
  const operationName = body.name
  if (!operationName) throw new Error('Google não retornou o nome da operação de vídeo')

  await admin.from('studio_assets')
    .update({
      input_params: {
        prediction_id: operationName,
        provider: 'google',
        engine: 'veo',
        source_image_url: params.source_image_url,
        motion_prompt: params.motion_prompt,
        quality: params.quality,
      }
    })
    .eq('id', params.assetId)

  return operationName;
}

// ── Image-to-Image (Angles / Poses) ──────────────────────────────────────────────────────────
export async function generateAngles(params: {
  source_url: string
  angle: string
  engine?: string
  aspect_ratio?: string
  assetId: string
  userId: string
}) {
  const admin = createAdminClient()
  const engine = params.engine ?? 'flux'
  
  const angleMap: Record<string, string> = {
    frontal: 'frontal shot, looking directly at the camera, symmetric composition, full body visible, consistent facial identity',
    profile: 'full body side profile shot, entire person visible from head to toe, wide framing with ample space on both sides to avoid cropping, face and body turned 90 degrees, consistent facial features',
    closeup: 'extreme close-up macro shot of the face only, maintaining skin texture and eye color, tight framing on the face',
    wide:    'extreme wide angle, full body shot, entire figure visible with generous surrounding space, maintaining body proportions and clothing',
    back:    'full body shot from behind, entire person visible head to toe, back and hair facing the camera, maintaining the same hair style, hair color and gender silhouette',
  }

  // Mapeia aspect_ratio do frontend para formato aceito pelo Gemini
  const aspectRatioMap: Record<string, string> = {
    '9:16': '9:16',
    '1:1':  '1:1',
    '4:5':  '4:5',
    '16:9': '16:9',
    '3:4':  '3:4',
  }
  const geminiAspectRatio = aspectRatioMap[params.aspect_ratio ?? '9:16'] ?? '9:16'

  const perspective = angleMap[params.angle] || angleMap['frontal']
  
  const googleApiKey = (process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY)
  if (!googleApiKey) throw new Error('GOOGLE_API_KEY não configurada no servidor')

  // 1. Download base image (Garantindo que seja IMAGEM e não VÍDEO)
  if (!params.source_url || !params.source_url.startsWith('http')) {
    throw new Error('URL da imagem fonte inválida para o Imagen')
  }

  let urlToFetch = params.source_url
  if (urlToFetch.toLowerCase().endsWith('.mp4')) {
    console.log('[studio] Source is video (.mp4), searching for last_frame_url in DB...')
    const { data: assetData } = await admin
      .from('studio_assets')
      .select('last_frame_url, id')
      .eq('result_url', params.source_url)
      .maybeSingle()
    
    if (assetData?.last_frame_url) {
      urlToFetch = assetData.last_frame_url
      console.log(`[studio] Found last_frame_url for asset ${assetData.id}:`, urlToFetch.slice(0, 60))
    } else {
      console.warn('[studio] Warning: No last_frame_url found for this video. Vertex AI might fail if sent as MP4.')
    }
  }

  const imgResSource = await fetch(urlToFetch)
  if (!imgResSource.ok) throw new Error(`Erro download: ${imgResSource.status} de ${urlToFetch}`)
  
  const mimeType = imgResSource.headers.get('content-type') || 'image/jpeg'
  const imgBuffer = Buffer.from(await imgResSource.arrayBuffer())
  const base64Image = imgBuffer.toString('base64')

  // Identificacao automatica de genero via Gemini Vision para garantir consistencia
  let detectedGender = 'person'
  let sourceDescription = ''
  try {
    // Busca descrição original se vier de um Nó de Modelo ou Compose
    const { data: sourceAsset } = await admin
      .from('studio_assets')
      .select('input_params')
      .eq('result_url', params.source_url)
      .maybeSingle()
    
    if (sourceAsset?.input_params?.model_text) {
      sourceDescription = String(sourceAsset.input_params.model_text)
    }

    const visionRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Just one word: Is the person in this image Male or Female?" },
            { inline_data: { mime_type: mimeType, data: base64Image } }
          ]
        }]
      })
    })
    const visionData = await visionRes.json()
    const text = visionData.candidates?.[0]?.content?.parts?.[0]?.text?.toLowerCase() || ''
    if (text.includes('female') || text.includes('woman')) detectedGender = 'woman'
    else if (text.includes('male') || text.includes('man')) detectedGender = 'man'
  } catch (e) {
    console.warn('[studio] Falha na auto-detencao de genero:', e)
  }

  // Se tivermos a descrição original, ela vira um reforço imbatível no prompt
  const traits = sourceDescription 
    ? `Exactly this person: ${sourceDescription}. `
    : `A ${detectedGender} model. `

  const prompt = `${traits} Maintain EXACT identity, EXACT same clothes, hair color, and facial features. Switch camera to ${params.angle} view. Full consistency of the ${detectedGender} is mandatory. Photorealistic. ${perspective}. 8k resolution, cinematic lighting.`

  console.log(`[studio] Gerando Angulo [${engine}] para asset ${params.assetId}. URL: ${params.source_url.slice(0, 50)}...`)

  let photoBuffer: Buffer | null = null

  const { data: fallbackSet } = await admin.from('studio_prompts').select('value').eq('key', 'angles_fallback_active').single()
  const allowFallback = fallbackSet?.value === 'true'

  if (engine === 'google') {
    // Gemini 3 Pro Image → Gemini 3.1 Flash Image (fallback)
    const aspectLabel: Record<string, string> = { '9:16': 'vertical 9:16 portrait', '1:1': 'square 1:1', '4:5': 'vertical 4:5 portrait', '16:9': 'horizontal 16:9 landscape', '3:4': 'vertical 3:4 portrait' }
    const ratioInstruction = `Compose the output image in ${aspectLabel[geminiAspectRatio] ?? 'vertical 9:16 portrait'} format. Ensure the full body fits within the frame without cropping.`

    const geminiPrompt = [
      `You are a professional photo director. You receive a photo of a ${detectedGender} and must output a NEW photorealistic photo of the SAME person from a different camera angle.`,
      `CHANGE ONLY: the camera angle to "${params.angle}" view — ${perspective}.`,
      `PRESERVE EXACTLY: same face, same facial features, same skin tone, same hair color and style, same outfit and every clothing item with exact colors, patterns and details, same body proportions.`,
      ratioInstruction,
      `Output: photorealistic commercial photo, shot on film, shot on Hasselblad H6D, Zeiss Otus 85mm f/1.4 lens, Kodak Portra 400, film grain, natural depth of field, white or neutral background, no watermarks.`,
    ].join(' ')

    const geminiChain = ['gemini-3-pro-image-preview', 'gemini-3.1-flash-image-preview']
    let geminiSuccess = false

    for (const model of geminiChain) {
      try {
        console.log(`[angles] Tentando Gemini model=${model} angle=${params.angle}`)
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [
                { text: geminiPrompt },
                { inlineData: { mimeType, data: base64Image } },
              ]}],
              generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as any,
            }),
          }
        )
        if (!res.ok) throw new Error(`${model}: ${res.status} ${await res.text()}`)
        const data = await res.json()
        const parts = data.candidates?.[0]?.content?.parts ?? []
        const imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))
        if (!imgPart?.inlineData?.data) throw new Error(`${model} sem imagem | reason=${data.candidates?.[0]?.finishReason}`)
        photoBuffer = Buffer.from(imgPart.inlineData.data, 'base64')
        console.log(`[angles] Gemini sucesso: ${model}`)
        geminiSuccess = true
        break
      } catch (e: any) {
        console.warn(`[angles] ${model} falhou: ${e.message}`)
      }
    }

    if (!geminiSuccess) throw new Error('Todos os modelos Gemini falharam para angles.')
  } else {
    // ---- FLUX DEV (IMAGE-TO-IMAGE) - OPTIMIZED FOR IDENTITY ----
    const falKey = process.env.FAL_KEY
    if (!falKey) throw new Error('FAL_KEY não configurada no servidor')

    const res = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: params.source_url,
        prompt: `${prompt} — camera angle change ONLY. Do NOT alter any clothing, outfit, hair color, face, or accessories. Preserve every visual detail from the source image.`,
        strength: 0.28,
        num_inference_steps: 35,
        guidance_scale: 3.5,
        image_size: params.aspect_ratio === '9:16' ? 'portrait_16_9' : params.aspect_ratio === '1:1' ? 'square_hd' : 'portrait_4_3',
        output_format: 'jpeg',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Falha ao gerar nova perspectiva (Flux i2i): ${err}`)
    }

    const data = await res.json()
    const imageUrl = data.images?.[0]?.url
    if (!imageUrl) throw new Error('Não foi possível obter a URL da nova imagem (Flux)')

    const imgDl = await fetch(imageUrl)
    photoBuffer = Buffer.from(await imgDl.arrayBuffer())
  }

  if (!photoBuffer) throw new Error('Falha ao gerar o buffer da foto do modelo.')

  // Define caminho e sobe pro Storage
  const storagePath = `${params.userId}/${params.assetId}-angle.jpg`
  const { error } = await admin.storage
    .from('studio')
    .upload(storagePath, photoBuffer, { contentType: 'image/jpeg', upsert: true })

  if (error) throw new Error(`Falha no Storage (Angles): ${error.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(storagePath)
  return publicUrl
}

/**
 * Auxiliar para obter Token de Acesso do Vertex AI
 */
async function getVertexAccessToken(keyJson?: string): Promise<string> {
  if (!keyJson) return ''
  try {
    // Tenta limpar possíveis erros de escape no JSON vindo de ENV
    let credentials = keyJson
    if (keyJson.startsWith('"') && keyJson.endsWith('"')) {
      credentials = JSON.parse(keyJson)
    }
    const credsObj = typeof credentials === 'string' ? JSON.parse(credentials) : credentials

    const auth = new GoogleAuth({
      credentials: credsObj,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    })
    const client = await auth.getClient()
    const token = await client.getAccessToken()
    if (!token.token) throw new Error('Token vindo do Google está vazio. Verifique permissões da IA.')
    return token.token
  } catch (e: any) {
    console.error('[studio] ERRO CRÍTICO NO TOKEN VERTEX:', e)
    throw new Error(`Erro Autenticação Vertex: ${e.message}`)
  }
}

/**
 * Gera trilha sonora usando Google Lyria 3
 */
export async function generateMusic(params: {
  userId: string
  assetId: string
  prompt: string
  source_image_url?: string
}) {
  const googleApiKey = (process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY)
  if (!googleApiKey) throw new Error('GOOGLE_API_KEY não configurada no servidor')

  const parts: any[] = [{ text: params.prompt }]

  if (params.source_image_url) {
    try {
      const imgRes = await fetch(params.source_image_url)
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer())
        parts.push({
          inline_data: {
            mime_type: 'image/jpeg',
            data: buffer.toString('base64')
          }
        })
      }
    } catch (e) {
      console.warn('[studio] Falha ao baixar imagem para Lyria:', e)
    }
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/lyria-3-clip-preview:generateContent?key=${googleApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }] })
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Erro Lyria 3 (${res.status}): ${err}`)
  }

  const data = await res.json()
  let audioData: Buffer | null = null
  const partsArray = data.candidates?.[0]?.content?.parts || []
  for (const part of partsArray) {
    if (part.inlineData) {
      audioData = Buffer.from(part.inlineData.data, 'base64')
      break
    }
  }

  if (!audioData) throw new Error('Lyria 3 não retornou áudio')

  const path = `${params.userId}/${params.assetId}-audio.mp3`
  const admin = createAdminClient()
  await admin.storage.from('studio').upload(path, audioData, { contentType: 'audio/mpeg', upsert: true })
  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return publicUrl
}

// ── UGC Poses ──────────────────────────────────────────────────────────────

export const UGC_POSITIONS = {
  rosto_close: {
    prompt: `Extreme close-up portrait, face filling the frame, looking directly at camera, natural smile, soft studio background. Hands NOT visible.`,
    description: 'Close-up rosto - máxima emoção'
  },
  rosto_lado: {
    prompt: `Side profile portrait, face turned 90 degrees, looking forward with calm expression, hair visible, clean neutral background. Hands NOT visible.`,
    description: 'Perfil rosto - elegância'
  },
  meia_pose_cta: {
    prompt: `Medium shot waist-up, one hand extended toward camera with open palm gesture, other hand relaxed at side, smiling at camera, white studio background, professional lighting. Exactly 2 hands total, no extra limbs.`,
    description: 'Meia pose CTA - chamada'
  },
  corpo_inteiro_pe: {
    prompt: `Full body standing shot, confident posture, right hand on hip, left arm hanging naturally at side with hand fully visible, natural smile, plain white minimalist background. Both arms fully visible, anatomically correct.`,
    description: 'Corpo inteiro - confiança'
  },
  corpo_inteiro_sentada: {
    prompt: `Full body sitting on a simple modern stool, relaxed pose, legs crossed naturally, looking at camera, warm neutral background. Hands resting naturally on lap. No objects on the stool. Exactly 2 hands.`,
    description: 'Corpo inteiro sentada - casual'
  },
  movimento_dinamica: {
    prompt: `Dynamic movement shot, walking confidently forward, hair flowing naturally, arms swinging naturally at sides in walking motion, energetic expression, modern urban background. Exactly 2 arms, 2 hands.`,
    description: 'Movimento dinâmico - energia'
  },
  plano_americano: {
    prompt: `American plan shot waist-up, arms crossed over chest, natural confident expression, modern glass office background. Exactly 2 arms crossed. No extra hands or limbs.`,
    description: 'Plano americano - profissional'
  },
  detalhe_expressao: {
    prompt: `Three-quarter shot, hands gently touching face or hair in natural casual gesture, genuine expressive smile, soft bokeh background, cinematic natural lighting. Exactly 2 hands, no floating limbs, no invented objects.`,
    description: 'Expressão natural - autenticidade'
  }
}

export async function generateUGCPositions(params: {
  sourceUrl: string
  userId: string
  assetId: string
}) {
  const admin = createAdminClient()
  
  console.log('[studio] Downloading source for UGC Positions...')
  const imgRes = await fetch(params.sourceUrl)
  if (!imgRes.ok) throw new Error('Falha ao baixar imagem base para posições UGC')
  
  const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'
  const buffer = Buffer.from(await imgRes.arrayBuffer())
  const base64 = buffer.toString('base64')

  const vertexKey = process.env.GOOGLE_VERTEX_KEY
  if (!vertexKey) throw new Error('GOOGLE_VERTEX_KEY não encontrada nas variáveis de ambiente.')

  // Tenta extrair o Project ID de dentro do JSON da chave se não houver ENV específica
  let projectId = process.env.VERTEX_PROJECT_ID
  if (!projectId) {
     try {
       const keyData = JSON.parse(vertexKey.startsWith('"') ? JSON.parse(vertexKey) : vertexKey)
       projectId = keyData.project_id
     } catch (e) {
       console.warn('[studio] Não foi possível extrair ProjectID da chave JSON')
     }
  }
  
  // Fallback final inseguro removido por segunrança. Forçamos o erro se não achar.
  if (!projectId) throw new Error('VERTEX_PROJECT_ID não configurado e não foi possível detectar pela chave JSON.')

  const location = process.env.VERTEX_LOCATION || 'us-central1'
  const vertexToken = await getVertexAccessToken(vertexKey)

  const vertexUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-capability-001:predict`

  console.log(`[studio] UGC BUNDLE: Target URL: ${vertexUrl}`)
  console.log(`[studio] UGC BUNDLE: Using Project: ${projectId}`)

  console.log('[studio] Starting Parallel Generation of 8 UGC Positions using Vertex AI...')
  
  const positions = await Promise.all(
    Object.entries(UGC_POSITIONS).map(async ([posKey, posConfig]) => {
      try {
        const payload = {
          instances: [{
            prompt: `IDENTITY LOCK — person[1] is the sole reference. Generate ONE single high-resolution commercial photograph.

RULE 1 — FACIAL & BODY IDENTITY (non-negotiable): This is a CLONING task. Reproduce person[1] with 100% fidelity: exact facial bone structure, exact nose shape, exact lip shape, exact eye shape and color, exact eyebrow shape, exact skin tone and texture, exact age appearance, exact hair cut and length, exact hair color. Both eyes symmetrical and correctly aligned. The generated person must be indistinguishable from person[1]. Do NOT make them younger, thinner, prettier or different in any way.

RULE 2 — OUTFIT FIDELITY (non-negotiable): The outfit must be pixel-perfect identical to person[1]: exact garment type, exact color, exact fabric texture, exact neckline, exact straps, exact fit. Do NOT add, remove or change any clothing item.

RULE 2B — NO INVENTED OBJECTS: Do NOT add any product, object, prop or accessory NOT visible in person[1]. Empty hands stay empty. No bottles, no packages, no devices.

RULE 3 — UNIFIED COMPOSITION & ANATOMY (critical): ONE single photograph only. Both arms must be fully visible and anatomically correct — no arm disappearing behind body, no merged limbs, no floating hands. Exactly 2 arms, 2 hands, 5 fingers each. Verify arm visibility before finalizing.

RULE 4 — DYNAMIC POSE EXECUTION: Execute exactly — ${posConfig.prompt}

RULE 5 — SCENE & LIGHTING: Follow the scene context described in the pose. Cinematic commercial studio lighting, natural depth of field, soft bokeh.

RULE 6 — CAMERA & QUALITY BOOSTERS (critical): Shot on Hasselblad H6D, Zeiss Otus 85mm f/1.4 lens, Kodak Portra 400, film grain, natural depth of field, hyper-realistic, 8k. Shot on film. No external borders, no watermarks, no text overlay.

FINAL CHECK — ABSOLUTE PROHIBITIONS: NO bottles, NO cans, NO skincare products, NO supplements, NO packages, NO props, NO objects in hands unless already in person[1]. NO outfit changes — clothing must be 100% identical to person[1]. NO jacket, NO coat, NO added accessories not present in person[1].`,
            referenceImages: [
              {
                referenceId: 1,
                referenceType: "REFERENCE_TYPE_RAW",
                referenceImage: {
                  bytesBase64Encoded: base64,
                  mimeType: mimeType
                }
              }
            ]
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '9:16',
            negativePrompt: 'bottle, can, product, skincare, supplement, package, prop, object in hand, jacket, coat, different outfit, outfit change, different clothing, different colors, accessories not in original, watermark, text, extra limbs, extra hands, floating hands',
          }
        }

        const response = await fetch(vertexUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vertexToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errText = await response.text()
          console.error(`[${posKey}] Error:`, errText)
          return null
        }

        const result = await response.json()
        const imageBase64 = (result as any).predictions?.[0]?.bytesBase64Encoded
        if (!imageBase64) return null

        const imgBuf = Buffer.from(imageBase64, 'base64')
        const path = `${params.userId}/${params.assetId}-${posKey}.jpg`
        const { error: uploadError } = await admin.storage.from('studio').upload(path, imgBuf, {
          contentType: 'image/jpeg',
          upsert: true
        })

        if (uploadError) {
          console.error(`[${posKey}] Upload Error:`, uploadError)
          return null
        }

        const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
        
        return {
          position: posKey,
          description: posConfig.description,
          url: publicUrl,
          status: 'success'
        }

      } catch (error: any) {
        console.error(`[${posKey}] Error:`, error.message)
        return { position: posKey, status: 'failed', error: error.message }
      }
    })
  )

  const successful = positions.filter((p): p is NonNullable<typeof p> => p !== null && p.status === 'success')
  return successful
}

// ── Cena Livre — coloca o modelo em qualquer ambiente descrito ────────────────
export async function generateScene(params: {
  source_url: string
  extra_source_urls?: string[]
  scene_prompt: string
  aspect_ratio?: string
  assetId: string
  userId: string
}) {
  const admin = createAdminClient()
  const googleApiKey = (process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY)
  if (!googleApiKey) throw new Error('GOOGLE_API_KEY não configurada no servidor')

  if (!params.source_url?.startsWith('http')) throw new Error('URL da imagem fonte inválida')

  // Download da imagem principal + extras (até 2 extras)
  async function fetchInlineData(url: string) {
    const r = await fetch(url)
    if (!r.ok) throw new Error(`Download falhou: ${r.status}`)
    const mime = r.headers.get('content-type') || 'image/jpeg'
    const data = Buffer.from(await r.arrayBuffer()).toString('base64')
    return { mimeType: mime, data }
  }

  const primaryData = await fetchInlineData(params.source_url)
  const extraData = await Promise.all(
    (params.extra_source_urls ?? []).slice(0, 5).map(u => fetchInlineData(u).catch(() => null))
  ).then(r => r.filter(Boolean) as { mimeType: string; data: string }[])

  const hasMultiple = extraData.length > 0

  const aspectLabel: Record<string, string> = {
    '9:16': 'vertical 9:16 portrait', '1:1': 'square 1:1', '4:5': 'vertical 4:5 portrait',
    '16:9': 'horizontal 16:9 landscape', '3:4': 'vertical 3:4 portrait',
  }
  const ratioInstruction = `Compose the output in ${aspectLabel[params.aspect_ratio ?? '9:16'] ?? 'vertical 9:16 portrait'} format. Ensure the full person fits in frame.`

  const geminiPrompt = [
    `You are a professional photo director and visual effects artist.`,
    hasMultiple
      ? `You receive ${extraData.length + 1} reference photos of the same person from different angles. Use ALL of them together to build the most accurate identity possible.`
      : `You receive a photo of a person and must place them EXACTLY into a new scene or environment.`,
    `NEW SCENE: ${params.scene_prompt}.`,
    `PRESERVE EXACTLY: same face, same facial features, same skin tone, same hair color and style, same outfit with exact colors and details, same body proportions.`,
    `The person must look naturally integrated into the new scene — realistic lighting matching the environment, natural shadows, correct perspective.`,
    ratioInstruction,
    `Output: photorealistic commercial photo, shot on Hasselblad H6D, Zeiss Otus 85mm f/1.4 lens, Kodak Portra 400, film grain, natural depth of field, no watermarks.`,
  ].join(' ')

  const imageParts = [
    { inlineData: primaryData },
    ...extraData.map(d => ({ inlineData: d })),
  ]

  let photoBuffer: Buffer | null = null
  const geminiChain = ['gemini-3-pro-image-preview', 'gemini-3.1-flash-image-preview']

  for (const model of geminiChain) {
    try {
      console.log(`[scene] Tentando ${model} para asset ${params.assetId} (${imageParts.length} referência(s))`)
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [
              { text: geminiPrompt },
              ...imageParts,
            ]}],
            generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } as any,
          }),
        }
      )
      if (!res.ok) throw new Error(`${model}: ${res.status} ${await res.text()}`)
      const data = await res.json()
      const parts = data.candidates?.[0]?.content?.parts ?? []
      const imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))
      if (!imgPart?.inlineData?.data) throw new Error(`${model} sem imagem | reason=${data.candidates?.[0]?.finishReason}`)
      photoBuffer = Buffer.from(imgPart.inlineData.data, 'base64')
      console.log(`[scene] Gemini sucesso: ${model}`)
      break
    } catch (e: any) {
      console.warn(`[scene] ${model} falhou: ${e.message}`)
    }
  }

  if (!photoBuffer) throw new Error('Todos os modelos Gemini falharam para scene.')

  const fileName = `scene-${params.assetId}-${Date.now()}.jpg`
  const filePath = `${params.userId}/${fileName}`
  const { error: uploadError } = await admin.storage
    .from('studio')
    .upload(filePath, photoBuffer, { contentType: 'image/jpeg', upsert: true })
  if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`)

  const { data: urlData } = admin.storage.from('studio').getPublicUrl(filePath)
  return urlData.publicUrl
}

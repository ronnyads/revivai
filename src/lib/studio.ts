import Replicate from 'replicate'
import { createAdminClient } from '@/lib/supabase/admin'
import { AssetType } from '@/types'

export const CREDIT_COST: Record<AssetType, number> = {
  image:   1,
  script:  1,
  voice:   1,
  caption: 1,
  upscale: 1,
  video:   3,
  model:   1,
  render:  1,
  animate: 3,
}

// ── Image — DALL-E 3 via fetch ─────────────────────────────────────────────
export async function generateImage(params: {
  prompt: string
  style: string
  aspect_ratio: string
  model_prompt?: string
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

  const stylePrefix = params.style === 'ugc'
    ? 'UGC style ad photo, authentic, shot on phone, candid, real person, '
    : params.style === 'product'
    ? 'professional product photography, clean background, studio lighting, '
    : 'lifestyle photography, natural light, aspirational, '

  const finalPrompt = params.model_prompt
    ? `${params.model_prompt}. ${stylePrefix}${params.prompt}`
    : stylePrefix + params.prompt

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: finalPrompt,
      size,
      quality: 'standard',
      n: 1,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`DALL-E erro: ${err.error?.message ?? res.status}`)
  }

  const data = await res.json()
  const tempUrl = data.data?.[0]?.url
  if (!tempUrl) throw new Error('DALL-E não retornou URL')

  // Re-upload para bucket studio (URLs OpenAI expiram em 1h)
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

  const formatGuide: Record<string, string> = {
    reels: 'Reels/TikTok (15-30 segundos, hook nos primeiros 3s)',
    story: 'Stories (até 15 segundos por slide, 3 slides)',
    feed:  'Feed/anúncio (30-60 segundos, mais elaborado)',
  }

  const hookGuide: Record<string, string> = {
    problema: 'começe identificando um problema real do público',
    resultado: 'começe mostrando o resultado incrível primeiro',
    pergunta:  'começe com uma pergunta provocadora',
    historia:  'começe com uma mini história pessoal',
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.8,
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em criação de scripts UGC virais para o mercado brasileiro.
Crie scripts autênticos, conversacionais e de alta conversão. Use linguagem natural e cotidiana do brasileiro.
Inclua indicações de tom, pausas e emoção entre colchetes. Formato: ${formatGuide[params.format] ?? formatGuide.reels}.`,
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
        stability: 0.5,
        similarity_boost: 0.75,
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

  const ext = params.audio_url.split('.').pop()?.toLowerCase() ?? 'mp3'
  const formData = new FormData()
  formData.append('file', new Blob([buffer], { type: `audio/${ext}` }), `audio.${ext}`)
  formData.append('model', 'whisper-1')
  formData.append('language', 'pt')
  formData.append('response_format', 'srt')

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

// ── Upscale — Real-ESRGAN (inline polling) ────────────────────────────────
export async function generateUpscale(params: {
  source_url: string
  scale: number
}) {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })
  const { getModelVersion } = await import('@/lib/replicate')

  const version = await getModelVersion(replicate, 'nightmareai/real-esrgan')
  const prediction = await replicate.predictions.create({
    version,
    input: { image: params.source_url, scale: params.scale ?? 4, face_enhance: false },
  })

  let result = prediction
  const start = Date.now()
  while (result.status !== 'succeeded' && result.status !== 'failed' && result.status !== 'canceled') {
    if (Date.now() - start > 120_000) throw new Error('Timeout no upscale')
    await new Promise(r => setTimeout(r, 2000))
    result = await replicate.predictions.get(result.id)
  }

  if (result.status !== 'succeeded' || !result.output) {
    throw new Error(result.error ? String(result.error) : 'Real-ESRGAN falhou')
  }

  const output = result.output
  const url = typeof output === 'string' ? output : Array.isArray(output) ? output[0] : null
  if (!url) throw new Error('Real-ESRGAN retornou saída inválida')
  return url as string
}

// ── Model — GPT-4o gera descrição visual única para UGC ───────────────────
export async function generateModel(params: {
  gender: string
  age_range: string
  skin_tone: string
  body_type: string
  style: string
  extra_details?: string
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

  const system = `You are a UGC creative director specializing in AI image generation for ads.
Generate a UNIQUE, vivid, photorealistic visual description of a model for DALL-E 3.
Vary vocabulary, hair details, facial features, and scene context every response — never repeat.
Seed for uniqueness: ${seed}.
Output: one dense English paragraph (3-5 sentences). No names. Pure visual description.`

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

  // Gera foto com FLUX 1.1 Pro via Replicate (muito mais fotorrealista que DALL-E)
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })

  const fluxPrompt = `Candid portrait photo of a real person: ${text} Shot on iPhone 15 Pro, natural daylight, authentic UGC style. Skin pores and natural imperfections visible. Real human face, photojournalism style, not a studio shoot, not retouched, not illustrated.`

  const fluxOutput = await replicate.run('black-forest-labs/flux-1.1-pro', {
    input: {
      prompt: fluxPrompt,
      aspect_ratio: '9:16',
      output_format: 'jpg',
      output_quality: 90,
      safety_tolerance: 3,
    },
  }) as string | { url: () => string }

  const tempUrl = typeof fluxOutput === 'string' ? fluxOutput : fluxOutput.url()
  if (!tempUrl) throw new Error('FLUX não retornou URL para o modelo')

  // Re-upload para bucket studio
  const photoBuffer = Buffer.from(await (await fetch(tempUrl)).arrayBuffer())
  const path = `${params.userId}/${params.assetId}-model.jpg`
  const { error } = await admin.storage
    .from('studio')
    .upload(path, photoBuffer, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(`Upload foto modelo falhou: ${error.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return { url: publicUrl, text }
}

// ── Video — Kling AI via Replicate (async — usa webhook) ──────────────────
export async function startVideoGeneration(params: {
  source_image_url: string
  motion_prompt: string
  duration: number
  model_prompt?: string
  assetId: string
  appUrl: string
  userId: string
}) {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })

  const webhookUrl = `${params.appUrl}/api/studio/webhook?assetId=${params.assetId}&userId=${params.userId}`

  // Injeta contexto do modelo UGC no prompt de movimento
  const modelContext = params.model_prompt
    ? `Person: ${params.model_prompt.slice(0, 200)}. `
    : ''
  const finalMotion = modelContext + (params.motion_prompt || 'smooth product showcase motion')

  await replicate.predictions.create({
    model: 'kwaivgi/kling-v1-5-pro',
    input: {
      image: params.source_image_url,
      prompt: finalMotion,
      duration: params.duration ?? 5,
      aspect_ratio: '9:16',
    },
    webhook: webhookUrl,
    webhook_events_filter: ['completed'],
  })
}

// ── Render — merge áudio + vídeo via Replicate ────────────────────────────
export async function mergeVideoAudio(params: {
  video_url: string
  audio_url: string
  assetId: string
  userId: string
}) {
  const admin = createAdminClient()
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })

  const output = await replicate.run('nateraw/video-add-audio' as `${string}/${string}`, {
    input: {
      video: params.video_url,
      audio: params.audio_url,
    },
  }) as string | { url: () => string }

  const outputUrl = typeof output === 'string' ? output : output.url()
  if (!outputUrl) throw new Error('Merge não retornou URL')

  const renderRes = await fetch(outputUrl)
  const buffer = Buffer.from(await renderRes.arrayBuffer())
  const path = `${params.userId}/${params.assetId}-render.mp4`

  const { error } = await admin.storage
    .from('studio')
    .upload(path, buffer, { contentType: 'video/mp4', upsert: true })
  if (error) throw new Error(`Upload render falhou: ${error.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return publicUrl
}

// ── Animate — LivePortrait via Replicate (async — usa webhook) ────────────
export async function startAnimateGeneration(params: {
  portrait_image_url: string
  driving_video_url: string
  assetId: string
  appUrl: string
  userId: string
}) {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })

  const webhookUrl = `${params.appUrl}/api/studio/webhook?assetId=${params.assetId}&userId=${params.userId}`

  await replicate.predictions.create({
    model: 'fofr/live-portrait',
    input: {
      image:         params.portrait_image_url,
      video:         params.driving_video_url,
      output_format: 'mp4',
    },
    webhook: webhookUrl,
    webhook_events_filter: ['completed'],
  })
}

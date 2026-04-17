import sharp from 'sharp'
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
  compose: 1,
  lipsync: 3,
  face:    0,
  join:    0,
}

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
    ugc:       'UGC style ad photo, authentic, shot on phone, candid, real person, photorealistic, 8k, highly detailed, ',
    product:   'professional product photography, clean background, studio lighting, hyper-realistic, 8k resolution, ',
    logo:      'professional logo design, clean vector style, transparent background, minimalist, ',
    mascote:   '3D animated mascot, anthropomorphic character, cinematic lighting, highly detailed 3D render, Pixar style, ',
    personagem_cartoon: 'Cartoon Network style, 2D flat animation, vibrant colors, bold outlines, stylized character design, solid color background, ',
    lifestyle: 'lifestyle photography, natural light, aspirational, photorealism, cinematic lighting, ',
  }
  const styleKey = `image_style_${params.style}`
  const stylePrefix = await getStudioPrompt(admin, styleKey, STYLE_FALLBACKS[params.style] ?? STYLE_FALLBACKS.lifestyle)

  // O prompt principal
  const basePrompt = params.model_prompt
    ? `${params.model_prompt}. ${stylePrefix}${params.prompt}`
    : stylePrefix + params.prompt

  // Sulfixo varia se for mascote/cartoon (não usar 'real person' em desenhos)
  const isMascotOrCartoon = ['mascote', 'personagem_cartoon'].includes(params.style)
  
  let realismSuffix = "RAW photo, hyper-realistic, 8k resolution, highly detailed, photorealism, cinematic lighting, not illustrated, not cartoon, real photography."
  if (params.style === 'mascote') {
    realismSuffix = "hyper-detailed 3D render, perfectly consistent character, 8k resolution, cinematic lighting, vibrant colors."
  } else if (params.style === 'personagem_cartoon') {
    realismSuffix = "2D flat cartoon illustration, no 3d elements, vector art, smooth lines, clean colors, cartoon aesthetics."
  }
  
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

// ── Upscale — Fal AI ESRGAN (synchronous) ────────────────────────────────
export async function generateUpscale(params: {
  source_url: string
  scale: number
}) {
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY não configurada')

  const res = await fetch('https://fal.run/fal-ai/esrgan', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: params.source_url,
      scale: params.scale ?? 4,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ESRGAN (Fal AI) falhou: ${err}`)
  }

  const data = await res.json()
  const resultUrl = data.image?.url ?? data.images?.[0]?.url
  if (!resultUrl) throw new Error('ESRGAN não retornou URL válida')

  return resultUrl as string
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

  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY não configurada no servidor')

  const fluxSuffix = await getStudioPrompt(
    admin,
    'model_flux_suffix',
    'Shot on iPhone 15 Pro, natural daylight, authentic UGC style. Skin pores and natural imperfections visible. Real human face, photojournalism style, not a studio shoot, not retouched, not illustrated.',
  )
  const fluxPrompt = `Candid portrait photo of a real person: ${text} ${fluxSuffix}`

  const imgRes = await fetch('https://fal.run/fal-ai/flux-pro/v1.1-ultra', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: fluxPrompt,
      aspect_ratio: '9:16',
      output_format: 'jpeg',
      safety_tolerance: '3',
    }),
  })

  // Log error text se Fal falhar
  if (!imgRes.ok) {
    const errText = await imgRes.text()
    throw new Error(`FLUX 1.1 Pro (Fal AI) Error: ${errText}`)
  }

  const imgData = await imgRes.json()
  const tempUrl = imgData.images?.[0]?.url
  if (!tempUrl) throw new Error('FLUX não retornou URL para o modelo na Fal AI')

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

  // Injeta contexto do modelo UGC no prompt de movimento
  const modelContext = params.model_prompt
    ? `Person: ${params.model_prompt.slice(0, 200)}. `
    : ''
  const finalMotion = modelContext + (params.motion_prompt || 'smooth product showcase motion')

  let endpoint = 'https://queue.fal.run/fal-ai/kling-video/o3/pro/image-to-video'
  let payload: any = {
    image_url: params.source_image_url,
    prompt: finalMotion,
    duration: '5',
    aspect_ratio: '9:16',
    webhook_url: webhookUrl,
  }

  // Se o usuário selecionou o motor do Google Veo 3
  if (params.engine === 'veo') {
    endpoint = 'https://queue.fal.run/fal-ai/veo3.1/image-to-video'
    payload = {
      image_url: params.source_image_url,
      prompt: finalMotion,
      duration: '8s', // Veo prefere duracoes fixas como 4s e 8s
      aspect_ratio: '9:16',
      webhook_url: webhookUrl,
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

  // Salva prediction_id para permitir sync manual e rastreamento
  const admin = createAdminClient()
  await admin.from('studio_assets')
    .update({ input_params: { prediction_id: request_id, provider: 'fal', source_image_url: params.source_image_url, motion_prompt: params.motion_prompt, duration: params.duration } })
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

// ── Compose — Virtual Try-On ou Colar Produto ─────────
export async function composeProductScene(params: {
  portrait_url:   string
  product_url:    string
  compose_mode?:  string   // 'try-on' (default), 'overlay', 'prompt'
  position?:      string
  product_scale?: number
  vton_category?: string
  costume_prompt?: string
  assetId:        string
  userId:         string
}): Promise<string> {
  const admin  = createAdminClient()
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY não configurada')

  let resultBuffer: Buffer

  if (params.compose_mode === 'prompt') {
    // ---- MODO VESTIR VIA PROMPT (FLUX-PULID) ----
    const promptValue = params.costume_prompt || 'wearing beautiful clothes'
    const pulidRes = await fetch('https://fal.run/fal-ai/flux-pulid', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `A beautiful portrait of the person, ${promptValue}, perfectly fitted, hyperrealistic photography, 8k resolution, raw photo`,
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
    // ---- MODO OVERLAY (Colar como objeto) ----
    const sharp = (await import('sharp')).default

    // Remove background do produto
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
    const [portraitBuf, productBuf] = await Promise.all([
      portraitRes.arrayBuffer().then(b => Buffer.from(b)),
      productRes.arrayBuffer().then(b => Buffer.from(b)),
    ])

    const portraitMeta = await sharp(portraitBuf).metadata()
    const portraitWidth = portraitMeta.width ?? 1024
    
    const scale = params.product_scale || 0.45
    const productTargetWidth = Math.round(portraitWidth * scale)

    const resizedProductBuf = await sharp(productBuf)
      .resize({ width: productTargetWidth, withoutEnlargement: true })
      .toBuffer()

    let gravity = 'southeast'
    if (params.position === 'south' || params.position?.includes('center')) gravity = 'south'
    if (params.position === 'southwest') gravity = 'southwest'
    if (params.position === 'west') gravity = 'west'
    if (params.position === 'east') gravity = 'east'

    resultBuffer = await sharp(portraitBuf)
      .composite([{ input: resizedProductBuf, gravity }])
      .jpeg({ quality: 95 })
      .toBuffer()

  } else {
    // ---- MODO VIRTUAL TRY-ON (Vestir Roupa) usando IDM-VTON (Native Fetch) ----
    
    // Mapeamos para 'dresses' quando é Corpo Inteiro para garantir calça e blusa
    let idmCategory = 'upper_body'
    if (params.vton_category === 'bottoms') idmCategory = 'lower_body'
    if (params.vton_category === 'one-pieces') idmCategory = 'dresses'

    // Evita rigorosamente que o IDM-VTON ache que 'dresses' é um vestido de mulher com decote.
    // Força o entendimento de que é um "Conjunto/Terno Masculino Fechado"
    let description = `Virtual try-on garment, ${params.vton_category || 'tops'}`
    if (params.vton_category === 'one-pieces') {
      description = `A fully closed masculine outfit, formal suit with pants, completely buttoned coat, chest fully covered by fabric, formal menswear, highly masculine tailoring, strictly male outfit, no cleavage, no skin visible on chest.`
    }

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
    })
  })

  if (!queueRes.ok) {
    const err = await queueRes.text()
    throw new Error(`Fal AI (animate) erro: ${err}`)
  }

  const { request_id } = await queueRes.json()
  if (!request_id) throw new Error('Fal AI não retornou request_id para animate')

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

import sharp from 'sharp'
import { createAdminClient } from '@/lib/supabase/admin'
import { AssetType } from '@/types'

export { CREDIT_COST } from '@/constants/studio'

// ââ Prompt helper â lÃª da tabela studio_prompts, usa fallback hardcoded âââââ
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

// ââ Image â DALL-E 3 via fetch âââââââââââââââââââââââââââââââââââââââââââââ
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
  if (!apiKey) throw new Error('OPENAI_API_KEY nÃ£o configurada')

  const sizeMap: Record<string, string> = {
    '1:1':  '1024x1024',
    '16:9': '1792x1024',
    '9:16': '1024x1792',
  }
  const size = sizeMap[params.aspect_ratio] ?? '1024x1024'

  const STYLE_FALLBACKS: Record<string, string> = {
    realista:   'UGC style ad photo, cinematic lighting, hyper-realistic, 8k, highly detailed, ',
    ugc:        'UGC style ad photo, authentic, shot on phone, candid, real person, photorealistic, 8k, ',
    clonado:    'UGC style ad photo, authentic, real person face, photorealistic, 8k, ',
    produto:    'professional product photography, clean background, studio lighting, hyper-realistic, 8k resolution, ',
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

  // Sulfixo varia se for mascote/cartoon (nÃ£o usar 'real person' em desenhos)
  const isMascotOrCartoon = ['mascote', 'personagem_cartoon'].includes(params.style)
  
  // Suffixos de realismo via Admin
  const realismKey = isMascotOrCartoon ? `image_realism_${params.style}` : 'image_realism_realista'
  const realismFallback = params.style === 'mascote'
    ? "hyper-detailed 3D render, perfectly consistent character, 8k resolution, cinematic lighting, vibrant colors."
    : params.style === 'personagem_cartoon'
      ? "2D flat cartoon illustration, no 3d elements, vector art, smooth lines, clean colors, cartoon aesthetics."
      : "RAW photo, hyper-realistic, 8k resolution, highly detailed, photorealism, cinematic lighting, not illustrated, not cartoon, real photography."
      
  const realismSuffix = await getStudioPrompt(admin, realismKey, realismFallback)
  const finalPrompt = `${basePrompt}. ${realismSuffix}`

  let tempUrl = ''

  if (params.source_face_url && !isMascotOrCartoon) {
    // PuLID - Exclusivo para Humanos
    const falKey = process.env.FAL_KEY
    if (!falKey) throw new Error('FAL_KEY nÃ£o configurada no servidor')

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
        subject_references: [{ image_url: params.source_face_url }],
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
    if (!tempUrl) throw new Error('Fal AI nÃ£o retornou URL')
    
  } else {
    // Fallback ou Mascote â Flux Pro 1.1 Ultra
    const falKey = process.env.FAL_KEY
    if (!falKey) throw new Error('FAL_KEY nÃ£o configurada no servidor')

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
        strength: 0.85,  // MantÃ©m a estrutura principal do mascote recriando o contexto
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
      if (!tempUrl) throw new Error('Flux Image-to-Image nÃ£o retornou URL')
    } else {
      // GeraÃ§Ã£o Pura (Ultra)
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
      if (!tempUrl) throw new Error('Flux Ultra nÃ£o retornou URL')
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

// ââ Script â GPT-4o UGC viral em PT via fetch ââââââââââââââââââââââââââââââ
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
  if (!apiKey) throw new Error('OPENAI_API_KEY nÃ£o configurada')

  const formatGuideStr = await getStudioPrompt(admin, 'script_format_guide', JSON.stringify({
    reels: 'Reels/TikTok (15-30 segundos, hook nos primeiros 3s)',
    story: 'Stories (atÃ© 15 segundos por slide, 3 slides)',
    feed:  'Feed/anÃºncio (30-60 segundos, mais elaborado)',
  }))
  const hookGuideStr = await getStudioPrompt(admin, 'script_hook_guide', JSON.stringify({
    problema: 'comeÃ§e identificando um problema real do pÃºblico',
    resultado: 'comeÃ§e mostrando o resultado incrÃ­vel primeiro',
    pergunta:  'comeÃ§e com uma pergunta provocadora',
    historia:  'comeÃ§e com uma mini histÃ³ria pessoal',
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
            `VocÃª Ã© um especialista em criaÃ§Ã£o de scripts UGC virais para o mercado brasileiro.
Crie scripts autÃªnticos, conversacionais e de alta conversÃ£o. Use linguagem natural e cotidiana do brasileiro.
Inclua indicaÃ§Ãµes de tom, pausas e emoÃ§Ã£o entre colchetes.`,
          )) + ` Formato: ${formatGuide[params.format] ?? formatGuide.reels}.`,
        },
        {
          role: 'user',
          content: `Produto/ServiÃ§o: ${params.product}
PÃºblico-alvo: ${params.audience}
Estilo de hook: ${hookGuide[params.hook_style] ?? hookGuide.problema}

Crie um script UGC completo com:
1. HOOK (primeiros 3 segundos)
2. DESENVOLVIMENTO (problema + soluÃ§Ã£o)
3. PROVA SOCIAL (resultado/depoimento)
4. CTA (call-to-action forte)

Inclua tambÃ©m 3 variaÃ§Ãµes de hook alternativas no final.`,
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

// ââ Voice â ElevenLabs âââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY nÃ£o configurada')

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
  if (error) throw new Error(`Upload Ã¡udio falhou: ${error.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return publicUrl
}

// ââ Caption â Whisper via fetch ââââââââââââââââââââââââââââââââââââââââââââ
export async function generateCaption(params: {
  audio_url: string
  assetId: string
  userId: string
}) {
  const admin = createAdminClient()
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY nÃ£o configurada')

  const audioRes = await fetch(params.audio_url)
  if (!audioRes.ok) throw new Error('NÃ£o foi possÃ­vel baixar o Ã¡udio')
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

// ââ Upscale â Fal AI ESRGAN (synchronous) ââââââââââââââââââââââââââââââââ
export async function generateUpscale(params: {
  source_url: string
  scale: number
}) {
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY nÃ£o configurada')

  const admin = createAdminClient()
  const configStr = await getStudioPrompt(admin, 'upscale_esrgan_config', '{}')
  let config: any = {}
  try { config = JSON.parse(configStr) } catch { /* ignore */ }

  const res = await fetch('https://fal.run/fal-ai/esrgan', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: params.source_url,
      scale: params.scale ?? config.scale ?? 4,
      face_enhance: config.face_enhance ?? true,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ESRGAN (Fal AI) falhou: ${err}`)
  }

  const data = await res.json()
  const resultUrl = data.image?.url ?? data.images?.[0]?.url
  if (!resultUrl) throw new Error('ESRGAN nÃ£o retornou URL vÃ¡lida')

  return resultUrl as string
}

// ââ Model â GPT-4o gera descriÃ§Ã£o visual Ãºnica para UGC âââââââââââââââââââ
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
  if (!apiKey) throw new Error('OPENAI_API_KEY nÃ£o configurada')

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
Vary vocabulary, hair details, facial features, and scene context every response â never repeat.
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

  const googleApiKey = process.env.GOOGLE_API_KEY
  if (!googleApiKey) throw new Error('GOOGLE_API_KEY nÃ£o configurada no servidor')

  const fluxSuffix = await getStudioPrompt(
    admin,
    'model_flux_suffix',
    'Shot on a cinematic phone camera, authentic UGC style. Skin pores and natural imperfections visible. Real human face, authentic lighting, not a studio shoot, not retouched, not illustrated.',
  )
  const finalPrompt = `Candid portrait photo of a real person: ${text} ${fluxSuffix}`

  let photoBuffer: Buffer

  // O motor padrÃ£o volta a ser o GOOGLE (Agora usando o IMAGEN 4.0 ULTRA identificado no diagnÃ³stico)
  if (params.engine === 'google' || !params.engine) {
    // ---- MOTOR GOOGLE IMAGEN 4.0 ULTRA (PadrÃ£o) ----
    const googleApiKey = process.env.GOOGLE_API_KEY
    if (!googleApiKey) throw new Error('GOOGLE_API_KEY nÃ£o configurada no servidor')

    const imgRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${googleApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: finalPrompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '9:16',
          personGeneration: 'ALLOW_ADULT' 
        }
      })
    })

    if (!imgRes.ok) {
      const err = await imgRes.text()
      throw new Error(`Google Imagen 4.0 erro (${imgRes.status}): ${err}`)
    }

    const data = await imgRes.json()
    const base64 = data.predictions?.[0]?.bytesBase64Encoded
    if (!base64) throw new Error('Google Imagen 4.0 nÃ£o retornou imagem. Verifique logs.')

    photoBuffer = Buffer.from(base64, 'base64')

  } else {
    // ---- MOTOR FLUX PRO 1.1 ULTRA (Opcional/Alternativo) ----
    const falKey = process.env.FAL_KEY
    if (!falKey) throw new Error('FAL_KEY nÃ£o configurada no servidor')

    const res = await fetch('https://fal.run/fal-ai/flux-pro/v1.1-ultra', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        aspect_ratio: '9:16',
        output_format: 'jpeg',
        safety_tolerance: '3',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Flux Ultra (Model) erro: ${err}`)
    }

    const data = await res.json()
    const tempUrl = data.images?.[0]?.url
    if (!tempUrl) throw new Error('Flux Ultra nÃ£o retornou URL')

    const imgRes = await fetch(tempUrl)
    photoBuffer = Buffer.from(await imgRes.arrayBuffer())
  }

  const path = `${params.userId}/${params.assetId}-model.jpg`
  const { error } = await admin.storage
    .from('studio')
    .upload(path, photoBuffer, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(`Upload foto modelo falhou: ${error.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return { url: publicUrl, text }
}

// ââ Video â Kling AI via Fal AI (async â usa webhook) ââââââââââââââââââ
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
  if (!falKey) throw new Error('FAL_KEY nÃ£o configurada no servidor')

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

  let endpoint = 'https://queue.fal.run/fal-ai/kling-video/v1.5/pro/image-to-video'
  let payload: any = {
    image_url: params.source_image_url,
    prompt: finalMotion,
    duration: config.duration || '5',
    aspect_ratio: '9:16',
    webhook_url: webhookUrl,
    ...config // Permite sobrescrever qualquer parÃ¢metro via JSON Admin
  }

  // Se o usuÃ¡rio selecionou o motor do Google Veo 3
  if (params.engine === 'veo') {
    endpoint = 'https://queue.fal.run/fal-ai/veo3.1/image-to-video'
    payload = {
      image_url: params.source_image_url,
      prompt: finalMotion,
      duration: config.veo_duration || '8s', 
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
    throw new Error(`Fal AI erro ao enfileirar vÃ­deo Kling: ${err}`)
  }

  const { request_id } = await queueRes.json()
  if (!request_id) throw new Error('Fal AI nÃ£o retornou request_id para video')

  // Salva prediction_id para permitir sync manual e rastreamento
  await admin.from('studio_assets')
    .update({ input_params: { prediction_id: request_id, provider: 'fal', engine: params.engine ?? 'kling', source_image_url: params.source_image_url, motion_prompt: params.motion_prompt, duration: params.duration } })
    .eq('id', params.assetId)
}

// ââ Render â merge Ã¡udio + vÃ­deo via Replicate ââââââââââââââââââââââââââââ
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
          '-c:a', 'aac',        // encoder compatÃ­vel pra audio
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

// Helper: executa fn com retry automÃ¡tico em caso de 429 (respeita retry_after)
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

// ââ Compose â Virtual Try-On ou Colar Produto âââââââââ
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
  if (!falKey) throw new Error('FAL_KEY nÃ£o configurada')

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
        subject_references: [
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
    if (!finalUrl) throw new Error('Flux Prompt nÃ£o retornou imagem vÃ¡lida.')

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
    
    // Mapeamos para 'dresses' quando Ã© Corpo Inteiro para garantir calÃ§a e blusa
    let idmCategory = 'upper_body'
    if (params.vton_category === 'bottoms') idmCategory = 'lower_body'
    if (params.vton_category === 'one-pieces') idmCategory = 'dresses'

    // Evita rigorosamente que o IDM-VTON ache que 'dresses' Ã© um vestido de mulher com decote.
    // ForÃ§a o entendimento de que Ã© um "Conjunto/Terno Masculino Fechado"
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
    if (!vtonImageUrl) throw new Error('IDM-VTON nÃ£o retornou imagem vÃ¡lida.')

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

// ââ Lip Sync â Fal AI SyncLabs 2.0 Pro (assÃ­ncrono via webhook) ââââââââââââââââââââââââ
export async function startLipsyncGeneration(params: {
  face_url:  string
  audio_url: string
  assetId:   string
  userId:    string
  appUrl:    string
}) {
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY nÃ£o configurada no servidor')

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
  if (!request_id) throw new Error('Fal AI nÃ£o retornou request_id')

  // Salva request_id para o webhook identificar depois
  await admin.from('studio_assets')
    .update({ input_params: { face_url: params.face_url, audio_url: params.audio_url, prediction_id: request_id } })
    .eq('id', params.assetId)
}

// ââ Animate â Fal AI live-portrait (sÃ­ncrono â mesma estratÃ©gia do Lip Sync) â
export async function startAnimateGeneration(params: {
  portrait_image_url: string
  driving_video_url: string
  assetId: string
  appUrl: string
  userId: string
}) {
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY nÃ£o configurada no servidor')

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
  if (!request_id) throw new Error('Fal AI nÃ£o retornou request_id para animate')

  // Salva prediction_id para permitir sync manual caso o polling expire
  await admin.from('studio_assets')
    .update({ input_params: { prediction_id: request_id, portrait_image_url: params.portrait_image_url, driving_video_url: params.driving_video_url } })
    .eq('id', params.assetId)

  // 2. Polling sÃ­ncrono â atÃ© 240s
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

  // 3. Re-upload para Supabase â URL Fal AI expira apÃ³s horas
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

// ââ Join â Costura de vÃ­deos via FFmpeg (Fase 3) âââââââââââââââââââââââââââ
export async function joinVideos(params: {
  video_urls: string[]   // array ordenado de URLs de vÃ­deo
  assetId:    string
  userId:     string
}) {
  if (params.video_urls.length < 2) throw new Error('MÃ­nimo de 2 vÃ­deos para unir')

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
    // 1. Download de cada vÃ­deo para /tmp
    for (let i = 0; i < params.video_urls.length; i++) {
      const url = params.video_urls[i]
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Falha ao baixar vÃ­deo ${i + 1}: ${res.status}`)
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
    // Limpa arquivos temporÃ¡rios
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignora */ }
  }
}

// ââ Veo3 â Google Generative AI direto (sem Fal AI) ââââââââââââââââââââââââââ
export async function startVeo3DirectGoogle(params: {
  source_image_url: string
  motion_prompt:    string
  assetId:          string
  userId:           string
}) {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GOOGLE_API_KEY nÃ£o configurada no servidor')

  const admin = createAdminClient()

  // 1. Baixa imagem e converte para base64 (Google API nÃ£o aceita URLs externas)
  const imgRes = await fetch(params.source_image_url)
  if (!imgRes.ok) throw new Error('Falha ao baixar imagem fonte para Veo3 Google')
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
  const base64Image = imgBuffer.toString('base64')
  const mimeType = imgRes.headers.get('content-type') ?? 'image/jpeg'

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
          aspectRatio: '9:16',
          personGeneration: 'ALLOW_ADULT'
        },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google Veo3 erro (${res.status}): ${err.slice(0, 400)}`)
  }

  const body = await res.json()
  const operationName = body.name
  if (!operationName) throw new Error('Google Veo3 nÃ£o retornou operationName')

  // 3. Salva operationName para polling manual via botÃ£o "ForÃ§ar atualizaÃ§Ã£o"
  await admin.from('studio_assets')
    .update({
      input_params: {
        prediction_id: operationName,
        provider: 'google',
        engine: 'veo',
        source_image_url: params.source_image_url,
        motion_prompt: params.motion_prompt,
      }
    })
    .eq('id', params.assetId)
}

// ââ Image-to-Image (Angles / Poses) ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export async function generateAngles(params: {
  source_url: string
  angle: string
  engine?: string
  assetId: string
  userId: string
}) {
  const admin = createAdminClient()
  const engine = params.engine ?? 'flux'
  
  const angleMap: Record<string, string> = {
    frontal: 'frontal shot, looking directly at the camera, symmetric composition',
    profile: 'side profile shot, face turned 90 degrees away from the camera',
    closeup: 'extreme close-up macro shot of the face details',
    wide:    'extreme wide angle, full body shot showing the entire outfit and environment',
    back:    'shot from behind, back facing the camera, turning away',
  }

  const perspective = angleMap[params.angle] || angleMap['frontal']
  // Identificacao automatica de genero via Gemini Vision para garantir consistencia
  let detectedGender = 'person'
  try {
    const visionRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Just one word: Is the person in this image Male or Female?" },
            { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
          ]
        }]
      })
    })
    const visionData = await visionRes.json()
    const text = visionData.candidates?.[0]?.content?.parts?.[0]?.text?.toLowerCase() || ''
    if (text.includes('female') || text.includes('woman')) detectedGender = 'woman'
    else if (text.includes('male') || text.includes('man')) detectedGender = 'man'
  } catch (e) {
    console.warn('[studio] Falha na auto-detencao de genero, usando generico:', e)
  }

  const prompt = `Maintain EXACT identity, EXACT same clothes, hair color, and facial features. Switch camera to ${params.angle} view. Full consistency of the ${detectedGender} is mandatory. Maintain ${detectedGender} gender. Photorealistic. ${perspective}. 8k resolution, cinematic lighting.`


  console.log(`[studio] Gerando Angulo [${engine}] para asset ${params.assetId}. URL: ${params.source_url.slice(0, 50)}...`)

  let photoBuffer: Buffer

  const { data: fallbackSet } = await admin.from('studio_prompts').select('value').eq('key', 'angles_fallback_active').single()
  const allowFallback = fallbackSet?.value === 'true'

  if (engine === 'google') {
    try {
      // ---- GOOGLE IMAGEN 4.0 (SUBJECT CONTROL) ----
      const googleApiKey = process.env.GOOGLE_API_KEY
      if (!googleApiKey) throw new Error('GOOGLE_API_KEY nÃ£o configurada no servidor')

      // 1. Download base image
      if (!params.source_url || !params.source_url.startsWith('http')) {
        throw new Error('URL da imagem fonte invÃ¡lida para o Imagen')
      }

      const imgRes = await fetch(params.source_url)
      if (!imgRes.ok) throw new Error(`Erro download: ${imgRes.status}`)
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
      const base64Image = imgBuffer.toString('base64')

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${googleApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{
            prompt,
            subject_references: [{
              subject_id: 1,
              reference_image: {
                image: { 
                  mime_type: 'image/jpeg',
                  bytes_base_64_encoded: base64Image
                }
              }
            }]
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "9:16",
            seed: 42
          }
        })
      })

      const data = await res.json()
      const base64 = data.predictions?.[0]?.bytesBase64Encoded
      if (!base64) throw new Error('Imagem nÃ£o retornada pelo Google')
      photoBuffer = Buffer.from(base64, 'base64')

    } catch (googleError: any) {
      if (!allowFallback) {
        throw googleError // Se a retentiva estiver desligada, joga o erro real do Google na tela
      }

      console.error("[studio] Erro Google Imagen, migrando para FLUX de seguranÃ§a...", googleError.message)
      // Se o Google der qualquer erro (400, 404, etc), usamos o motor FLUX pra nÃ£o deixar o usuÃ¡rio na mÃ£o
      const falKey = process.env.FAL_KEY
      if (!falKey) throw new Error('FAL_KEY nÃ£o configurada para fallback')

      const res = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
        method: 'POST',
        headers: {
          'Authorization': `Key ${falKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: params.source_url,
          prompt: prompt,
          strength: 0.85, 
          output_format: 'jpeg',
        }),
      })

      if (!res.ok) throw new Error(`Falha total em ambos os motores: ${await res.text()}`)
      const data = await res.json()
      const imageUrl = data.images?.[0]?.url
      if (!imageUrl) throw new Error('Nenhum motor conseguiu gerar a imagem')

      const imgDl = await fetch(imageUrl)
      photoBuffer = Buffer.from(await imgDl.arrayBuffer())
    }

  } else {
    // ---- FLUX DEV (IMAGE-TO-IMAGE) ----
    const falKey = process.env.FAL_KEY
    if (!falKey) throw new Error('FAL_KEY nÃ£o configurada no servidor')

    const res = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: params.source_url,
        prompt: prompt,
        strength: 0.85, 
        output_format: 'jpeg',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Falha ao gerar nova perspectiva (Flux i2i): ${err}`)
    }

    const data = await res.json()
    const imageUrl = data.images?.[0]?.url
    if (!imageUrl) throw new Error('NÃ£o foi possÃ­vel obter a URL da nova imagem (Flux)')

    const imgDl = await fetch(imageUrl)
    photoBuffer = Buffer.from(await imgDl.arrayBuffer())
  }

  // Define caminho e sobe pro Storage
  const storagePath = `${params.userId}/${params.assetId}-angle.jpg`
  const { error } = await admin.storage
    .from('studio')
    .upload(storagePath, photoBuffer, { contentType: 'image/jpeg', upsert: true })

  if (error) throw new Error(`Falha no Storage (Angles): ${error.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(storagePath)
  return publicUrl
}

/ * * 
 
   *   G e r a   t r i l h a   s o n o r a   u s a n d o   G o o g l e   L y r i a   3 
 
   * / 
 
 e x p o r t   a s y n c   f u n c t i o n   g e n e r a t e M u s i c ( p a r a m s :   { 
 
     u s e r I d :   s t r i n g 
 
     a s s e t I d :   s t r i n g 
 
     p r o m p t :   s t r i n g 
 
     s o u r c e _ i m a g e _ u r l ? :   s t r i n g 
 
 } )   { 
 
     c o n s t   g o o g l e A p i K e y   =   p r o c e s s . e n v . G O O G L E _ A P I _ K E Y 
 
     i f   ( ! g o o g l e A p i K e y )   t h r o w   n e w   E r r o r ( ' G O O G L E _ A P I _ K E Y   n Ã £ o   c o n f i g u r a d a   n o   s e r v i d o r ' ) 
 
 
 
     c o n s t   p a r t s :   a n y [ ]   =   [ {   t e x t :   p a r a m s . p r o m p t   } ] 
 
 
 
     / /   A d i c i o n a   i m a g e m   s e   h o u v e r   ( M u l t i m o d a l   -   I n s p i r a Ã § Ã £ o   v i s u a l   p a r a   a   m Ã º s i c a ) 
 
     i f   ( p a r a m s . s o u r c e _ i m a g e _ u r l )   { 
 
         t r y   { 
 
             c o n s t   i m g R e s   =   a w a i t   f e t c h ( p a r a m s . s o u r c e _ i m a g e _ u r l ) 
 
             i f   ( i m g R e s . o k )   { 
 
                 c o n s t   b u f f e r   =   B u f f e r . f r o m ( a w a i t   i m g R e s . a r r a y B u f f e r ( ) ) 
 
                 p a r t s . p u s h ( { 
 
                     i n l i n e _ d a t a :   { 
 
                         m i m e _ t y p e :   ' i m a g e / j p e g ' , 
 
                         d a t a :   b u f f e r . t o S t r i n g ( ' b a s e 6 4 ' ) 
 
                     } 
 
                 } ) 
 
             } 
 
         }   c a t c h   ( e )   { 
 
             c o n s o l e . w a r n ( ' [ s t u d i o ]   F a l h a   a o   b a i x a r   i m a g e m   p a r a   L y r i a   ( M u l t i m o d a l ) : ' ,   e ) 
 
         } 
 
     } 
 
 
 
     c o n s o l e . l o g ( ` [ s t u d i o ]   G e r a n d o   M Ã º s i c a   [ L y r i a   3 ]   p a r a   a s s e t   $ { p a r a m s . a s s e t I d } .   M u l t i m o d a l ?   $ { ! ! p a r a m s . s o u r c e _ i m a g e _ u r l } ` ) 
 
 
 
     c o n s t   r e s   =   a w a i t   f e t c h ( ` h t t p s : / / g e n e r a t i v e l a n g u a g e . g o o g l e a p i s . c o m / v 1 b e t a / m o d e l s / l y r i a - 3 - c l i p - p r e v i e w : g e n e r a t e C o n t e n t ? k e y = $ { g o o g l e A p i K e y } ` ,   { 
 
         m e t h o d :   ' P O S T ' , 
 
         h e a d e r s :   {   ' C o n t e n t - T y p e ' :   ' a p p l i c a t i o n / j s o n '   } , 
 
         b o d y :   J S O N . s t r i n g i f y ( { 
 
             c o n t e n t s :   [ {   p a r t s   } ] 
 
         } ) 
 
     } ) 
 
 
 
     i f   ( ! r e s . o k )   { 
 
         c o n s t   e r r   =   a w a i t   r e s . t e x t ( ) 
 
         t h r o w   n e w   E r r o r ( ` E r r o   L y r i a   3   ( $ { r e s . s t a t u s } ) :   $ { e r r } ` ) 
 
     } 
 
 
 
     c o n s t   d a t a   =   a w a i t   r e s . j s o n ( ) 
 
     
 
     / /   O   L y r i a   r e t o r n a   o   Ã ¡ u d i o   e m   u m   d o s   p a r t s   c o m o   i n l i n e _ d a t a   ( b a s e 6 4 ) 
 
     l e t   a u d i o D a t a :   B u f f e r   |   n u l l   =   n u l l 
 
     c o n s t   c a n d i d a t e s   =   d a t a . c a n d i d a t e s   | |   [ ] 
 
     i f   ( c a n d i d a t e s . l e n g t h   >   0 )   { 
 
         c o n s t   p a r t s A r r a y   =   c a n d i d a t e s [ 0 ] . c o n t e n t ? . p a r t s   | |   [ ] 
 
         f o r   ( c o n s t   p a r t   o f   p a r t s A r r a y )   { 
 
             i f   ( p a r t . i n l i n e D a t a )   { 
 
                 a u d i o D a t a   =   B u f f e r . f r o m ( p a r t . i n l i n e D a t a . d a t a ,   ' b a s e 6 4 ' ) 
 
                 b r e a k 
 
             } 
 
         } 
 
     } 
 
 
 
     i f   ( ! a u d i o D a t a )   t h r o w   n e w   E r r o r ( ' L y r i a   3   n Ã £ o   r e t o r n o u   o   a r q u i v o   d e   Ã ¡ u d i o .   V e r i f i q u e   s u a   q u o t a / p r o m p t . ' ) 
 
 
 
     c o n s t   p a t h   =   ` $ { p a r a m s . u s e r I d } / $ { p a r a m s . a s s e t I d } - a u d i o . m p 3 ` 
 
     c o n s t   a d m i n   =   c r e a t e A d m i n C l i e n t ( ) 
 
     c o n s t   {   e r r o r   }   =   a w a i t   a d m i n . s t o r a g e 
 
         . f r o m ( ' s t u d i o ' ) 
 
         . u p l o a d ( p a t h ,   a u d i o D a t a ,   {   c o n t e n t T y p e :   ' a u d i o / m p e g ' ,   u p s e r t :   t r u e   } ) 
 
 
 
     i f   ( e r r o r )   t h r o w   n e w   E r r o r ( ` F a l h a   n o   u p l o a d   d a   m Ã º s i c a :   $ { e r r o r . m e s s a g e } ` ) 
 
 
 
     c o n s t   {   d a t a :   {   p u b l i c U r l   }   }   =   a d m i n . s t o r a g e . f r o m ( ' s t u d i o ' ) . g e t P u b l i c U r l ( p a t h ) 
 
     r e t u r n   p u b l i c U r l 
 
 } 
 
 
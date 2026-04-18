// FORCE_REBUILD_ID: 2716873455033918919
import sharp from 'sharp'
import { VertexAI } from '@google-cloud/vertexai'
import { createAdminClient } from '@/lib/supabase/admin'
import { AssetType } from '@/types'

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

  // Sulfixo varia se for mascote/cartoon (não usar 'real person' em desenhos)
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

// ── Upscale — Fal AI ESRGAN (synchronous) ────────────────────────────────
export async function generateUpscale(params: {
  source_url: string
  scale: number
}) {
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY não configurada')

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
    'Shot on a cinematic phone camera, authentic UGC style. Skin pores and natural imperfections visible. Real human face, authentic lighting, not a studio shoot, not retouched, not illustrated.',
  )
  const finalPrompt = `Candid portrait photo of a real person: ${text} ${fluxSuffix}`

  let photoBuffer: Buffer | null = null

  if (params.engine === 'google' || !params.engine) {
    try {
      const vertexKey = process.env.GOOGLE_VERTEX_KEY
      const projectId = process.env.VERTEX_PROJECT_ID || 'project-9e7b4eec-0111-46d8-ae0'
      const location = process.env.VERTEX_LOCATION || 'us-central1'

      if (vertexKey) {
        console.log(`[studio] Usando Vertex AI Enterprise (UGC Model) para asset ${params.assetId}...`)
        const vertexToken = await getVertexAccessToken(vertexKey)
        const vertexUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagegeneration@006:predict`

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
              personGeneration: 'allow_adult'
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
      const googleApiKey = process.env.GOOGLE_API_KEY
      if (!googleApiKey) throw new Error('GOOGLE_API_KEY não configurada no servidor')

      const imgRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${googleApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: finalPrompt }],
          parameters: {
            sample_count: 1,
            aspect_ratio: '9:16',
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
    if (!tempUrl) throw new Error('Flux Ultra não retornou URL')

    const imgRes = await fetch(tempUrl)
    photoBuffer = Buffer.from(await imgRes.arrayBuffer())
  }

  if (!photoBuffer) throw new Error('Falha ao gerar o buffer da foto do modelo.')

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
    ...config // Permite sobrescrever qualquer parâmetro via JSON Admin
  }

  // Se o usuário selecionou o motor do Google Veo 3
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
    throw new Error(`Fal AI erro ao enfileirar vídeo Kling: ${err}`)
  }

  const { request_id } = await queueRes.json()
  if (!request_id) throw new Error('Fal AI não retornou request_id para video')

  // Salva prediction_id para permitir sync manual e rastreamento
  await admin.from('studio_assets')
    .update({ input_params: { prediction_id: request_id, provider: 'fal', engine: params.engine ?? 'kling', source_image_url: params.source_image_url, motion_prompt: params.motion_prompt, duration: params.duration } })
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

// ── Veo3 — Google Generative AI direto (sem Fal AI) ──────────────────────────
export async function startVeo3DirectGoogle(params: {
  source_image_url: string
  motion_prompt:    string
  assetId:          string
  userId:           string
}) {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GOOGLE_API_KEY não configurada no servidor')

  const admin = createAdminClient()

  // 1. Baixa imagem e converte para base64 (Google API não aceita URLs externas)
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
  if (!operationName) throw new Error('Google Veo3 não retornou operationName')

  // 3. Salva operationName para polling manual via botão "Forçar atualização"
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
    frontal: 'frontal shot, looking directly at the camera, symmetric composition, consistent facial identity',
    profile: 'side profile shot, face turned 90 degrees away from the camera, consistent facial features',
    closeup: 'extreme close-up macro shot of the face details, maintaining skin texture and eye color',
    wide:    'extreme wide angle, full body shot, maintaining body proportions and clothing',
    back:    'shot from behind, back facing the camera, turning away, but maintaining the same hair style, hair color and gender silhouette',
  }

  const perspective = angleMap[params.angle] || angleMap['frontal']
  
  const googleApiKey = process.env.GOOGLE_API_KEY
  if (!googleApiKey) throw new Error('GOOGLE_API_KEY não configurada no servidor')

  // 1. Download base image
  if (!params.source_url || !params.source_url.startsWith('http')) {
    throw new Error('URL da imagem fonte inválida para o Imagen')
  }
  const imgResSource = await fetch(params.source_url)
  if (!imgResSource.ok) throw new Error(`Erro download: ${imgResSource.status}`)
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
    // Descreve a roupa atual via Gemini Vision para ancorar o prompt
    let appearanceDesc = ''
    try {
      const descRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: 'Describe ONLY the clothing and outfit of the person in this image. Be specific: colors, fabric, garment names. Max 2 sentences.' },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
            ]
          }]
        })
      })
      const descData = await descRes.json()
      appearanceDesc = descData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } catch { /* silent */ }

    const finalPrompt = [
      `A photorealistic UGC photo of the ${detectedGender} {subject_id: 1}.`,
      appearanceDesc ? `The ${detectedGender} is wearing: ${appearanceDesc}.` : '',
      `Change ONLY the camera angle to ${params.angle} view (${perspective}).`,
      `Preserve EXACTLY: same ${detectedGender} face, same hair color and style, same outfit and every clothing item with exact colors and patterns.`,
      `DO NOT change gender. MUST be a ${detectedGender}.`,
      `Photorealistic UGC photo, 8k, cinematic lighting.`,
    ].filter(Boolean).join(' ')

    try {
      const vertexKey = process.env.GOOGLE_VERTEX_KEY
        const projectId = process.env.VERTEX_PROJECT_ID || 'project-9e7b4eec-0111-46d8-ae0'
        const location = process.env.VERTEX_LOCATION || 'us-central1'

        if (!vertexKey) throw new Error('GOOGLE_VERTEX_KEY não encontrada. Vertex AI é obrigatório.')

      console.log(`[studio] Chamando Vertex AI Enterprise (PURO) para asset ${params.assetId}...`)
      
      const vertexRes = await fetch(vertexUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vertexToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{
            prompt: `Photo of <character_1>, a photorealistic UGC style shot. ${prompt}. MUST be the same person from <character_1>. Angle: ${params.angle}.`,
            // Usando o formato direto de referência única sugerido
            reference_image: {
              bytesBase64Encoded: base64Image,
              mimeType: 'image/jpeg'
            },
            reference_strength: 0.99,
            negative_prompt: detectedGender === 'woman' 
              ? `man, male, boy, masculine, facial hair, bearded, messy hair` 
              : `woman, female, girl, feminine, biological woman, long hair, makeup`
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: params.aspect_ratio === '1:1' ? '1:1' : '9:16',
            seed: 42,
            safetyFilterLevel: 'BLOCK_ONLY_HIGH',
            personGenerationConfig: {
              allowAdultContent: true,
              preserveIdentity: true,
              preserveFaceFeatures: true,
              preserveBodyShape: true
            }
          }
        })
      })

      if (!vertexRes.ok) {
        const errBody = await vertexRes.text()
        console.error('[studio] ERRO VERDADEIRO DO VERTEX:', errBody)
        throw new Error(`Vertex AI Error (${vertexRes.status}): ${errBody}`)
      }

      const vertexData = await vertexRes.json()
      const base64Res = vertexData.predictions?.[0]?.bytesBase64Encoded
      if (!base64Res) {
        console.error('[studio] Vertex não retornou imagem. Raw:', JSON.stringify(vertexData))
        throw new Error('Response do Vertex não contém bytesBase64Encoded.')
      }
      photoBuffer = Buffer.from(base64Res, 'base64')

    } catch (vertexError: any) {
      console.error('[studio] Falha definitiva no Vertex AI (SEM FALLBACK):', vertexError.message)
      throw vertexError
    }
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
    const { GoogleAuth } = require('google-auth-library')
    
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
  const googleApiKey = process.env.GOOGLE_API_KEY
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
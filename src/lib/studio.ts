// FORCE_REBUILD_ID: 2716873455033918919
import { VertexAI } from '@google-cloud/vertexai'
import { GoogleAuth } from 'google-auth-library'
import { createAdminClient } from '@/lib/supabase/admin'
import { markStudioAssetFailed } from '@/lib/studioAssetFailure'
import { AssetType } from '@/types'
import { extractLastFrame as extractVideoFrame, saveLastFrame } from './videoUtils'
import { assessCompositionQuality, CompositionQuality, ProductProfile } from '@/lib/openai'
import { synthesizeGoogleSpeech, transcribeGoogleAudio } from '@/lib/googleCloudMedia'
import { fetchGoogleGenerateContent, fetchGooglePredict, fetchGooglePredictLongRunning } from '@/lib/googleGenai'
import {
  estimateTalkingSpeechDurationSeconds,
  normalizeTalkingWhitespace,
  parseTalkingVideoIdeaInput,
} from './talkingVideoIdea'

export { CREDIT_COST } from '@/constants/studio'
export { estimateTalkingSpeechDurationSeconds } from './talkingVideoIdea'

async function fetchStudioGoogleGenerateContent(
  model: string,
  body: string | Record<string, unknown>,
  feature: string,
): Promise<Response> {
  return fetchGoogleGenerateContent({
    model,
    feature: `studio:${feature}`,
    body,
  })
}

async function fetchStudioGooglePredict(
  model: string,
  body: string | Record<string, unknown>,
  feature: string,
): Promise<Response> {
  return fetchGooglePredict({
    model,
    feature: `studio:${feature}`,
    body,
  })
}

async function fetchStudioGooglePredictLongRunning(
  model: string,
  body: string | Record<string, unknown>,
  feature: string,
): Promise<Response> {
  return fetchGooglePredictLongRunning({
    model,
    feature: `studio:${feature}`,
    body,
  })
}

const nativeFetch = globalThis.fetch.bind(globalThis)

async function studioScopedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof input === 'string') {
    const generateContentMatch = input.match(/^https:\/\/generativelanguage\.googleapis\.com\/v1(?:alpha|beta)\/models\/([^:]+):generateContent\?key=/)
    if (generateContentMatch) {
      const model = decodeURIComponent(generateContentMatch[1] ?? '').trim()
      return fetchStudioGoogleGenerateContent(model, typeof init?.body === 'string' ? init.body : '', 'auto-routed-generate-content')
    }

    const predictMatch = input.match(/^https:\/\/generativelanguage\.googleapis\.com\/v1(?:alpha|beta)\/models\/([^:]+):predict\?key=/)
    if (predictMatch) {
      const model = decodeURIComponent(predictMatch[1] ?? '').trim()
      return fetchStudioGooglePredict(model, typeof init?.body === 'string' ? init.body : '', 'auto-routed-predict')
    }

    const predictLongRunningMatch = input.match(/^https:\/\/generativelanguage\.googleapis\.com\/v1(?:alpha|beta)\/models\/([^:]+):predictLongRunning\?key=/)
    if (predictLongRunningMatch) {
      const model = decodeURIComponent(predictLongRunningMatch[1] ?? '').trim()
      return fetchStudioGooglePredictLongRunning(model, typeof init?.body === 'string' ? init.body : '', 'auto-routed-predict-long-running')
    }
  }

  return nativeFetch(input, init)
}

const fetch = studioScopedFetch

// â”€â”€ Prompt helper â€” lÃª da tabela studio_prompts, usa fallback hardcoded â”€â”€â”€â”€â”€
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

// â”€â”€ Image â€” DALL-E 3 via fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // Sulfixo varia se for mascote/cartoon (nÃ£o usar 'real person' em desenhos)
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
    if (!tempUrl) throw new Error('Fal AI nÃ£o retornou URL')
    
  } else {
    // Fallback ou Mascote â€” Flux Pro 1.1 Ultra
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

function extractGoogleTextCandidate(data: any): string {
  return (data?.candidates?.[0]?.content?.parts ?? [])
    .map((part: { text?: string }) => (typeof part?.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim()
}

export async function generateImageGoogle(params: {
  prompt: string
  style: string
  aspect_ratio: string
  model_prompt?: string
  source_face_url?: string
  assetId: string
  userId: string
}) {
  const admin = createAdminClient()
  const vertexKey = process.env.GOOGLE_VERTEX_KEY
  if (!vertexKey) throw new Error('GOOGLE_VERTEX_KEY nao configurada')
  if (params.source_face_url?.trim()) {
    throw new Error('A variante com referencia facial deste card ainda dependia de um fallback legado. Nesta fase Google-first, gere sem face clone ou use o card Modelo.')
  }

  const styleFallbacks: Record<string, string> = {
    realista: 'UGC style ad photo, shot on film, shot on Hasselblad H6D, Zeiss Otus 85mm f/1.4 lens, Kodak Portra 400, film grain, cinematic lighting, hyper-realistic, 8k, highly detailed, ',
    ugc: 'UGC style ad photo, shot on film, shot on Hasselblad H6D, Zeiss Otus 85mm f/1.4 lens, authentic, candid, real person, photorealistic, film grain, natural depth of field, 8k, ',
    clonado: 'UGC style ad photo, shot on film, shot on Hasselblad H6D, Zeiss Otus 85mm f/1.4 lens, authentic, real person face, photorealistic, 8k, ',
    produto: 'professional product photography, shot on film, shot on Phase One IQ4 150MP, Zeiss Milvus 100mm f/2M lens, clean background, studio lighting, hyper-realistic, 8k resolution, ',
    logo: 'professional logo design, clean vector style, transparent background, minimalist, ',
    mascote: '3D animated mascot, anthropomorphic character, cinematic lighting, highly detailed 3D render, Pixar style, ',
    cartoon: 'Cartoon Network style, 2D flat animation, vibrant colors, bold outlines, stylized character design, solid color background, ',
    aleatoria: 'lifestyle photography, natural light, aspirational, photorealism, cinematic lighting, ',
  }
  const stylePrefix = await getStudioPrompt(
    admin,
    `image_style_${params.style}`,
    styleFallbacks[params.style] ?? styleFallbacks.aleatoria,
  )
  const basePrompt = params.model_prompt
    ? `${params.model_prompt}. ${stylePrefix}${params.prompt}`
    : stylePrefix + params.prompt
  const isMascotOrCartoon = ['mascote', 'personagem_cartoon', 'cartoon'].includes(params.style)
  const realismSuffix = await getStudioPrompt(
    admin,
    isMascotOrCartoon ? `image_realism_${params.style}` : 'image_realism_realista',
    isMascotOrCartoon
      ? '2D/3D stylized commercial art with clean edges, premium rendering, high detail.'
      : 'RAW photo, shot on film, shot on Hasselblad H6D, Zeiss Otus 85mm f/1.4 lens, Kodak Portra 400, hyper-realistic, 8k resolution, highly detailed, photorealism, cinematic lighting, film grain, natural depth of field.',
  )
  const finalPrompt = `${basePrompt}. ${realismSuffix}`
  const projectId = process.env.VERTEX_PROJECT_ID || 'project-9e7b4eec-0111-46d8-ae0'
  const location = process.env.VERTEX_LOCATION || 'us-central1'
  const vertexToken = await getVertexAccessToken(vertexKey)
  const response = await fetch(`https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-4.0-generate-001:predict`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${vertexToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ prompt: finalPrompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: params.aspect_ratio || '9:16',
        personGeneration: isMascotOrCartoon ? undefined : 'allow_adult',
        negativePrompt: [
          'watermark',
          'text overlay',
          'extra limbs',
          'cropped body',
          'distorted face',
        ].join(', '),
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Vertex Imagen erro (${response.status}): ${await response.text()}`)
  }

  const payload = await response.json()
  const base64 = payload.predictions?.[0]?.bytesBase64Encoded
  if (!base64) throw new Error('Vertex Imagen nao retornou imagem.')

  const path = `${params.userId}/${params.assetId}.jpg`
  const { error: uploadErr } = await admin.storage
    .from('studio')
    .upload(path, Buffer.from(base64, 'base64'), { contentType: 'image/jpeg', upsert: true })
  if (uploadErr) throw new Error(`Upload falhou: ${uploadErr.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return publicUrl
}

export async function generateScriptGoogle(params: {
  product: string
  audience: string
  format: string
  hook_style: string
  assetId: string
  userId: string
}) {
  const admin = createAdminClient()
  const formatGuideStr = await getStudioPrompt(admin, 'script_format_guide', JSON.stringify({
    reels: 'Reels/TikTok (15-30 segundos, hook nos primeiros 3s)',
    story: 'Stories (ate 15 segundos por slide, 3 slides)',
    feed: 'Feed/anuncio (30-60 segundos, mais elaborado)',
  }))
  const hookGuideStr = await getStudioPrompt(admin, 'script_hook_guide', JSON.stringify({
    problema: 'comece identificando um problema real do publico',
    resultado: 'comece mostrando o resultado incrivel primeiro',
    pergunta: 'comece com uma pergunta provocadora',
    historia: 'comece com uma mini historia pessoal',
  }))

  let formatGuide: Record<string, string> = {}
  let hookGuide: Record<string, string> = {}
  try { formatGuide = JSON.parse(formatGuideStr) as Record<string, string> } catch {}
  try { hookGuide = JSON.parse(hookGuideStr) as Record<string, string> } catch {}

  const response = await fetchGoogleGenerateContent({
    model: 'gemini-2.5-flash',
    feature: 'studio-script-generation',
    body: {
      systemInstruction: {
        parts: [{
          text: (await getStudioPrompt(
            admin,
            'script_generation_system',
            'Voce e um especialista em criacao de scripts UGC virais para o mercado brasileiro. Crie scripts autenticos, conversacionais e de alta conversao. Inclua indicacoes de tom, pausas e emocao entre colchetes.',
          )) + ` Formato: ${formatGuide[params.format] ?? formatGuide.reels ?? params.format}.`,
        }],
      },
      contents: [{
        role: 'user',
        parts: [{
          text: `Produto/Servico: ${params.product}
Publico-alvo: ${params.audience}
Estilo de hook: ${hookGuide[params.hook_style] ?? hookGuide.problema ?? params.hook_style}

Crie um script UGC completo com:
1. HOOK
2. DESENVOLVIMENTO
3. PROVA SOCIAL
4. CTA

Inclua tambem 3 variacoes de hook alternativas no final.`,
        }],
      }],
      generationConfig: {
        temperature: 0.8,
      },
    },
  })

  if (!response.ok) {
    throw new Error(`Gemini Vertex erro (${response.status}): ${await response.text()}`)
  }

  const payload = await response.json()
  const script = extractGoogleTextCandidate(payload)
  if (!script) throw new Error('Gemini Vertex nao retornou script.')

  const path = `${params.userId}/${params.assetId}.txt`
  const { error } = await admin.storage
    .from('studio')
    .upload(path, Buffer.from(script, 'utf-8'), { contentType: 'text/plain', upsert: true })
  if (error) throw new Error(`Upload script falhou: ${error.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return { url: publicUrl, text: script }
}

export async function generateVoiceGoogle(params: {
  script: string
  voice_id: string
  speed: number
  assetId: string
  userId: string
  language_code?: string
}) {
  const admin = createAdminClient()
  const buffer = await synthesizeGoogleSpeech({
    text: params.script,
    voiceId: params.voice_id,
    languageCode: params.language_code ?? inferSpeechLanguageCode(params.script),
    speakingRate: params.speed ?? 1,
  })

  const path = `${params.userId}/${params.assetId}.mp3`
  const { error } = await admin.storage
    .from('studio')
    .upload(path, buffer, { contentType: 'audio/mpeg', upsert: true })
  if (error) throw new Error(`Upload audio falhou: ${error.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return publicUrl
}

export async function generateCaptionGoogle(params: {
  audio_url: string
  assetId: string
  userId: string
}) {
  const admin = createAdminClient()
  const audioRes = await fetch(params.audio_url)
  if (!audioRes.ok) throw new Error('Nao foi possivel baixar o audio')
  const buffer = Buffer.from(await audioRes.arrayBuffer())
  const mimeType = audioRes.headers.get('content-type') || 'audio/mpeg'
  const { srt } = await transcribeGoogleAudio({
    audioBuffer: buffer,
    mimeType,
    languageCode: 'pt-BR',
  })

  if (!srt.trim()) throw new Error('Google Speech-to-Text nao retornou legendas.')

  const path = `${params.userId}/${params.assetId}.srt`
  const { error } = await admin.storage
    .from('studio')
    .upload(path, Buffer.from(srt, 'utf-8'), { contentType: 'text/plain', upsert: true })
  if (error) throw new Error(`Upload legenda falhou: ${error.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return { url: publicUrl, srt }
}

export async function generateModelGoogle(params: {
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
  const genderMap: Record<string, string> = { feminino: 'woman', masculino: 'man' }
  const ageMap: Record<string, string> = { '20-30': 'mid-twenties', '30-40': 'mid-thirties', '40-55': 'mid-forties', '55+': 'late fifties' }
  const skinMap: Record<string, string> = { muito_clara: 'very fair porcelain skin', clara: 'light peachy skin', media: 'medium warm skin', oliva: 'olive-toned skin', morena: 'rich brown skin', negra: 'deep ebony skin' }
  const bodyMap: Record<string, string> = { magro: 'slim slender build', atletico: 'athletic toned build', normal: 'average proportional build', robusto: 'stocky sturdy build', plus_size: 'plus-size full-figured build' }
  const styleMap: Record<string, string> = { casual: 'casual everyday streetwear', profissional: 'smart professional business attire', esportivo: 'sporty activewear', elegante: 'elegant formal wear', alternativo: 'alternative edgy fashion' }

  const response = await fetchGoogleGenerateContent({
    model: 'gemini-2.5-flash',
    feature: 'studio-model-brief',
    body: {
      systemInstruction: {
        parts: [{
          text: await getStudioPrompt(
            admin,
            'model_generation_system',
            'You are a UGC creative director specializing in commercial model casting for ads. Output one dense English paragraph with vivid, photorealistic visual description only.',
          ),
        }],
      },
      contents: [{
        role: 'user',
        parts: [{
          text: `Create a unique visual model description for a ${genderMap[params.gender] ?? params.gender}, ${ageMap[params.age_range] ?? params.age_range}, ${skinMap[params.skin_tone] ?? params.skin_tone}, ${bodyMap[params.body_type] ?? params.body_type}, wearing ${styleMap[params.style] ?? params.style}.${params.extra_details ? ` Additional details: ${params.extra_details}` : ''}`,
        }],
      }],
      generationConfig: {
        temperature: 0.95,
      },
    },
  })

  if (!response.ok) {
    throw new Error(`Gemini Vertex erro (${response.status}): ${await response.text()}`)
  }

  const payload = await response.json()
  const text = extractGoogleTextCandidate(payload)
  if (!text) throw new Error('Gemini Vertex nao retornou briefing visual.')

  const fluxSuffix = await getStudioPrompt(
    admin,
    'model_flux_suffix',
    'Skin pores and natural imperfections visible. Real human face, authentic natural lighting, not retouched, not illustrated, not CGI.',
  )
  const finalPrompt = `COMMERCIAL PHOTOGRAPHY STUDIO. Seamless pure white paper backdrop, studio strobe lighting, clean white background. ${text} ${fluxSuffix} Shot on film. Shot on Hasselblad H6D, Zeiss Otus 85mm f/1.4 lens, Kodak Portra 400, film grain, natural depth of field, hyper-realistic, 8k. MANDATORY: solid white background only, no environment, no outdoor scene, no bokeh, plain white seamless backdrop, professional studio portrait.`
  const vertexKey = process.env.GOOGLE_VERTEX_KEY
  if (!vertexKey) throw new Error('GOOGLE_VERTEX_KEY nao configurada')
  const projectId = process.env.VERTEX_PROJECT_ID || 'project-9e7b4eec-0111-46d8-ae0'
  const location = process.env.VERTEX_LOCATION || 'us-central1'
  const vertexToken = await getVertexAccessToken(vertexKey)
  const imageRes = await fetch(`https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-4.0-generate-001:predict`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${vertexToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ prompt: finalPrompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '9:16',
        personGeneration: 'allow_adult',
        negativePrompt: 'outdoor, street, city, building, trees, nature, bokeh background, blurred background, environment, park, cafe, wall, colorful background, gradient background, dark background, window, curtain, interior room',
      },
    }),
  })

  if (!imageRes.ok) {
    throw new Error(`Vertex Imagen erro (${imageRes.status}): ${await imageRes.text()}`)
  }

  const imagePayload = await imageRes.json()
  const base64 = imagePayload.predictions?.[0]?.bytesBase64Encoded
  if (!base64) throw new Error('Vertex Imagen nao retornou imagem do modelo.')

  const path = `${params.userId}/${params.assetId}-model-${Date.now()}.jpg`
  const { error } = await admin.storage
    .from('studio')
    .upload(path, Buffer.from(base64, 'base64'), { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(`Upload foto modelo falhou: ${error.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return { url: publicUrl, text }
}

// â”€â”€ Script â€” GPT-4o UGC viral em PT via fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Voice â€” ElevenLabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const ELEVENLABS_VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (masculino)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (feminino)' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (feminino)' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli (feminino)' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh (masculino)' },
]

function inferSpeechLanguageCode(text: string): string {
  const normalized = normalizeTalkingWhitespace(text).toLowerCase()
  if (!normalized) return 'pt'

  if (/[Ã£ÃµÃ¡Ã Ã¢ÃªÃ´Ã§]/i.test(normalized)) return 'pt'
  if (/\b(voce|voces|vocÃª|vocÃªs|nao|nÃ£o|pra|pro|produto|quente|rotina|manha|manhÃ£|agora|comigo|gente|melhor|mesmo)\b/i.test(normalized)) {
    return 'pt'
  }
  if (/\b(hola|gracias|usted|ustedes|maÃ±ana|producto|hablar|quiero)\b/i.test(normalized)) {
    return 'es'
  }
  if (/\b(the|this|that|with|from|your|you|hello|today|product|morning|office|beach)\b/i.test(normalized)) {
    return 'en'
  }

  return 'pt'
}

export async function generateVoice(params: {
  script: string
  voice_id: string
  speed: number
  assetId: string
  userId: string
  language_code?: string
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
      language_code: params.language_code ?? inferSpeechLanguageCode(params.script),
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

// â”€â”€ Caption â€” Whisper via fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Upscale â€” Gemini 3 Pro â†’ Gemini 3.1 Flash â†’ Clarity fallback â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    if (!googleKey) throw new Error('GOOGLE_API_KEY nÃ£o configurada')
    const prompt = `You are an ultra-high quality photo enhancer. Output an enhanced version with maximum photorealistic detail â€” sharp skin texture, crisp fabric details, clear product labels, natural lighting. Preserve EVERYTHING exactly: same person, same product, same composition, same colors. Output at maximum quality.`
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
    if (!falKey) throw new Error('FAL_KEY nÃ£o configurada')
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

  // â”€â”€ Passo 1: Gemini enhance
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

  // â”€â”€ Passo 2 (sÃ³ 8K): Clarity Upscaler em cima do resultado Gemini
  if (is8k && geminiResultBase64) {
    try {
      const intermediateUrl = await uploadBase64ToStorage(geminiResultBase64, 'upscale-intermediate')
      console.log(`[upscale] 8K: rodando Clarity Upscaler no resultado Gemini`)
      const finalUrl = await clarityUpscale(intermediateUrl)
      return finalUrl
    } catch (e: any) {
      console.warn(`[upscale] 8K Clarity falhou, entregando sÃ³ Gemini: ${e.message}`)
      return await uploadBase64ToStorage(geminiResultBase64)
    }
  }

  // â”€â”€ 4K: entrega direto resultado Gemini
  if (geminiResultBase64) return await uploadBase64ToStorage(geminiResultBase64)

  // â”€â”€ Fallback externo: Clarity Upscaler
  console.log('[upscale] Fallback para Clarity Upscaler (Fal AI)')
  try { return await clarityUpscale(params.source_url) } catch (e: any) {
    throw new Error(`Todos os motores falharam. Ãšltimo: ${e.message}`)
  }
}

// â”€â”€ Model â€” GPT-4o gera descriÃ§Ã£o visual Ãºnica para UGC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
Vary vocabulary, hair details, facial features, and scene context every response â€” never repeat.
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
        const vertexUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-4.0-generate-001:predict`

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
      console.warn('[studio] Vertex AI (Model) falhou ou nÃ£o configurado, tentando Gemini API...', vertexError.message)
      
      // ---- FALLBACK: MOTOR GOOGLE IMAGEN 4.0 (Gemini API) ----
      const googleApiKey = (process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY)
      if (!googleApiKey) throw new Error('GOOGLE_API_KEY nÃ£o configurada no servidor')

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
      if (!base64) throw new Error('Google Imagen 4.0 nÃ£o retornou imagem. Verifique logs.')

      photoBuffer = Buffer.from(base64, 'base64')
    }

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
    if (!tempUrl) throw new Error('Flux Ultra nÃ£o retornou URL')

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

// â”€â”€ Video â€” Kling AI via Fal AI (async â€” usa webhook) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const VIDEO_LOCK_POLICY = 'preserve-model-product-scene-v1'
const VIDEO_MOTION_FALLBACK =
  'subtle natural motion only, gentle breathing, soft blink, tiny head turn, stable hands, slight camera push-in'

const VIDEO_SCENE_CHANGE_PATTERNS = [
  /\b(em|na|no|numa|num|inside|at|in front of|on a|from a)\s+(cafeteria|cafe|cozinha|kitchen|praia|beach|rua|street|cidade|city|paris|londres|london|dubai|tokyo|roma|rome|floresta|forest|hotel|escritorio|office|quarto|bedroom|banheiro|bathroom|restaurante|restaurant|mall|shopping|studio|estudio)\b/i,
  /\b(background|fundo|cenario|cenario novo|ambiente|location|localizacao|setting)\b/i,
  /\b(change|troca|muda|mudar|transform|transforme|replace|turn this into)\b.{0,48}\b(background|fundo|cenario|ambiente|location|localizacao|setting|city|cidade|praia|beach|cafe|cafeteria|cozinha|kitchen|hotel|rua|street)\b/i,
  /\b(novo cenario|new scene|novo fundo|new background|novo ambiente)\b/i,
]

const VIDEO_PROMPT_BLOCKLIST: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(background|fundo|cenario|ambiente|location|setting|cityscape|skyline|landmark|praia|beach|cozinha|kitchen|restaurante|restaurant|cafe|office|escritorio|hotel|forest|floresta)\b/i, label: 'scenario' },
  { pattern: /\b(change outfit|new outfit|trocar roupa|mudar roupa|jaqueta|jacket|vestido|dress|camiseta|shirt|calca|pants|heels|sapato|shoes|hat|bone|look novo)\b/i, label: 'wardrobe change' },
  { pattern: /\b(new product|trocar produto|mudar produto|replace product|outra caneca|another mug|outro item|another item)\b/i, label: 'product change' },
  { pattern: /\b(change face|new face|different person|trocar modelo|mudar modelo|younger|mais jovem|thinner|mais magra|prettier|mais bonita)\b/i, label: 'identity change' },
  { pattern: /\b(add prop|novo objeto|segurando flores|holding flowers|carro|car|bolsa extra|extra prop|champagne|phone in hand)\b/i, label: 'extra props' },
  { pattern: /\b(runway|editorial set|cinematic scene|dramatic scene|action scene|fight scene|dance choreography|explosion|sci-fi|fantasy world)\b/i, label: 'reenactment' },
]

export type VideoMotionPromptPolicy = {
  rawPrompt: string
  normalizedPrompt: string
  removedDirectives: string[]
  sceneChangeRequested: boolean
  sceneChangeBlocked: boolean
  videoLockPolicy: string
  sourceFidelityMode: 'strict' | 'best_effort' | 'none'
  sourceVisibleItemManifest: string[]
  sourceTextLogoLock: boolean
  sourceColorLock: boolean
  finalPrompt: string
}

export type TalkingVideoMode = 'exact_speech' | 'veo_natural'
export type TalkingVideoProductLockMode = 'strict' | 'best_effort' | 'none'
export type TalkingVideoSceneFreedomLevel = 'locked' | 'guided' | 'free'
export type TalkingVideoCameraMotionPolicy = 'speech_safe' | 'free'
export type TalkingVideoPipelineStage =
  | 'validating'
  | 'voice_generating'
  | 'voice_duration_check'
  | 'veo_generating'
  | 'lipsyncing'
  | 'finalizing'
  | 'completed'
  | 'failed'

export type TalkingVideoSourceChangeRequest = {
  requestedSceneChange?: boolean
  requestedWardrobeChange?: boolean
  requestedProductChange?: boolean
}

export type TalkingVideoPromptPolicy = {
  ideaPrompt: string
  mode: TalkingVideoMode
  speechTextRaw: string
  speechTextNormalized: string
  visualPromptRaw: string
  visualPromptNormalized: string
  expressionDirection: string
  speechSource: 'explicit' | 'quoted' | 'label' | 'heuristic' | 'missing'
  removedDirectives: string[]
  estimatedSpeechSeconds: number
  talkingVideoPolicy: string
  sceneFreedomLevel: TalkingVideoSceneFreedomLevel
  cameraMotionPolicy: TalkingVideoCameraMotionPolicy
  modelIdentityLock: true
  productLockMode: TalkingVideoProductLockMode
  productVisibilityConfidence: number
  strictSourceFidelity: boolean
  sourceTextLogoLock: boolean
  sourceColorLock: boolean
  preserveAllVisibleSourceItems: boolean
  sourceVisibleItemManifest: string[]
  finalPrompt: string
}

export type TalkingVideoMotionStartParams = {
  source_image_url: string
  motion_prompt: string
  model_prompt?: string
  motion_prompt_raw?: string
  motion_prompt_normalized?: string
  removed_directives?: string[]
  video_lock_policy?: string
  scene_change_requested?: boolean
  scene_change_blocked?: boolean
  duration?: number
  quality?: string
  assetId: string
  userId: string
  appUrl: string
  prompt_override?: string
  generate_audio?: boolean
  strict_source_fidelity?: boolean
  source_visible_item_manifest?: string[]
  source_text_logo_lock?: boolean
  source_color_lock?: boolean
  inputParamsPatch?: Record<string, unknown>
}

export type TalkingVideoFinalizeResult = {
  status: 'processing' | 'done' | 'error'
  resultUrl?: string
  message?: string
  error?: string
}

type SourceVisualFidelityProfile = {
  productLockMode: TalkingVideoProductLockMode
  productVisibilityConfidence: number
  strictSourceFidelity: boolean
  sourceTextLogoLock: boolean
  sourceColorLock: boolean
  preserveAllVisibleSourceItems: boolean
  sourceVisibleItemManifest: string[]
}

const TALKING_VIDEO_POLICY =
  'model_identity_lock=true; product_lock=dynamic; preserve_all_visible_source_items=true; scene_freedom=talking-video; camera_policy=speech-aware; split speech content from emotional direction'

const TALKING_VIDEO_IDENTITY_BLOCKLIST: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(change face|new face|different person|trocar modelo|mudar modelo|mais jovem|younger|mais magra|thinner|new identity)\b/i, label: 'identity_change' },
  { pattern: /\b(trocar produto|mudar produto|replace product|new product|outra caneca|outro item)\b/i, label: 'product_change' },
]

const TALKING_VIDEO_SPEECH_SAFE_BLOCKLIST: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(profile shot|side profile|silhouette|turn fully sideways|perfil lateral|de costas|head fully turned)\b/i, label: 'speech_unsafe_angle' },
  { pattern: /\b(whip pan|fast cuts|jump cuts|hard cut|cortes rapidos|camera shake|violent zoom|extreme zoom)\b/i, label: 'speech_unsafe_camera' },
  { pattern: /\b(hand over mouth|mouth covered|mouth occluded|covering the mouth|cobra a boca)\b/i, label: 'speech_unsafe_mouth_occlusion' },
]

function asStudioRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function dedupeNormalizedStrings(values: Array<unknown>) {
  return Array.from(new Set(
    values
      .map((value) => String(value ?? '').trim())
      .filter(Boolean),
  ))
}

function inferTalkingVideoSourceVisualProfile(sourceAsset?: {
  type?: string
  input_params?: Record<string, unknown>
}): SourceVisualFidelityProfile {
  const inputParams = sourceAsset?.input_params ?? {}
  const sourceOrigin = typeof inputParams.source_origin === 'string' ? inputParams.source_origin : ''
  const composeVariant = typeof inputParams.compose_variant === 'string' ? inputParams.compose_variant : ''
  const hasProductUrl = typeof inputParams.product_url === 'string' && inputParams.product_url.trim().length > 0
  const hasProductUrls = Array.isArray(inputParams.product_urls) && inputParams.product_urls.some((value) => typeof value === 'string' && value.trim().length > 0)
  const explicitStrictSourceFidelity =
    Boolean(inputParams.force_strict_source_fidelity)
    || Boolean(inputParams.source_text_logo_lock)
    || Boolean(inputParams.source_color_lock)
    || inputParams.preserve_all_visible_source_items === true
  const sourceVisibleItemManifest = dedupeNormalizedStrings([
    ...(Array.isArray(inputParams.submitted_item_manifest) ? inputParams.submitted_item_manifest : []),
    ...(Array.isArray(inputParams.source_visible_item_manifest) ? inputParams.source_visible_item_manifest : []),
    ...(Array.isArray(inputParams.submitted_non_fashion_items) ? inputParams.submitted_non_fashion_items : []),
  ]).slice(0, 16)

  const withVisibleItems = (
    productLockMode: TalkingVideoProductLockMode,
    productVisibilityConfidence: number,
    strictSourceFidelity: boolean,
    sourceTextLogoLock: boolean,
    sourceColorLock: boolean,
    preserveAllVisibleSourceItems: boolean,
  ) => ({
    productLockMode,
    productVisibilityConfidence,
    strictSourceFidelity,
    sourceTextLogoLock,
    sourceColorLock,
    preserveAllVisibleSourceItems,
    sourceVisibleItemManifest,
  })

  if (sourceAsset?.type === 'compose' && composeVariant === 'product') {
    return withVisibleItems('strict', 0.94, true, true, true, true)
  }

  if (
    (sourceAsset?.type === 'compose' && composeVariant === 'fitting')
    || hasProductUrl
    || hasProductUrls
    || sourceVisibleItemManifest.length > 0
  ) {
    return withVisibleItems('strict', 0.88, true, true, true, true)
  }

  if (
    sourceAsset?.type === 'scene'
    || sourceAsset?.type === 'image'
    || sourceAsset?.type === 'upscale'
    || sourceAsset?.type === 'direct_upload_source'
    || sourceOrigin === 'direct_upload'
    || explicitStrictSourceFidelity
  ) {
    return withVisibleItems('strict', 0.84, true, true, true, true)
  }

  return withVisibleItems('none', 0.18, false, false, false, true)
}

function isSoftSovereignAccessoryIssue(issue: string): boolean {
  const normalized = issue.trim().toLowerCase()
  if (!normalized) return false

  const mentionsAccessory =
    /(bangle|bracelet|brinco|earring|ring|anel|watch|relogio|relÃ³gio|jewelry|joia|joias|necklace|colar|scarf fringe|fringe|belt buckle|fivela)/i.test(normalized)
  const indicatesSmallMismatch =
    /(one of the two|one of two|slight|slightly|minor|subtle|softened|less defined|small detail|tiny detail|could not fully verify|hard to verify)/i.test(normalized)

  return mentionsAccessory && indicatesSmallMismatch
}

export function incrementTalkingPipelineAttempts(
  currentValue: unknown,
  stage: string,
) {
  const current = asStudioRecord(currentValue)
  const previous = Number(current[stage] ?? 0)
  return {
    ...current,
    [stage]: previous + 1,
  }
}

function isStrictTalkingVideoRestagingSegment(segment: string) {
  const normalized = normalizeTalkingWhitespace(segment).toLowerCase()
  if (!normalized) return false

  return (
    /\b(storyboard|roteiro|take|shot|seg(?:\.|undos?)?|sec(?:onds?)?|close|close-up|close up|texto na tela|on-screen text|caption|legenda|musica|trilha|sfx|sound effects?)\b/i.test(normalized)
    || /\b(acorda|se espreguica|se espreguiÃ§a|se levanta|vai em direcao|vai em direÃ§Ã£o|walking|walks|gets up|stands up|vira para a camera|vira para camera|joinha|pisca)\b/i.test(normalized)
    || /\b(cama|criado-mudo|criado mudo|janela|window|bed|bedside|nightstand)\b/i.test(normalized)
  )
}

export function prepareTalkingVideoPrompt(params: {
  mode: TalkingVideoMode
  ideaPrompt?: string
  speechText?: string
  expressionDirection?: string
  visualPrompt?: string
  requestedSceneChange?: boolean
  requestedWardrobeChange?: boolean
  sourceAsset?: {
    type?: string
    input_params?: Record<string, unknown>
  }
}): TalkingVideoPromptPolicy {
  const parsedIdea = parseTalkingVideoIdeaInput({
    mode: params.mode,
    ideaPrompt: params.ideaPrompt,
    speechText: params.speechText,
    expressionDirection: params.expressionDirection,
    visualPrompt: params.visualPrompt,
  })
  const speechTextRaw = parsedIdea.speechText
  const speechTextNormalized = normalizeTalkingWhitespace(speechTextRaw)
  const visualPromptRaw = parsedIdea.visualPrompt
  const sourceVisualProfile = inferTalkingVideoSourceVisualProfile(params.sourceAsset)
  const visualSegments = visualPromptRaw
    .split(/[\n,.;]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
  const removed = new Set<string>()
  const filteredSegments: string[] = []

  for (const segment of visualSegments) {
    const identityRule = TALKING_VIDEO_IDENTITY_BLOCKLIST.find((rule) => rule.pattern.test(segment))
    if (identityRule) {
      removed.add(identityRule.label)
      continue
    }

    if (params.mode === 'exact_speech') {
      const speechSafeRule = TALKING_VIDEO_SPEECH_SAFE_BLOCKLIST.find((rule) => rule.pattern.test(segment))
      if (speechSafeRule) {
        removed.add(speechSafeRule.label)
        continue
      }
    }

    if (
      sourceVisualProfile.strictSourceFidelity
      && !params.requestedSceneChange
      && !params.requestedWardrobeChange
      && isStrictTalkingVideoRestagingSegment(segment)
    ) {
      removed.add('strict_scene_restage')
      continue
    }

    filteredSegments.push(segment)
  }

  const visualPromptNormalized = filteredSegments.join(', ')
  const expressionDirection = normalizeTalkingWhitespace(parsedIdea.expressionDirection)
    || (params.mode === 'exact_speech'
      ? 'confident natural on-camera testimonial'
      : 'natural cinematic speaking performance')
  const estimatedSpeechSeconds = estimateTalkingSpeechDurationSeconds({
    text: speechTextNormalized,
    speed: 1,
  })
  const sceneFreedomLevel: TalkingVideoSceneFreedomLevel = params.mode === 'exact_speech' ? 'guided' : 'free'
  const cameraMotionPolicy: TalkingVideoCameraMotionPolicy = params.mode === 'exact_speech' ? 'speech_safe' : 'free'

  const productLockInstruction =
    sourceVisualProfile.productLockMode === 'strict'
      ? 'LOCK PRODUCT STRICTLY: preserve the exact same product, label, logo, shape, color, scale, and visibility if a product is present in the source frame.'
      : sourceVisualProfile.productLockMode === 'best_effort'
        ? 'LOCK PRODUCT BEST EFFORT: if a product is visible in the source frame, preserve its identity, logo, color, and overall shape without redesigning it.'
        : 'If no product is clearly visible in the source frame, do not invent a hero product.'

  const visibleItemInstruction = sourceVisualProfile.preserveAllVisibleSourceItems
    ? sourceVisualProfile.sourceVisibleItemManifest.length > 0
      ? `LOCK ALL VISIBLE SOURCE ITEMS: preserve the exact outfit, accessories, held objects, props, and important composition elements already visible in the source frame. Pay special attention to these visible items: ${sourceVisualProfile.sourceVisibleItemManifest.join(', ')}. Do not remove, swap, recolor, redesign, or invent replacements.`
      : 'LOCK ALL VISIBLE SOURCE ITEMS: preserve the exact outfit, accessories, held objects, props, and important composition elements already visible in the source frame. Do not remove, swap, recolor, redesign, or invent replacements.'
    : 'If the source frame contains meaningful visible objects, keep them coherent and stable.'
  const wardrobeInstruction = params.requestedWardrobeChange
    ? 'WARDROBE CHANGE IS PRE-RESOLVED ONLY: if an approved new outfit is already visible in the current source frame, preserve that wardrobe exactly during animation. Do not restyle it again while generating motion.'
    : 'LOCK WARDROBE: preserve the exact same outfit, accessories, fit, colors, and visible styling from the current source frame.'
  const strictSourceInstruction = sourceVisualProfile.strictSourceFidelity
    ? 'SOURCE FRAME IS SOVEREIGN: preserve the visible product, printed text, logo, labels, wardrobe, props, and overall frame composition literally from the reference image. Do not reinterpret or improve branding.'
    : 'Stay visually faithful to the source frame.'
  const textLogoInstruction = sourceVisualProfile.sourceTextLogoLock
    ? 'LOCK TEXT AND LOGOS: any visible printed text, product logo, label, packaging copy, or branding in the source frame must remain exactly the same.'
    : ''
  const colorInstruction = sourceVisualProfile.sourceColorLock
    ? 'LOCK COLORS: preserve the exact product colorway, text color, logo color, wardrobe colors, and visible prop colors from the source frame.'
    : ''

  const sceneInstruction =
    params.requestedSceneChange
      ? 'SCENE CHANGE IS PRE-RESOLVED ONLY: if an approved new environment is already present in the current source frame, preserve that updated scene exactly during animation. Do not restage or replace the environment again while generating motion.'
      : sourceVisualProfile.strictSourceFidelity
      ? 'LOCK SCENE: preserve the exact same background, environment, framing, camera height, and composition from the current source frame. If a new scenario is needed, it must be resolved before video generation; do not restage it during animation.'
      : sceneFreedomLevel === 'free'
      ? 'SCENE FREEDOM: you may adapt camera energy and cinematic atmosphere, but keep the source-frame composition coherent and never remove intentional visible items from the source frame.'
      : 'GUIDED SCENE: keep the environment coherent and stable around the speaking subject. Favor one continuous shot instead of scene jumps, without removing intentional visible items from the source frame.'

  const cameraInstruction =
    cameraMotionPolicy === 'speech_safe'
      ? 'SPEECH-SAFE CAMERA: keep the mouth clearly visible, prefer a medium or medium-close shot, avoid extreme head turns, heavy occlusion, fast cuts, violent zooms, or profile-only views.'
      : 'Camera can be more cinematic, but keep the subject readable and stable.'

  const promptParts = [
    'Create a short talking-performance video from this source image.',
    'LOCK IDENTITY: preserve the exact same person, face, hair, skin tone, body proportions, and overall identity from the source frame.',
    strictSourceInstruction,
    visibleItemInstruction,
    productLockInstruction,
    wardrobeInstruction,
    textLogoInstruction,
    colorInstruction,
    sceneInstruction,
    cameraInstruction,
    'Do not add subtitles, on-screen captions, or rendered text in the frame.',
    `Emotional direction: ${expressionDirection}.`,
    visualPromptNormalized ? `Visual direction: ${visualPromptNormalized}.` : '',
  ].filter(Boolean)

  if (params.mode === 'exact_speech') {
    promptParts.push(
      'The exact spoken words will be applied later by lip sync. Generate a natural speaking performance with believable mouth-ready pacing, breathing, blinking, and subtle gestures, but do not rely on the literal speech text to stage the scene.',
    )
  } else {
    promptParts.push(
      speechTextNormalized
        ? `Generate audio and spoken dialogue. The person says: ${speechTextNormalized}.`
        : 'Generate audio and a natural speaking delivery that matches the emotional direction.',
    )
  }

  return {
    ideaPrompt: parsedIdea.ideaPrompt,
    mode: params.mode,
    speechTextRaw,
    speechTextNormalized,
    visualPromptRaw,
    visualPromptNormalized,
    expressionDirection,
    speechSource: parsedIdea.speechSource,
    removedDirectives: Array.from(removed),
    estimatedSpeechSeconds,
    talkingVideoPolicy: TALKING_VIDEO_POLICY,
    sceneFreedomLevel,
    cameraMotionPolicy,
    modelIdentityLock: true,
    productLockMode: sourceVisualProfile.productLockMode,
    productVisibilityConfidence: sourceVisualProfile.productVisibilityConfidence,
    strictSourceFidelity: sourceVisualProfile.strictSourceFidelity,
    sourceTextLogoLock: sourceVisualProfile.sourceTextLogoLock,
    sourceColorLock: sourceVisualProfile.sourceColorLock,
    preserveAllVisibleSourceItems: sourceVisualProfile.preserveAllVisibleSourceItems,
    sourceVisibleItemManifest: sourceVisualProfile.sourceVisibleItemManifest,
    finalPrompt: promptParts.join(' '),
  }
}

async function mergeAssetInputParams(
  admin: ReturnType<typeof createAdminClient>,
  assetId: string,
  patch: Record<string, unknown>,
) {
  const { data: currentAsset } = await admin
    .from('studio_assets')
    .select('input_params')
    .eq('id', assetId)
    .maybeSingle()

  const currentInputParams = asStudioRecord(currentAsset?.input_params)

  await admin
    .from('studio_assets')
    .update({
      input_params: {
        ...currentInputParams,
        ...patch,
      },
    })
    .eq('id', assetId)
}

function parseFfmpegDuration(stderr: string) {
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
  if (!match) return null

  const hours = Number(match[1] ?? 0)
  const minutes = Number(match[2] ?? 0)
  const seconds = Number(match[3] ?? 0)
  return Number((hours * 3600 + minutes * 60 + seconds).toFixed(2))
}

export async function measureAudioDurationSeconds(audioUrl: string) {
  const os = await import('os')
  const path = await import('path')
  const fs = await import('fs')
  const { execFile } = await import('child_process')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegPath = require('ffmpeg-static') as string

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-audio-duration-'))
  const audioPath = path.join(tmpDir, 'speech.mp3')

  try {
    const audioRes = await fetch(audioUrl)
    if (!audioRes.ok) throw new Error(`Falha ao baixar audio para medir duracao: ${audioRes.status}`)

    fs.writeFileSync(audioPath, Buffer.from(await audioRes.arrayBuffer()))

    const stderr = await new Promise<string>((resolve, reject) => {
      execFile(ffmpegPath, ['-i', audioPath, '-f', 'null', '-'], { windowsHide: true }, (error, _stdout, stderrOutput) => {
        const parsed = parseFfmpegDuration(stderrOutput ?? '')
        if (parsed !== null) {
          resolve(stderrOutput ?? '')
          return
        }
        if (error) {
          reject(error)
          return
        }
        resolve(stderrOutput ?? '')
      })
    })

    const duration = parseFfmpegDuration(stderr)
    if (duration === null) throw new Error('Nao foi possivel medir a duracao real do audio gerado')
    return duration
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* noop */ }
  }
}

export function prepareLockedVideoMotionPrompt(params: {
  motionPrompt?: string
  modelPrompt?: string
  sourceAsset?: {
    type?: string
    input_params?: Record<string, unknown>
  }
}): VideoMotionPromptPolicy {
  const rawPrompt = (params.motionPrompt ?? '').trim()
  const segments = rawPrompt
    .split(/[\n,.;]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)

  const kept: string[] = []
  const removed = new Set<string>()
  let sceneChangeRequested = false

  for (const segment of segments) {
    if (VIDEO_SCENE_CHANGE_PATTERNS.some((pattern) => pattern.test(segment))) {
      sceneChangeRequested = true
      removed.add('scenario')
      continue
    }

    const blockedRule = VIDEO_PROMPT_BLOCKLIST.find((rule) => rule.pattern.test(segment))
    if (blockedRule) {
      removed.add(blockedRule.label)
      continue
    }

    kept.push(segment)
  }

  const normalizedPrompt = kept.join(', ')
  const motionIntent = normalizedPrompt || VIDEO_MOTION_FALLBACK
  const identityContext = params.modelPrompt?.trim()
    ? `Identity reference: ${params.modelPrompt.trim().slice(0, 220)}.`
    : ''
  const sourceVisualProfile = inferTalkingVideoSourceVisualProfile(params.sourceAsset)
  const visibleItemInstruction = sourceVisualProfile.preserveAllVisibleSourceItems
    ? sourceVisualProfile.sourceVisibleItemManifest.length > 0
      ? `LOCK ALL VISIBLE SOURCE ITEMS: preserve the exact same outfit, accessories, held objects, product details, props, and composition cues from the source frame. Mandatory visible items: ${sourceVisualProfile.sourceVisibleItemManifest.join(', ')}.`
      : 'LOCK ALL VISIBLE SOURCE ITEMS: preserve the exact same outfit, accessories, held objects, product details, props, and composition cues from the source frame.'
    : 'Keep the source frame visually coherent.'
  const strictSourceInstruction = sourceVisualProfile.strictSourceFidelity
    ? 'SOURCE FRAME IS SOVEREIGN: preserve the source frame literally. Do not reinterpret, redesign, beautify, simplify, recolor, premium-ize, or swap any visible element from the reference frame.'
    : 'Stay highly faithful to the source frame.'
  const textLogoInstruction = sourceVisualProfile.sourceTextLogoLock
    ? 'LOCK TEXT AND LOGOS: any visible printed text, logo, label, packaging text, or branding in the source frame must remain exactly the same in wording, styling, placement, and legibility.'
    : ''
  const colorInstruction = sourceVisualProfile.sourceColorLock
    ? 'LOCK COLORS: preserve the exact product colorway, text color, logo color, wardrobe colors, and visible prop colors from the source frame.'
    : ''

  const finalPrompt = [
    'Animate this exact reference frame into a short video while preserving it with near-frozen fidelity.',
    'LOCK PERSON AND IDENTITY: preserve the exact same person, face, hair, skin tone, body proportions, expression family, and age appearance.',
    strictSourceInstruction,
    visibleItemInstruction,
    'LOCK PRODUCT: preserve the exact same product, label, logo, text, shape, color, texture, scale, and hand placement. Do not swap, redesign, simplify, or deform the product.',
    textLogoInstruction,
    colorInstruction,
    'LOCK WARDROBE AND ANATOMY: preserve the exact outfit, accessories already present, body pose logic, and valid anatomy. Keep exactly two arms and two hands with stable fingers.',
    'LOCK SCENE: preserve the exact same background, environment, framing, camera height, composition, and scenario. Do not move the person to a new location and do not replace the background.',
    'ALLOW ONLY MICRO-MOTION: subtle breathing, soft blinking, tiny head turns, slight gaze shifts, gentle hand motion that keeps the product stable, natural hair or fabric movement, and restrained camera drift or push-in.',
    'If any user request conflicts with these locks, ignore the conflicting part and keep fidelity to the source frame.',
    identityContext,
    `Motion direction: ${motionIntent}.`,
  ]
    .filter(Boolean)
    .join(' ')

  return {
    rawPrompt,
    normalizedPrompt,
    removedDirectives: Array.from(removed),
    sceneChangeRequested,
    sceneChangeBlocked: sceneChangeRequested,
    videoLockPolicy: VIDEO_LOCK_POLICY,
    sourceFidelityMode: sourceVisualProfile.strictSourceFidelity
      ? 'strict'
      : sourceVisualProfile.productLockMode === 'best_effort'
        ? 'best_effort'
        : 'none',
    sourceVisibleItemManifest: sourceVisualProfile.sourceVisibleItemManifest,
    sourceTextLogoLock: sourceVisualProfile.sourceTextLogoLock,
    sourceColorLock: sourceVisualProfile.sourceColorLock,
    finalPrompt,
  }
}

export async function startVideoGeneration(params: {
  source_image_url: string
  motion_prompt: string
  duration: number
  model_prompt?: string
  motion_prompt_raw?: string
  motion_prompt_normalized?: string
  removed_directives?: string[]
  video_lock_policy?: string
  scene_change_requested?: boolean
  scene_change_blocked?: boolean
  strict_source_fidelity?: boolean
  source_visible_item_manifest?: string[]
  source_text_logo_lock?: boolean
  source_color_lock?: boolean
  engine?: string
  assetId: string
  appUrl: string
  userId: string
  inputParamsPatch?: Record<string, unknown>
}) {
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY nÃ£o configurada no servidor')

  const webhookUrl = `${params.appUrl}/api/studio/webhook?assetId=${params.assetId}&userId=${params.userId}`

  const admin = createAdminClient()
  const configStr = await getStudioPrompt(admin, 'video_kling_config', '{}')
  let config: any = {}
  try { config = JSON.parse(configStr) } catch { /* ignore */ }

  const finalMotion = prepareLockedVideoMotionPrompt({
    motionPrompt: params.motion_prompt,
    modelPrompt: params.model_prompt,
    sourceAsset: {
      type: 'video_source_frame',
      input_params: {
        source_visible_item_manifest: params.source_visible_item_manifest ?? [],
        preserve_all_visible_source_items: true,
        product_urls: params.strict_source_fidelity ? ['strict'] : [],
        source_text_logo_lock: params.source_text_logo_lock ?? false,
        source_color_lock: params.source_color_lock ?? false,
      },
    },
  }).finalPrompt

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
    throw new Error(`Fal AI erro ao enfileirar vÃ­deo Kling: ${err}`)
  }

  const { request_id } = await queueRes.json()
  if (!request_id) throw new Error('Fal AI nÃ£o retornou request_id para video')

  await mergeAssetInputParams(admin, params.assetId, {
    prediction_id: request_id,
    provider: 'fal',
    engine: params.engine ?? 'kling',
    fal_model_path: falModelPath,
    source_image_url: params.source_image_url,
    motion_prompt: params.motion_prompt_raw ?? params.motion_prompt,
    motion_prompt_raw: params.motion_prompt_raw ?? params.motion_prompt,
    motion_prompt_normalized: params.motion_prompt_normalized ?? params.motion_prompt,
    video_lock_policy: params.video_lock_policy ?? VIDEO_LOCK_POLICY,
    scene_change_requested: params.scene_change_requested ?? false,
    scene_change_blocked: params.scene_change_blocked ?? false,
    removed_directives: params.removed_directives ?? [],
    duration: requestedDuration,
    ...(params.inputParamsPatch ?? {}),
  })
}

// â”€â”€ Render â€” merge Ã¡udio + vÃ­deo via Replicate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Product-Aware Helpers (Fases 1-4) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

Respond ONLY with valid JSON â€” no markdown, no explanation:
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
    const parsed = parseModelJsonResponse<ProductProfile>(text)
    return {
      category: parsed.category ?? FALLBACK.category,
      has_text_logo: parsed.has_text_logo ?? FALLBACK.has_text_logo,
      deformation_risk: parsed.deformation_risk ?? FALLBACK.deformation_risk,
      shape_complexity: parsed.shape_complexity ?? FALLBACK.shape_complexity,
      placement_suggestion: parsed.placement_suggestion || FALLBACK.placement_suggestion,
      key_features: Array.isArray(parsed.key_features) ? parsed.key_features : [],
    }
  } catch (e: any) {
    console.warn('[studio] classifyProduct falhou â€” usando fallback:', e.message)
    return FALLBACK
  }
}

function buildCompositionPrompt(_profile: ProductProfile, userIntent: string): string {
  return `You are a professional high-end photo compositor. Produce ONE single unified photograph.

You receive two images:
[BASE PHOTO]: The specific UGC model identity.
[PRODUCT]: A client product â€” this is the EXACT product the client wants to showcase (can be a physical object, clothing, or accessory).

Your task: ${userIntent}

RULES â€” non-negotiable:
1. FACE & IDENTITY: Preserve the person's exact facial structure, features, skin tone, hair, and makeup exactly as seen in [BASE PHOTO] â€” do not alter her identity.
2. PRODUCT FIDELITY â€” CRITICAL: Treat [PRODUCT] like a literal photo restoration. The client's product must appear with 100% fidelity. Every single shape, color, texture, precise text, label, logo, proportion, and detail must be preserved exactly as in [PRODUCT]. Do NOT reimagine, reinterpret, simplify, or substitute anything.
3. CONDITIONAL CLOTHING & INTERACTION:
   - IF [PRODUCT] IS A HELD OBJECT (e.g., mug, jar, device): The person must hold it naturally. Keep the person's existing clothing exactly as in [BASE PHOTO].
   - IF [PRODUCT] IS CLOTHING OR ACCESSORY (e.g., shirt, coat, hat, full look): The person MUST WEAR the [PRODUCT]. Completely replace the relevant parts of the original clothing with the client's product. Fit the new clothing perfectly to her body shape with realistic fabric folds.
4. COMPOSITION: ONE unified photo â€” not a collage, not side-by-side. Check anatomy strictly: a person has exactly 2 hands and 2 arms â€” do NOT generate extra hands, extra arms, or disembodied limbs. Adjust hands naturally around the product.
5. BACKGROUND: Pure white (#FFFFFF) â€” no outdoor, no studio, no city scene.
6. OUTPUT: Natural commercial lighting and shadows that make the product look real and grounded in the scene. No watermarks, borders, or text outside the product itself.`
}

const PRODUCT_SHOWCASE_FALLBACK_INTENT =
  'No extra refinement. Stay close to the auto pose preset with a clean commercial expression and clear product visibility.'

const PRODUCT_SHOWCASE_BLOCKLIST: { pattern: RegExp; label: string }[] = [
  { pattern: /(praia|beach|cozinha|kitchen|sala|living room|sofa|rua|street|cidade|city|floresta|forest|restaurante|restaurant|cafe|office|escritorio|quarto|bedroom|banheiro|bathroom|sunset|por do sol|outdoor|indoor|ambiente|cenario|background|fundo|parede|wall)/i, label: 'scenario' },
  { pattern: /(editorial|fashion|magazine|runway|passarela|luxury set|cinematic|dramatic|sombras dramaticas|shadow dramatic|studio set)/i, label: 'editorial styling' },
  { pattern: /(vestindo|wearing|dress the model|outfit|look completo|look fashion|roupa|camiseta|jaqueta|vestido|calca|saia|sapato|shoes|heels|hat|bone)/i, label: 'wearable styling' },
]

function normalizeProductShowcasePrompt(userPrompt?: string): { intent: string; removedDirectives: string[] } {
  const raw = userPrompt?.trim()
  if (!raw) return { intent: '', removedDirectives: [] }

  const segments = raw
    .split(/[\n,.;]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)

  const kept: string[] = []
  const removed = new Set<string>()

  for (const segment of segments) {
    const blockedRule = PRODUCT_SHOWCASE_BLOCKLIST.find((rule) => rule.pattern.test(segment))
    if (blockedRule) {
      removed.add(blockedRule.label)
      continue
    }
    kept.push(segment)
  }

  return {
    intent: kept.join(', '),
    removedDirectives: Array.from(removed),
  }
}

type SingleLookWearableAnalysis = {
  primary_category: string
  secondary_categories: string[]
  contains_wearable: boolean
  contains_only_accessories: boolean
  image_kind: 'single-garment' | 'lookboard' | 'accessory-only' | 'unclear'
  placement_suggestion: string
  key_features: string[]
}

function parseModelJsonResponse<T>(rawText: string): T {
  const trimmed = rawText.trim()
  const withoutFence = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  const firstBrace = withoutFence.indexOf('{')
  const lastBrace = withoutFence.lastIndexOf('}')
  const candidate = firstBrace >= 0 && lastBrace > firstBrace
    ? withoutFence.slice(firstBrace, lastBrace + 1)
    : withoutFence
  const normalized = candidate.replace(/,\s*([}\]])/g, '$1')
  return JSON.parse(normalized) as T
}

async function analyzeSingleLookWearableReference(
  sourceBuffer: Buffer,
  apiKey: string,
): Promise<SingleLookWearableAnalysis | null> {
  const prompt = `Analyze this single fashion reference image for virtual try-on routing.

The image may be:
- one isolated garment
- a lookboard / flat lay with one main garment plus accessories
- accessories only

Your goal:
1. Decide whether there is a PRIMARY wearable fashion piece that should drive a clothing try-on.
2. If yes, choose exactly one primary category from:
   "tops", "bottoms", "one-pieces", "outerwear", "shoes", "headwear"
3. If the image is accessories-only or there is no clear wearable hero, choose one of:
   "bags", "glasses", "jewelry", "none"

Rules:
- If a dress, coat, jacket, shirt, pants, skirt, shoes, hat, or other wearable is clearly the hero item, set contains_wearable=true even if bags, jewelry, or glasses also appear.
- For flat lays / lookboards, prioritize the main garment over accessories whenever one wearable item is visually central or dominant.
- Only set contains_only_accessories=true when the image has no meaningful wearable garment as the hero.
- Keep secondary_categories limited to categories that are actually visible.

Respond ONLY with valid JSON:
{
  "primary_category": "<tops|bottoms|one-pieces|outerwear|shoes|headwear|bags|glasses|jewelry|none>",
  "secondary_categories": ["<category>", "..."],
  "contains_wearable": true,
  "contains_only_accessories": false,
  "image_kind": "<single-garment|lookboard|accessory-only|unclear>",
  "placement_suggestion": "<short instruction>",
  "key_features": ["<short feature>", "..."]
}`

  try {
    const normalized = await normalizeImageForVertex(sourceBuffer, 'jpeg')
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
              { inlineData: { mimeType: normalized.mimeType, data: normalized.buffer.toString('base64') } },
            ],
          }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    )
    if (!res.ok) throw new Error(`single-look-analysis HTTP ${res.status}`)
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const parsed = parseModelJsonResponse<Partial<SingleLookWearableAnalysis>>(text)
    return {
      primary_category: String(parsed.primary_category ?? 'none'),
      secondary_categories: Array.isArray(parsed.secondary_categories)
        ? parsed.secondary_categories.map((value) => String(value))
        : [],
      contains_wearable: Boolean(parsed.contains_wearable),
      contains_only_accessories: Boolean(parsed.contains_only_accessories),
      image_kind:
        parsed.image_kind === 'single-garment'
        || parsed.image_kind === 'lookboard'
        || parsed.image_kind === 'accessory-only'
        || parsed.image_kind === 'unclear'
          ? parsed.image_kind
          : 'unclear',
      placement_suggestion: String(parsed.placement_suggestion ?? 'wear the main client garment naturally with correct body fit'),
      key_features: Array.isArray(parsed.key_features) ? parsed.key_features.map((value) => String(value)) : [],
    }
  } catch (error: any) {
    console.warn('[studio] analyzeSingleLookWearableReference falhou:', error.message)
    return null
  }
}

type AccessoryReferenceKind = 'single-item' | 'accessory-set' | 'unclear'
type AccessoryConfidence = 'high' | 'medium' | 'low'

type AccessoryReferenceItem = {
  accessoryType: string
  fittingCategory: string
  zone: FittingZone
  description: string
  placementSuggestion: string
  keyFeatures: string[]
  confidence: AccessoryConfidence
}

type AccessoryReferenceAnalysis = {
  sourceIndex: number
  referenceUrl: string
  referenceKind: AccessoryReferenceKind
  containsAccessories: boolean
  hasSupportingClothingContext: boolean
  ignoredNonFashionProps: string[]
  reportedAccessoryCount: number
  accessoryCount: number
  items: AccessoryReferenceItem[]
  normalizedImage: NormalizedImageAsset
}

async function analyzeAccessoryReference(
  sourceBuffer: Buffer,
  apiKey: string,
  sourceIndex: number,
  referenceUrl: string,
): Promise<AccessoryReferenceAnalysis | null> {
  const prompt = `Analyze this fashion accessory reference image for a reference-driven try-on/composition workflow.

The image may contain:
- one accessory only
- a coordinated accessory set in one image
- accessories with clothing visible only as context

Important:
- Ignore clothing as long as accessories are the real client items.
- Do NOT reject an image just because clothing or skin is visible.
- Detect the client accessories that should be preserved and applied to the model.
- If decorative or styling props appear and they are not wearable fashion items, list them separately so the system can ignore them.
- Return at most 6 accessory items.

Allowed accessory types include, but are not limited to:
- bag
- eyewear
- jewelry-neck
- jewelry-ear
- jewelry-wrist
- jewelry-hand
- belt
- scarf
- hair-accessory
- other-fashion-accessory

Respond ONLY with valid JSON:
{
  "contains_accessories": true,
  "has_supporting_clothing_context": false,
  "reference_kind": "<single-item|accessory-set|unclear>",
  "ignored_non_fashion_props": ["<perfume|umbrella|flower|decorative-object>", "..."],
  "accessory_count": 2,
  "accessory_items": [
    {
      "type": "<bag|eyewear|jewelry-neck|jewelry-ear|jewelry-wrist|jewelry-hand|belt|scarf|hair-accessory|other-fashion-accessory>",
      "description": "<short literal description>",
      "zone": "<hands-shoulder|face|head|body-jewelry|body-main>",
      "placement_suggestion": "<short physical placement instruction>",
      "key_features": ["<short feature>", "..."],
      "confidence": "<high|medium|low>"
    }
  ]
}`

  try {
    const normalized = await normalizeImageForVertex(sourceBuffer, 'jpeg')
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
              { inlineData: { mimeType: normalized.mimeType, data: normalized.buffer.toString('base64') } },
            ],
          }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    )
    if (!res.ok) throw new Error(`accessory-analysis HTTP ${res.status}`)
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const parsed = parseModelJsonResponse<{
      contains_accessories?: boolean
      has_supporting_clothing_context?: boolean
      reference_kind?: string
      ignored_non_fashion_props?: string[]
      accessory_count?: number
      accessory_items?: Array<{
        type?: string
        description?: string
        zone?: string
        placement_suggestion?: string
        key_features?: string[]
        confidence?: string
      }>
    }>(text)

    const items = Array.isArray(parsed.accessory_items)
      ? parsed.accessory_items.slice(0, 6).map((item) => {
        const accessoryType = normalizeAccessoryType(item.type)
        const fittingCategory = mapAccessoryTypeToFittingCategory(accessoryType)
        const zone = normalizeAccessoryZone(item.zone, accessoryType)
        return {
          accessoryType,
          fittingCategory,
          zone,
          description: String(item.description ?? `exact ${accessoryType} accessory`),
          placementSuggestion: String(item.placement_suggestion ?? getDefaultAccessoryPlacementSuggestion(accessoryType, zone)),
          keyFeatures: Array.isArray(item.key_features) ? item.key_features.map((value) => String(value)) : [],
          confidence: normalizeAccessoryConfidence(item.confidence),
        } satisfies AccessoryReferenceItem
      })
      : []

    const referenceKind: AccessoryReferenceKind =
      parsed.reference_kind === 'single-item'
      || parsed.reference_kind === 'accessory-set'
      || parsed.reference_kind === 'unclear'
        ? parsed.reference_kind
        : (items.length > 1 ? 'accessory-set' : items.length === 1 ? 'single-item' : 'unclear')

    return {
      sourceIndex,
      referenceUrl,
      referenceKind,
      containsAccessories: Boolean(parsed.contains_accessories) || items.length > 0,
      hasSupportingClothingContext: Boolean(parsed.has_supporting_clothing_context),
      ignoredNonFashionProps: Array.isArray(parsed.ignored_non_fashion_props)
        ? Array.from(new Set(parsed.ignored_non_fashion_props.map((value) => String(value).trim().toLowerCase()).filter(Boolean))).slice(0, 8)
        : [],
      reportedAccessoryCount: typeof parsed.accessory_count === 'number'
        ? Math.max(items.length, parsed.accessory_count)
        : items.length,
      accessoryCount: items.length,
      items,
      normalizedImage: normalized,
    }
  } catch (error: any) {
    console.warn('[studio] analyzeAccessoryReference falhou:', error.message)
    return null
  }
}

function getProductShowcasePosePreset(profile: ProductProfile): { name: string; instruction: string } {
  switch (profile.category) {
    case 'packaged':
      return {
        name: 'packaged-clean-hero',
        instruction: 'Hold the packaged product near chest or face level with the main label facing camera, fingers not covering the label, and use a clean premium e-commerce smile.',
      }
    case 'handheld':
      return {
        name: 'handheld-demo',
        instruction: 'Present the device clearly in one hand with the main surface facing camera, while the second hand stays relaxed or lightly supports the product like a commercial demo.',
      }
    case 'delicate':
      return {
        name: 'delicate-beauty-closeup',
        instruction: 'Use elegant fingertips and a careful beauty-style hold that protects delicate details, with a refined close commercial framing and minimal visual clutter.',
      }
    case 'no-identity':
      return {
        name: 'generic-visibility',
        instruction: 'Use a straightforward centered hold that maximizes readability, with one or two hands only when necessary, keeping the product fully visible as the hero.',
      }
    default:
      return {
        name: 'default-clean-showcase',
        instruction: 'Use a simple commercial hold near chest level, keep the product facing camera when possible, and make the product clearly dominant in a clean e-commerce frame.',
      }
  }
}

function buildProductShowcasePrompt(profile: ProductProfile, posePreset: string, userIntent: string): string {
  const featureLine = profile.key_features.length > 0
    ? `Protect these product features exactly: ${profile.key_features.join(', ')}.`
    : 'Protect every visible shape, label, finish, cap, button, edge, contour, and detail from the original product.'

  return `You are a world-class e-commerce product photographer and identity-preserving compositor. Produce ONE single unified product showcase photograph.

You receive two images:
[BASE PHOTO]: the exact model identity and clothing reference.
[PRODUCT]: the exact client product to be held and showcased.

AUTO POSE PRESET: ${posePreset}
USER REFINEMENT: ${userIntent}

GOAL:
- Create a clean commercial photo where the model supports the hero product.
- This is a single product hero shot with model support, not an editorial campaign image.

RULES - non-negotiable:
1. FACE & IDENTITY LOCK: Preserve the person's exact facial structure, features, skin tone, hair, makeup, and identity from [BASE PHOTO].
2. CLOTHING LOCK: Keep the person's existing clothing exactly as in [BASE PHOTO]. Do not restyle wardrobe, add fashion pieces, or change outfit details.
3. PRODUCT FIDELITY - CRITICAL: Treat [PRODUCT] like a literal restoration target. Preserve 100% of its shape, silhouette, colors, texture, proportions, text, label, logo, finish, and every visual detail. ${featureLine}
4. PRODUCT USAGE MODE: The product must be naturally held or intentionally presented with one or two hands. Do NOT make the model wear the product as clothing, and do NOT convert it into a scenario prop.
5. PRODUCT PRIORITY: The product is the hero. It must be fully visible, large enough to read or recognize clearly, and intentionally facing the camera when physically possible.
6. FRAMING & POSE: Follow the AUTO POSE PRESET as the structural pose. Apply the USER REFINEMENT only as a light adjustment. Use a clean commercial pose, natural confident expression, medium or medium-close framing, and anatomically correct hands and arms. Exactly 2 hands maximum. No extra fingers, hands, or limbs.
7. BACKGROUND: Pure white (#FFFFFF) only. No set, no room, no outdoor scene, no gradient backdrop, no furniture, no decorative props.
8. LIGHTING: Clean e-commerce lighting with natural soft shadows only. No dramatic editorial shadows, no cinematic environment light, no colored gels.
9. OUTPUT: Photorealistic commercial photography, no collage, no split screen, no watermarks, no text outside the product itself. Ignore any request for scenario, environment, background color, or fashion editorial styling.`
}

const FITTING_PROMPT_BLOCKLIST: { pattern: RegExp; label: string }[] = [
  { pattern: /(praia|beach|floresta|forest|espaco|space|sci-fi|ficcao cientifica|cyberpunk|cidade futurista|battle|explosion|action scene|luta|correndo|jumping|voando)/i, label: 'extreme scenario' },
  { pattern: /(duas roupas|dois looks|multiple looks|multiple outfits|trocar de roupa no meio|antes e depois|split screen|side by side|colagem)/i, label: 'multiple looks' },
  { pattern: /(quatro bracos|four arms|extra arms|extra hands|six fingers|corpo impossivel|anatomia impossivel|levitando sem apoio|pose impossivel)/i, label: 'impossible anatomy' },
  { pattern: /(fashion clean|premium|street|casual|minimalista|elegante|luxury|luxo|sofisticad|editorial|runway|passarela|high fashion)/i, label: 'style override' },
]

function normalizeFittingCategory(input?: string): string {
  switch ((input ?? '').trim().toLowerCase()) {
    case 'tops':
    case 'top':
      return 'tops'
    case 'bottoms':
    case 'bottom':
      return 'bottoms'
    case 'one-pieces':
    case 'one-pieceses':
    case 'dress':
    case 'dresses':
    case 'vestido':
    case 'macacao':
      return 'one-pieces'
    case 'outerwear':
    case 'jaqueta':
    case 'casaco':
      return 'outerwear'
    case 'bags':
    case 'bag':
    case 'bolsa':
      return 'bags'
    case 'glasses':
    case 'oculos':
      return 'glasses'
    case 'jewelry':
    case 'joia':
    case 'jewellery':
      return 'jewelry'
    case 'other-accessory':
    case 'other fashion accessory':
    case 'other-fashion-accessory':
    case 'fashion accessory':
    case 'fashion-accessory':
    case 'accessory':
    case 'acessorio':
    case 'acessÃƒÂ³rio':
      return 'other-accessory'
    case 'shoes':
    case 'shoe':
    case 'sapato':
      return 'shoes'
    case 'headwear':
    case 'hat':
    case 'hats':
    case 'cap':
    case 'caps':
    case 'beanie':
    case 'headpiece':
    case 'bone':
    case 'chapeu':
    case 'chapÃ©u':
      return 'headwear'
    default:
      return 'tops'
  }
}

function parseKnownFittingCategory(input?: string): string | undefined {
  const raw = (input ?? '').trim().toLowerCase()
  if (!raw) return undefined

  switch (raw) {
    case 'tops':
    case 'top':
      return 'tops'
    case 'bottoms':
    case 'bottom':
      return 'bottoms'
    case 'one-pieces':
    case 'one-pieceses':
    case 'dress':
    case 'dresses':
    case 'vestido':
    case 'macacao':
      return 'one-pieces'
    case 'outerwear':
    case 'jaqueta':
    case 'casaco':
      return 'outerwear'
    case 'bags':
    case 'bag':
    case 'bolsa':
      return 'bags'
    case 'glasses':
    case 'oculos':
      return 'glasses'
    case 'jewelry':
    case 'joia':
    case 'jewellery':
      return 'jewelry'
    case 'other-accessory':
    case 'other fashion accessory':
    case 'other-fashion-accessory':
    case 'fashion accessory':
    case 'fashion-accessory':
    case 'accessory':
    case 'acessorio':
    case 'acessÃ³rio':
      return 'other-accessory'
    case 'shoes':
    case 'shoe':
    case 'sapato':
      return 'shoes'
    case 'headwear':
    case 'hat':
    case 'hats':
    case 'cap':
    case 'caps':
    case 'beanie':
    case 'headpiece':
    case 'bone':
    case 'chapeu':
    case 'chapÃ©u':
    case 'chapÃƒÂ©u':
      return 'headwear'
    default:
      return undefined
  }
}

function normalizeAccessoryType(input?: string): string {
  const raw = (input ?? '').trim().toLowerCase()
  switch (raw) {
    case 'bag':
    case 'bags':
    case 'handbag':
    case 'purse':
    case 'tote':
    case 'bolsa':
      return 'bag'
    case 'eyewear':
    case 'glasses':
    case 'sunglasses':
    case 'oculos':
    case 'Ã³culos':
      return 'eyewear'
    case 'jewelry-neck':
    case 'necklace':
    case 'colar':
    case 'pendent':
    case 'pendant':
      return 'jewelry-neck'
    case 'jewelry-ear':
    case 'earring':
    case 'brinco':
    case 'brincos':
      return 'jewelry-ear'
    case 'jewelry-wrist':
    case 'bracelet':
    case 'pulseira':
    case 'watch':
    case 'relogio':
    case 'relÃ³gio':
      return 'jewelry-wrist'
    case 'jewelry-hand':
    case 'ring':
    case 'anel':
      return 'jewelry-hand'
    case 'belt':
    case 'cinto':
      return 'belt'
    case 'scarf':
    case 'lenÃ§o':
    case 'lenco':
    case 'cachecol':
      return 'scarf'
    case 'hair-accessory':
    case 'hair accessory':
    case 'tiara':
    case 'hair clip':
    case 'presilha':
      return 'hair-accessory'
    default:
      return 'other-fashion-accessory'
  }
}

function mapAccessoryTypeToFittingCategory(accessoryType: string): string {
  switch (accessoryType) {
    case 'bag':
      return 'bags'
    case 'eyewear':
      return 'glasses'
    case 'jewelry-neck':
    case 'jewelry-ear':
    case 'jewelry-wrist':
    case 'jewelry-hand':
      return 'jewelry'
    case 'hair-accessory':
      return 'headwear'
    case 'belt':
    case 'scarf':
    case 'other-fashion-accessory':
    default:
      return 'other-accessory'
  }
}

function normalizeAccessoryZone(rawZone: string | undefined, accessoryType: string): FittingZone {
  switch ((rawZone ?? '').trim().toLowerCase()) {
    case 'hands-shoulder':
      return 'hands-shoulder'
    case 'face':
      return 'face'
    case 'head':
      return 'head'
    case 'body-jewelry':
      return 'body-jewelry'
    case 'body-main':
      return 'body-main'
    default:
      return getDefaultAccessoryZone(accessoryType)
  }
}

function normalizeAccessoryConfidence(input?: string): AccessoryConfidence {
  switch ((input ?? '').trim().toLowerCase()) {
    case 'high':
      return 'high'
    case 'low':
      return 'low'
    default:
      return 'medium'
  }
}

function getDefaultAccessoryZone(accessoryType: string): FittingZone {
  switch (accessoryType) {
    case 'bag':
      return 'hands-shoulder'
    case 'eyewear':
      return 'face'
    case 'hair-accessory':
      return 'head'
    case 'jewelry-neck':
    case 'jewelry-ear':
    case 'jewelry-wrist':
    case 'jewelry-hand':
      return 'body-jewelry'
    case 'belt':
    case 'scarf':
    case 'other-fashion-accessory':
    default:
      return 'body-main'
  }
}

function getDefaultAccessoryPlacementSuggestion(accessoryType: string, zone: FittingZone): string {
  switch (accessoryType) {
    case 'bag':
      return 'place the exact bag naturally on the shoulder, arm, or hand with believable strap logic'
    case 'eyewear':
      return 'fit the exact eyewear naturally on the face with correct alignment'
    case 'jewelry-neck':
      return 'place the exact necklace naturally around the neck with realistic drape'
    case 'jewelry-ear':
      return 'place the exact earrings naturally on both ears with believable scale'
    case 'jewelry-wrist':
      return 'place the exact wrist accessory naturally on the wrist with clean contact'
    case 'jewelry-hand':
      return 'place the exact hand jewelry naturally on the fingers or hand with clean contact'
    case 'hair-accessory':
      return 'place the exact hair accessory naturally in the hair or on the head'
    case 'belt':
      return 'place the exact belt naturally at the waist with believable wrap and buckle placement'
    case 'scarf':
      return 'drape the exact scarf naturally around the neck or shoulders while preserving its structure'
    default:
      return zone === 'body-main'
        ? 'place the exact accessory naturally on the relevant body area with believable contact'
        : 'keep natural contact with the correct body zone'
  }
}

function inferFittingCategoryFromReference(profile: ProductProfile, explicitCategory?: string): string {
  if (explicitCategory?.trim()) {
    return normalizeFittingCategory(explicitCategory)
  }

  const haystack = [
    profile.category,
    profile.placement_suggestion,
    ...profile.key_features,
  ]
    .join(' ')
    .toLowerCase()

  if (/(bag|bolsa|purse|handbag|tote|strap)/i.test(haystack)) return 'bags'
  if (/(glasses|sunglasses|oculos|eyewear|frame|lens)/i.test(haystack)) return 'glasses'
  if (/(jewelry|jewellery|joia|earring|necklace|bracelet|ring|watch|pendant)/i.test(haystack)) return 'jewelry'
  if (/(shoe|shoes|sapato|sandalia|sandal|heel|boot|tenis|sneaker)/i.test(haystack)) return 'shoes'
  if (/(hat|hats|cap|caps|beanie|headwear|headpiece|bone|chapeu|chap[eÃ©]u|bucket hat)/i.test(haystack)) return 'headwear'
  if (/(dress|dresses|vestido|macacao|jumpsuit|romper|one-piece|one piece)/i.test(haystack)) return 'one-pieces'
  if (/(pants|trousers|jeans|shorts|saia|skirt|bottom|calca)/i.test(haystack)) return 'bottoms'
  if (/(jacket|coat|blazer|outerwear|casaco|jaqueta|cardigan)/i.test(haystack)) return 'outerwear'
  return 'tops'
}

function normalizeFittingPrompt(userPrompt?: string): { intent: string; removedDirectives: string[] } {
  const raw = userPrompt?.trim()
  if (!raw) return { intent: '', removedDirectives: [] }

  const segments = raw
    .split(/[\n,.;]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)

  const kept: string[] = []
  const removed = new Set<string>()

  for (const segment of segments) {
    const blockedRule = FITTING_PROMPT_BLOCKLIST.find((rule) => rule.pattern.test(segment))
    if (blockedRule) {
      removed.add(blockedRule.label)
      continue
    }
    kept.push(segment)
  }

  return {
    intent: kept.join(', '),
    removedDirectives: Array.from(removed),
  }
}

function getFittingCategoryPreset(category: string): { name: string; instruction: string } {
  switch (category) {
    case 'tops':
      return {
        name: 'tops-exact-application',
        instruction: 'Apply the reference exactly to the upper-body garment zone only. Preserve neckline, straps, sleeves, cutouts, hem, closures, print scale, and every structural detail exactly as shown in the reference while keeping lower-body clothing untouched.',
      }
    case 'bottoms':
      return {
        name: 'bottoms-exact-application',
        instruction: 'Apply the reference exactly to the lower-body garment zone only. Preserve waist placement, rise, length, leg shape, seams, pattern placement, and every visible detail while keeping the upper-body garment untouched.',
      }
    case 'one-pieces':
      return {
        name: 'one-piece-exact-application',
        instruction: 'Apply the reference as one single uninterrupted garment. Preserve full silhouette, cutouts, straps, seams, length, print placement, and every visible structural detail. Do not split it into a top, body, or separate pieces.',
      }
    case 'outerwear':
      return {
        name: 'outerwear-exact-application',
        instruction: 'Apply the reference as a top layer only. Preserve opening logic, shoulder fit, sleeve length, lapels, closures, trim, and every visible detail exactly as shown, without redesigning the layer.',
      }
    case 'bags':
      return {
        name: 'bag-exact-application',
        instruction: 'Keep the base outfit intact and integrate the exact bag naturally on shoulder, arm, or hand. Preserve bag shape, strap length, hardware, compartments, print, and scale exactly as shown.',
      }
    case 'glasses':
      return {
        name: 'glasses-exact-application',
        instruction: 'Keep the base outfit intact and fit the exact glasses naturally to the face. Preserve frame shape, lens tint, bridge, temples, and proportions exactly as shown.',
      }
    case 'jewelry':
      return {
        name: 'jewelry-exact-application',
        instruction: 'Keep the base outfit intact and place the exact jewelry cleanly with believable scale and attachment. Preserve shape, links, stones, metal details, closures, and proportions exactly as shown.',
      }
    case 'shoes':
      return {
        name: 'shoes-exact-application',
        instruction: 'Keep the base outfit intact and replace only the shoes with the exact reference pair. Preserve toe shape, heel height, sole thickness, closures, color blocking, and pair symmetry exactly as shown.',
      }
    case 'headwear':
      return {
        name: 'headwear-exact-application',
        instruction: 'Keep the base outfit intact and place the exact headwear naturally on the head. Preserve crown height, brim or visor shape, closures, trim, pattern placement, and proportions exactly as shown.',
      }
    default:
      return {
        name: 'fashion-default',
        instruction: 'Integrate the exact reference item into the model without redesigning it. Preserve all visible structure, details, proportions, and material cues.',
      }
  }
}

function getFittingPoseInstruction(posePreset?: string): string {
  switch (posePreset) {
    case 'frontal':
      return 'Prefer a front-facing pose only if it helps show the exact item clearly. Keep shoulders balanced and anatomy stable.'
    case 'three-quarter':
      return 'Prefer a three-quarter pose only if it keeps the full item readable and does not hide structural details.'
    case 'full-body':
      return 'Prefer a full-body framing when needed to show the complete item length or silhouette while keeping posture natural.'
    case 'seated':
      return 'Use a seated pose only if the exact item remains clearly visible and no structural detail is hidden or distorted.'
    case 'standing':
      return 'Prefer a standing pose with natural weight distribution if it helps preserve accurate item visibility.'
    case 'hand-in-pocket':
      return 'Use one hand in pocket only if it does not hide or distort the exact item.'
    case 'showing-bag':
      return 'Use a pose that makes the exact bag easy to inspect while keeping strap logic and arm placement natural.'
    case 'adjusting-glasses':
      return 'Use a subtle glasses-adjusting gesture only if frame alignment and item visibility stay accurate.'
    default:
      return 'Use a simple pose that keeps the exact item easy to inspect without hiding any important structural detail.'
  }
}

function getFittingEnergyInstruction(energyPreset?: string): string {
  switch (energyPreset) {
    case 'confiante':
      return 'Use a confident expression and body language only. Do not let that change the item design or fit.'
    case 'sorriso-suave':
      return 'Use a soft approachable smile only if it does not alter the item visibility or identity.'
    case 'editorial-leve':
      return 'Use slightly stronger expression or posture only as a subtle mood cue. Do not restyle, redesign, or beautify the item.'
    default:
      return 'Use natural believable facial energy only. Keep the item itself unchanged.'
  }
}

function getComposeAspectRatioInstruction(aspectRatio?: string): string {
  const aspectLabel: Record<string, string> = {
    '9:16': 'vertical 9:16 portrait',
    '4:5': 'vertical 4:5 portrait',
    '1:1': 'square 1:1',
    '16:9': 'horizontal 16:9 landscape',
    '3:4': 'vertical 3:4 portrait',
  }

  const selected = aspectLabel[aspectRatio ?? '9:16'] ?? 'vertical 9:16 portrait'
  return `Compose the output in ${selected} format. Ensure the full person fits in frame and the key item remains clearly visible without awkward cropping.`
}

type FittingRoute =
  | 'provador-single'
  | 'provador-multi'
  | 'single-look-rebuild'
  | 'vertex-vto-wear'
  | 'vertex-vto-look'
  | 'gemini-hold'
  | 'gemini-hold-accessories'
  | 'gemini-look-sequential'
type FittingReferenceMode = 'single-look-photo' | 'separate-references'
type FittingReferenceModeInternal = 'direct-single-photo' | 'auto-split-from-single-photo' | 'separate-references'
type FittingGroup = 'wearables' | 'fashion_accessories'
type FittingStrategy = 'vertex_only' | 'gemini_only_accessories' | 'hybrid_vertex_gemini' | 'gemini_provador'
type FittingReferenceMixMode =
  | 'single-look-photo'
  | 'separate-references-wearables-only'
  | 'separate-references-mixed'
  | 'separate-references-accessories-only-auto'
  | 'separate-references-accessories-only-explicit'
type FittingGroupRequestMode = 'auto' | 'legacy-explicit'
type ProvadorPricingTier = 'gemini_only_accessories' | 'vertex_only' | 'hybrid_vertex_gemini' | 'hybrid_vertex_gemini_editorial'
type FittingZone = 'body-main' | 'feet' | 'face' | 'head' | 'hands-shoulder' | 'body-jewelry'
type FittingGenerationStrategy =
  | 'bounded-full-look'
  | 'single-photo-whole-look'
  | 'single-photo-segmented-sequential'
  | 'single-photo-hold-item'
  | 'multi-ref-batch'
  | 'multi-ref-sequential'
  | 'multi-ref-hold-item'
  | 'gemini-look-sequential'
  | 'gemini-look-sequential-partial'
  | 'guided-fail-before-generation'
  | 'guided-fail-after-qc'

type ProvadorMode = 'single_anchor' | 'dual_garment' | 'accessory_only'

type ReferencePaddingMode = 'standard' | 'full-length-vertical'

type SinglePhotoRescuePolicy = {
  policy: 'selective-long-look'
  referencePaddingMode: ReferencePaddingMode
  rescueEligible: boolean
  rescueTrigger: string
}

type ComposeSceneResult = {
  url: string
  extraData?: Record<string, unknown>
}

type VertexTryOnExecutionMode = 'single-photo-whole-look' | 'multi-ref-batch' | 'multi-ref-sequential' | 'single-item'

type VertexTryOnCallResult = {
  imageBase64: string | null
  productCountRequested: number
  productCountSent: number
  executionMode: VertexTryOnExecutionMode
  predictionCount: number
}

type GeminiImageCallResult = {
  imageBase64: string | null
  modelUsed?: string
}

type EstimatedProviderCostBreakdown = {
  analysis_overhead_usd: number
  vertex_call_count: number
  vertex_total_usd: number
  gemini_3_pro_call_count: number
  gemini_3_pro_total_usd: number
  gemini_3_1_flash_call_count: number
  gemini_3_1_flash_total_usd: number
  gemini_2_5_flash_call_count: number
  gemini_2_5_flash_total_usd: number
  total_usd: number
}

type ProvadorPricingPreflight = {
  pricingStrategy: 'fixed_tier_conservative'
  pricingTier: ProvadorPricingTier
  fittingStrategy: FittingStrategy
  fittingGroup: FittingGroup
  fittingGroupRequestMode: FittingGroupRequestMode
  referenceMode: FittingReferenceMode
  referenceMixMode: FittingReferenceMixMode
  creditsCost: number
  editorialFinisherEligible: boolean
  primaryWearableCategory?: string
  accessoryDetectedTypes: string[]
  ignoredPropTypes: string[]
  singlePhotoPrimaryProductType?: string
  singlePhotoGarmentPriorityApplied?: boolean
  estimatedProviderCostUsd: number
  estimatedCostBreakdown: EstimatedProviderCostBreakdown
}

const PROVADOR_TIER_CREDITS: Record<ProvadorPricingTier, number> = {
  gemini_only_accessories: 14,
  vertex_only: 16,
  hybrid_vertex_gemini: 20,
  hybrid_vertex_gemini_editorial: 24,
}

const PROVADOR_PROVIDER_COST_USD = {
  vertex_vto_call: 0.06,
  gemini_3_pro_image_call: 0.14,
  gemini_3_1_flash_image_call: 0.07,
  gemini_2_5_flash_image_call: 0.02,
  analysis_overhead: 0.03,
} as const

type LookSplitReference = {
  category: string
  url: string
  rank: number
  zone: FittingZone
  description: string
}

type GuidedSplitReference = {
  id: string
  asset_id: string
  source: 'auto-split-from-single-look-photo'
  category: string
  role: 'vertex-core' | 'overlay-only'
  image_url: string
  confidence: number
  qc_status: 'ready' | 'weak' | 'failed'
  zone: FittingZone
  description: string
}

type LookSplitResult = {
  url: string
  extraData?: Record<string, unknown>
}

type NormalizedImageAsset = {
  buffer: Buffer
  mimeType: 'image/png' | 'image/jpeg'
}

type VertexProjectConfig = {
  projectId: string
  location: string
  token: string
}

type BoundingBox = {
  left: number
  top: number
  width: number
  height: number
  area: number
}

type SegmentedFittingItem = {
  imageBuffer: Buffer
  mimeType: string
  bbox: BoundingBox
  profile: ProductProfile
  category: string
  description: string
  priority: number
  sourceIndex?: number
}

type SegmentedReferenceSet = {
  items: SegmentedFittingItem[]
  totalDetected: number
  omittedCount: number
}

type StudioFailureContext = {
  studioFailureData?: Record<string, unknown>
  studioRefundReason?: string
}

const STRUCTURAL_CATEGORIES = ['outerwear', 'tops', 'bottoms', 'dress', 'fullbody', 'one-pieces'] as const
const ACCESSORY_CATEGORIES = [
  'headwear',
  'bags',
  'jewelry',
  'eyewear',
  'glasses',
  'belt',
  'scarf',
  'hair-accessory',
  'other-fashion-accessory',
  'other-accessory',
] as const

function isWearableFittingCategory(category: string): boolean {
  return ['tops', 'bottoms', 'one-pieces', 'outerwear', 'shoes', 'headwear'].includes(category)
}

function isBodyAccessoryFittingCategory(category: string): boolean {
  return ['bags', 'glasses', 'eyewear', 'jewelry', 'other-accessory', 'belt', 'scarf', 'hair-accessory', 'other-fashion-accessory'].includes(category)
}

function isAccessoryCompatibleFittingCategory(category: string): boolean {
  return ['bags', 'glasses', 'eyewear', 'jewelry', 'headwear', 'other-accessory', 'belt', 'scarf', 'hair-accessory', 'other-fashion-accessory'].includes(category)
}

function getFittingRoutePriority(category: string): number {
  switch (category) {
    case 'one-pieces':
      return 100
    case 'outerwear':
      return 95
    case 'tops':
      return 90
    case 'bottoms':
      return 88
    case 'shoes':
      return 72
    case 'headwear':
      return 64
    case 'bags':
      return 58
    case 'glasses':
      return 44
    case 'jewelry':
      return 42
    case 'other-accessory':
      return 40
    default:
      return 20
  }
}

function buildSegmentedItemDescription(profile: ProductProfile, category: string): string {
  const keyFeatures = profile.key_features.filter(Boolean).slice(0, 6).join(', ')
  const featureBlock = keyFeatures ? ` Key details: ${keyFeatures}.` : ''
  return `Exact ${category} reference item. Preserve literal category, shape, proportions, print, trims, closures, and visible construction exactly as supplied.${featureBlock}`
}

function getSinglePhotoReferenceSignalText(profile: ProductProfile, category: string): string {
  return [
    category,
    profile.category,
    profile.placement_suggestion,
    ...profile.key_features,
  ]
    .join(' ')
    .toLowerCase()
}

function isLongLookRiskCategory(profile: ProductProfile, category: string): boolean {
  if (category === 'outerwear' || category === 'one-pieces') return true
  if (category !== 'tops') return false

  const haystack = getSinglePhotoReferenceSignalText(profile, category)
  return /(coat|casaco|trench|blazer|cardigan|lapel|lapels|double-breasted|double breasted|buttons|closures|closure|long\b|below-knee|below knee|full-length|full length|sleeves|sleeve length)/i.test(haystack)
}

function getSinglePhotoRescuePolicy(
  profile: ProductProfile,
  category: string,
  qc?: CompositionQuality,
): SinglePhotoRescuePolicy {
  const highRiskLongLook = isLongLookRiskCategory(profile, category)
  const referencePaddingMode: ReferencePaddingMode = highRiskLongLook ? 'full-length-vertical' : 'standard'
  if (!qc) {
    return {
      policy: 'selective-long-look',
      referencePaddingMode,
      rescueEligible: false,
      rescueTrigger: highRiskLongLook ? 'awaiting-qc-long-look' : 'awaiting-qc-standard-look',
    }
  }

  const weakest = (qc.weakest_dimension ?? '').toUpperCase()
  const issueText = (qc.issues ?? []).join(' ').toLowerCase()
  const dimensionEligible =
    /ITEM[_\s-]*FIDELITY/.test(weakest)
    || /FIT AND PLACEMENT/.test(weakest)
    || (/MODEL IDENTITY/.test(weakest) && /(crop|cropped|hidden|length|long|buttons|closures|closure|sleeves|silhouette|coat|lapel)/i.test(issueText))
  const issueEligible =
    /(crop|cropped|extreme crop|hidden|length|long|hem|buttons|hardware|closures|closure|sleeves|sleeve length|simplified silhouette|silhouette|category|different kind of product|lapel|lapels|double-breasted|double breasted|coat|outerwear)/i.test(issueText)

  return {
    policy: 'selective-long-look',
    referencePaddingMode,
    rescueEligible: highRiskLongLook && dimensionEligible && issueEligible,
    rescueTrigger: `${qc.weakest_dimension ?? 'unknown'} | ${qc.issues?.slice(0, 2).join(' | ') || 'no-issues'}`,
  }
}

function getExplicitFittingCategoryHint(input?: string): string | undefined {
  if (!input?.trim()) return undefined
  return normalizeFittingCategory(input)
}

function inferFittingCategoryWithHint(profile: ProductProfile, explicitCategory?: string): string {
  const inferredCategory = inferFittingCategoryFromReference(profile)
  const normalizedHint = getExplicitFittingCategoryHint(explicitCategory)
  if (!normalizedHint) return inferredCategory
  return inferredCategory === normalizedHint ? normalizedHint : inferredCategory
}

function attachStudioFailureContext(
  error: Error,
  failureData: Record<string, unknown>,
  refundReason = 'guided-fail',
): Error & StudioFailureContext {
  const enrichedError = error as Error & StudioFailureContext
  enrichedError.studioFailureData = failureData
  enrichedError.studioRefundReason = refundReason
  return enrichedError
}

function failGuidedFitting(
  message: string,
  failureData: Record<string, unknown>,
  refundReason: string,
): never {
  throw attachStudioFailureContext(new Error(message), failureData, refundReason)
}

function normalizeRequestedFittingGroup(value?: string): FittingGroup | undefined {
  if (value === 'wearables' || value === 'fashion_accessories') return value
  return undefined
}

function inferFittingGroup(params: {
  requestedGroup?: FittingGroup
  explicitCategoryHint?: string
  detectedItems: SegmentedFittingItem[]
}): FittingGroup {
  if (params.explicitCategoryHint && isBodyAccessoryFittingCategory(params.explicitCategoryHint)) {
    return 'fashion_accessories'
  }

  if (params.requestedGroup) return params.requestedGroup

  if (
    params.detectedItems.length > 0
    && params.detectedItems.every((item) => isBodyAccessoryFittingCategory(item.category))
  ) {
    return 'fashion_accessories'
  }

  return 'wearables'
}

function buildFittingGroupMismatchMessage(group: FittingGroup): string {
  if (group === 'fashion_accessories') {
    return 'Essas referencias parecem incluir roupa, calcado ou headwear. Envie apenas acessorios separados ou mantenha tambem a roupa principal para o Provador decidir tudo automaticamente.'
  }

  return 'Essas referencias parecem conter so acessorios de moda. Se quiser vestir o look completo, envie tambem a referencia principal da roupa ou do calcado.'
}

function buildMixedSinglePhotoAccessoryMessage(): string {
  return 'Essa imagem mistura roupa com acessorios. Para melhor fidelidade, envie referencias separadas da roupa e dos acessorios, ou use a foto unica do look completo.'
}

function getFittingGroupRequestMode(requestedGroup?: FittingGroup): FittingGroupRequestMode {
  return requestedGroup ? 'legacy-explicit' : 'auto'
}

function getFittingReferenceMixMode(params: {
  referenceMode: FittingReferenceMode
  fittingGroup: FittingGroup
  requestedGroup?: FittingGroup
  selectedAccessoryAnalysisCount: number
}): FittingReferenceMixMode {
  if (params.referenceMode === 'single-look-photo') return 'single-look-photo'
  if (params.fittingGroup === 'fashion_accessories') {
    return params.requestedGroup
      ? 'separate-references-accessories-only-explicit'
      : 'separate-references-accessories-only-auto'
  }
  if (params.selectedAccessoryAnalysisCount > 0) return 'separate-references-mixed'
  return 'separate-references-wearables-only'
}

function logFittingQc(params: {
  mode: 'single-look-photo' | 'separate-references'
  route: FittingRoute
  stage: string
  categories: string[]
  approved: boolean
  weakestDimension?: string | null
  issues?: string[]
}) {
  const logLine = [
    '[studio] fitting qc',
    `stage=${params.stage}`,
    `mode=${params.mode}`,
    `route=${params.route}`,
    `categories=${params.categories.join(',') || 'none'}`,
    `approved=${params.approved ? 'yes' : 'no'}`,
    `weakest=${params.weakestDimension ?? 'n/a'}`,
    `issues=${params.issues?.join(' | ') || 'none'}`,
  ].join(' | ')

  if (params.approved) {
    console.log(logLine)
  } else {
    console.warn(logLine)
  }
}

function getFittingZone(category: string): FittingZone {
  switch (category) {
    case 'shoes':
      return 'feet'
    case 'glasses':
      return 'face'
    case 'headwear':
      return 'head'
    case 'bags':
      return 'hands-shoulder'
    case 'jewelry':
      return 'body-jewelry'
    case 'other-accessory':
      return 'body-main'
    default:
      return 'body-main'
  }
}

function buildAccessorySyntheticProfile(item: AccessoryReferenceItem): ProductProfile {
  return {
    category: item.accessoryType,
    has_text_logo: false,
    deformation_risk: item.confidence === 'high' ? 'low' : 'medium',
    shape_complexity: item.keyFeatures.length > 3 ? 'complex' : 'medium',
    placement_suggestion: item.placementSuggestion,
    key_features: item.keyFeatures,
  }
}

function buildAccessorySegmentedItemsFromAnalyses(
  analyses: AccessoryReferenceAnalysis[],
): SegmentedFittingItem[] {
  return analyses.flatMap((analysis) => analysis.items.map((item) => ({
    imageBuffer: analysis.normalizedImage.buffer,
    mimeType: analysis.normalizedImage.mimeType,
    bbox: { left: 0, top: 0, width: 1, height: 1, area: 1 },
    profile: buildAccessorySyntheticProfile(item),
    category: item.fittingCategory,
    description: `Exact accessory reference. Type: ${item.accessoryType}. ${item.description}. Placement: ${item.placementSuggestion}.${item.keyFeatures.length > 0 ? ` Key details: ${item.keyFeatures.join(', ')}.` : ''}`,
    priority: getFittingRoutePriority(item.fittingCategory),
    sourceIndex: analysis.sourceIndex,
  })))
}

function buildSyntheticAccessoryAnalysisFromSegmentedItem(item: SegmentedFittingItem): AccessoryReferenceAnalysis {
  const accessoryType = item.category === 'headwear' ? 'headwear' : 'other-fashion-accessory'
  const zone = getFittingZone(item.category)

  return {
    sourceIndex: item.sourceIndex ?? 0,
    referenceUrl: '',
    referenceKind: 'single-item',
    containsAccessories: true,
    hasSupportingClothingContext: false,
    ignoredNonFashionProps: [],
    reportedAccessoryCount: 1,
    accessoryCount: 1,
    items: [{
      accessoryType,
      fittingCategory: item.category,
      zone,
      description: item.description,
      placementSuggestion: item.profile.placement_suggestion || 'place the exact accessory naturally with believable body contact',
      keyFeatures: item.profile.key_features,
      confidence: 'high',
    }],
    normalizedImage: {
      buffer: item.imageBuffer,
      mimeType: item.mimeType === 'image/jpeg' ? 'image/jpeg' : 'image/png',
    },
  }
}

async function buildGuidedAccessoryAnalysisFromReference(reference: GuidedSplitReference): Promise<AccessoryReferenceAnalysis | null> {
  if (!reference.image_url?.startsWith('http')) return null

  try {
    const response = await fetch(reference.image_url)
    if (!response.ok) return null
    const normalizedImage = await normalizeImageForVertex(Buffer.from(await response.arrayBuffer()), 'png')
    const accessoryType =
      reference.category === 'headwear'
        ? 'headwear'
        : reference.category === 'bags'
          ? 'bag'
          : reference.category === 'eyewear' || reference.category === 'glasses'
            ? 'eyewear'
            : reference.category === 'belt'
              ? 'belt'
              : reference.category === 'scarf'
                ? 'scarf'
                : reference.category === 'hair-accessory'
                  ? 'hair-accessory'
                  : reference.category === 'jewelry'
                    ? 'jewelry-wrist'
                    : 'other-fashion-accessory'
    const fittingCategory = mapAccessoryTypeToFittingCategory(accessoryType)
    return {
      sourceIndex: 0,
      referenceUrl: reference.image_url,
      referenceKind: 'single-item',
      containsAccessories: true,
      hasSupportingClothingContext: false,
      ignoredNonFashionProps: [],
      reportedAccessoryCount: 1,
      accessoryCount: 1,
      items: [{
        accessoryType,
        fittingCategory,
        zone: getFittingZone(fittingCategory),
        description: reference.description,
        placementSuggestion: `Place the exact ${reference.category} naturally with believable body contact.`,
        keyFeatures: [],
        confidence: 'high',
      }],
      normalizedImage,
    }
  } catch {
    return null
  }
}

async function uploadGuidedSplitReferences(params: {
  sourceBuffer: Buffer
  items: SegmentedFittingItem[]
  assetId: string
  userId: string
}): Promise<GuidedSplitReference[]> {
  const admin = createAdminClient()
  const { normalizedBuffer, maskRaw, width, height } = await buildForegroundMaskArtifacts(params.sourceBuffer)
  const references: GuidedSplitReference[] = []

  for (let index = 0; index < params.items.length; index += 1) {
    const item = params.items[index]
    const transparentCrop = await cropTransparentSegmentedItem(normalizedBuffer, maskRaw, width, height, item.bbox)
    const path = `${params.userId}/${params.assetId}-guided-split-${index + 1}.png`
    const { error: uploadError } = await admin.storage
      .from('studio')
      .upload(path, transparentCrop.imageBuffer, { contentType: 'image/png', upsert: true })

    if (uploadError) {
      throw new Error(`Falha ao salvar referencia guiada ${index + 1}: ${uploadError.message}`)
    }

    const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
    references.push({
      id: `${params.assetId}-guided-${index + 1}`,
      asset_id: params.assetId,
      source: 'auto-split-from-single-look-photo',
      category: item.category,
      role: getGuidedSplitRole(item.category),
      image_url: publicUrl,
      confidence: 0.9,
      qc_status: 'ready',
      zone: getFittingZone(item.category),
      description: item.description,
    })
  }

  return references
}

async function uploadGuidedAccessoryReferencesFromAnalyses(params: {
  analyses: AccessoryReferenceAnalysis[]
  assetId: string
  userId: string
}): Promise<GuidedSplitReference[]> {
  const admin = createAdminClient()
  const references: GuidedSplitReference[] = []

  for (let analysisIndex = 0; analysisIndex < params.analyses.length; analysisIndex += 1) {
    const analysis = params.analyses[analysisIndex]
    const path = `${params.userId}/${params.assetId}-guided-overlay-${analysisIndex + 1}.png`
    const { error: uploadError } = await admin.storage
      .from('studio')
      .upload(path, analysis.normalizedImage.buffer, { contentType: analysis.normalizedImage.mimeType, upsert: true })

    if (uploadError) {
      throw new Error(`Falha ao salvar referencia guiada de acessorio ${analysisIndex + 1}: ${uploadError.message}`)
    }

    const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)

    for (let itemIndex = 0; itemIndex < analysis.items.length; itemIndex += 1) {
      const item = analysis.items[itemIndex]
      references.push({
        id: `${params.assetId}-guided-overlay-${analysisIndex + 1}-${itemIndex + 1}`,
        asset_id: params.assetId,
        source: 'auto-split-from-single-look-photo',
        category: collectOverlayOnlyAccessoryCategories([{ ...analysis, items: [item] }])[0] ?? item.fittingCategory,
        role: 'overlay-only',
        image_url: publicUrl,
        confidence: item.confidence === 'high' ? 0.9 : item.confidence === 'medium' ? 0.75 : 0.6,
        qc_status: item.confidence === 'low' ? 'weak' : 'ready',
        zone: item.zone,
        description: item.description,
      })
    }
  }

  return references
}

function collectAccessoryZones(analyses: AccessoryReferenceAnalysis[]): FittingZone[] {
  return analyses.flatMap((analysis) => analysis.items.map((item) => item.zone))
}

function collectAccessoryTypes(analyses: AccessoryReferenceAnalysis[]): string[] {
  return analyses.flatMap((analysis) => analysis.items.map((item) => item.accessoryType))
}

function collectIgnoredPropTypes(analyses: AccessoryReferenceAnalysis[]): string[] {
  return Array.from(new Set(
    analyses.flatMap((analysis) => analysis.ignoredNonFashionProps.map((item) => item.trim().toLowerCase()).filter(Boolean)),
  ))
}

function filterAccessoryAnalysisItems(analysis: AccessoryReferenceAnalysis): AccessoryReferenceAnalysis {
  const confidentItems = analysis.items.filter((item) => item.confidence !== 'low')
  return {
    ...analysis,
    items: confidentItems.length > 0 ? confidentItems : analysis.items,
    accessoryCount: confidentItems.length > 0 ? confidentItems.length : analysis.items.length,
  }
}

function sumReportedAccessoryCount(analyses: AccessoryReferenceAnalysis[]): number {
  return analyses.reduce((sum, analysis) => sum + analysis.reportedAccessoryCount, 0)
}

function isStructuralBodyCategory(category: string): boolean {
  return ['tops', 'bottoms', 'one-pieces', 'outerwear'].includes(category)
}

function collectSingleLookStructuralCategories(params: {
  detectedItems: SegmentedFittingItem[]
  wholeImageCategory?: string
  wearableAnalysis?: SingleLookWearableAnalysis | null
}): string[] {
  const detectedStructural = params.detectedItems
    .map((item) => item.category)
    .filter((category) => isStructuralBodyCategory(category))
  const wholeImageStructural = params.wholeImageCategory && isStructuralBodyCategory(params.wholeImageCategory)
    ? [params.wholeImageCategory]
    : []
  const analysisStructural = params.wearableAnalysis
    ? [
        params.wearableAnalysis.primary_category,
        ...params.wearableAnalysis.secondary_categories,
      ]
        .map((category) => parseKnownFittingCategory(category))
        .filter((category): category is string => typeof category === 'string' && category.length > 0)
        .filter((category) => isStructuralBodyCategory(category))
    : []

  return Array.from(new Set([
    ...detectedStructural,
    ...wholeImageStructural,
    ...analysisStructural,
  ]))
}

function deriveSinglePhotoPrimaryProductType(params: {
  structuralCategories: string[]
  primaryWearableCategory?: string
}): string {
  const categories = params.structuralCategories
  if (categories.includes('tops') && categories.includes('bottoms')) return 'matching_set'
  if (categories.includes('outerwear') && categories.length > 1) return 'outerwear_look'
  if (categories.includes('one-pieces')) return 'one_piece_look'
  return params.primaryWearableCategory ?? categories[0] ?? 'single_garment'
}

function shouldPrioritizeGarmentLookboard(params: {
  fittingInputMode: FittingReferenceMode
  detectedItems: SegmentedFittingItem[]
  wholeImageCategory?: string
  wearableAnalysis?: SingleLookWearableAnalysis | null
}): boolean {
  if (params.fittingInputMode !== 'single-look-photo') return false
  return collectSingleLookStructuralCategories({
    detectedItems: params.detectedItems,
    wholeImageCategory: params.wholeImageCategory,
    wearableAnalysis: params.wearableAnalysis,
  }).length > 0
}

function collectOverlayOnlyAccessoryCategories(analyses: AccessoryReferenceAnalysis[]): string[] {
  const values = analyses.flatMap((analysis) => analysis.items.map((item) => {
    switch (item.accessoryType) {
      case 'bag':
        return 'bags'
      case 'eyewear':
        return 'eyewear'
      case 'belt':
        return 'belt'
      case 'scarf':
        return 'scarf'
      case 'hair-accessory':
        return 'hair-accessory'
      case 'jewelry-neck':
      case 'jewelry-ear':
      case 'jewelry-wrist':
      case 'jewelry-hand':
        return 'jewelry'
      default:
        return item.fittingCategory || 'other-fashion-accessory'
    }
  }))

  return Array.from(new Set(values.filter(Boolean)))
}

function isOuterwearSplitStructuralCategory(category: string): boolean {
  return STRUCTURAL_CATEGORIES.includes(category as (typeof STRUCTURAL_CATEGORIES)[number])
}

function isOuterwearSplitAccessoryCategory(category: string): boolean {
  return ACCESSORY_CATEGORIES.includes(category as (typeof ACCESSORY_CATEGORIES)[number])
}

function shouldRequireOuterwearSplit(params: {
  fittingInputMode: string
  detectedCategories: string[]
  primaryWearableCategory?: string
}): boolean {
  const hasOuterwear = params.detectedCategories.includes('outerwear')
  const structuralCount = params.detectedCategories.filter((category) => isOuterwearSplitStructuralCategory(category)).length
  const accessoryCount = params.detectedCategories.filter((category) => isOuterwearSplitAccessoryCategory(category)).length

  return (
    params.fittingInputMode === 'single-look-photo'
    && hasOuterwear
    && structuralCount >= 2
    && (params.primaryWearableCategory === 'outerwear' || accessoryCount > 0)
  )
}

function getGuidedSplitRole(category: string): 'vertex-core' | 'overlay-only' {
  return isStructuralBodyCategory(category) ? 'vertex-core' : 'overlay-only'
}

function rankGuidedSplitCoreCategory(category: string): number {
  switch (category) {
    case 'outerwear':
      return 100
    case 'one-pieces':
      return 96
    case 'tops':
      return 92
    case 'bottoms':
      return 88
    default:
      return 20
  }
}

function normalizeGuidedOverlayReferences(value: unknown): GuidedSplitReference[] {
  if (!Array.isArray(value)) return []

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .filter((item) => typeof item.image_url === 'string' && item.image_url.trim().length > 0)
    .map((item, index) => ({
      id: typeof item.id === 'string' ? item.id : `guided-overlay-${index + 1}`,
      asset_id: typeof item.asset_id === 'string' ? item.asset_id : '',
      source: 'auto-split-from-single-look-photo',
      category: typeof item.category === 'string' ? item.category : 'other-accessory',
      role: item.role === 'vertex-core' ? 'vertex-core' : 'overlay-only',
      image_url: String(item.image_url),
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.8,
      qc_status: item.qc_status === 'weak' || item.qc_status === 'failed' ? item.qc_status : 'ready',
      zone: getFittingZone(typeof item.category === 'string' ? item.category : 'other-accessory'),
      description: typeof item.description === 'string' ? item.description : 'Guided split accessory reference',
    }))
}

function canCombineBodyCategories(selectedCategories: string[], candidateCategory: string): boolean {
  if (selectedCategories.includes(candidateCategory)) return false

  if (candidateCategory === 'one-pieces') {
    return !selectedCategories.some((category) => category === 'one-pieces' || category === 'tops' || category === 'bottoms')
  }

  if (candidateCategory === 'tops' || candidateCategory === 'bottoms') {
    return !selectedCategories.includes('one-pieces')
  }

  return true
}

function sortProvadorStructuralItems(items: SegmentedFittingItem[]): SegmentedFittingItem[] {
  return [...items].sort((a, b) => {
    const rankDelta = rankGuidedSplitCoreCategory(b.category) - rankGuidedSplitCoreCategory(a.category)
    if (rankDelta !== 0) return rankDelta
    if (b.priority !== a.priority) return b.priority - a.priority
    return b.bbox.area - a.bbox.area
  })
}

function classifyProvadorSelection(params: {
  selectedItems: SegmentedFittingItem[]
  selectedAccessoryDetailItems: SegmentedFittingItem[]
  referenceMode: FittingReferenceMode
}): {
  mode: ProvadorMode
  dominantCategory: string
  blockingStructuralItems: SegmentedFittingItem[]
  remainingStructuralItems: SegmentedFittingItem[]
  optionalOverlayItems: SegmentedFittingItem[]
  structuralCategories: string[]
  accessoryCategories: string[]
  blockingItemCount: number
  autoSplitConfidence: number
  recoveryPlan: string
} {
  const structuralItems = sortProvadorStructuralItems(
    params.selectedItems.filter((item) => isStructuralBodyCategory(item.category)),
  )
  const structuralCategories = Array.from(new Set(structuralItems.map((item) => item.category)))
  const accessoryItems = params.selectedAccessoryDetailItems.filter((item) => isAccessoryCompatibleFittingCategory(item.category))
  const accessoryCategories = Array.from(new Set(accessoryItems.map((item) => item.category)))

  let blockingStructuralItems: SegmentedFittingItem[] = []

  const onePiece = structuralItems.find((item) => item.category === 'one-pieces')
  const outerwear = structuralItems.find((item) => item.category === 'outerwear')
  const top = structuralItems.find((item) => item.category === 'tops')
  const bottom = structuralItems.find((item) => item.category === 'bottoms')

  if (onePiece) {
    blockingStructuralItems = [onePiece]
  } else if (outerwear) {
    blockingStructuralItems = [outerwear]
    if (bottom) {
      blockingStructuralItems.push(bottom)
    } else if (top) {
      blockingStructuralItems.push(top)
    } else {
      const fallbackSecond = structuralItems.find((item) => item !== outerwear)
      if (fallbackSecond) blockingStructuralItems.push(fallbackSecond)
    }
  } else if (top && bottom) {
    blockingStructuralItems = [top, bottom]
  } else {
    blockingStructuralItems = structuralItems.slice(0, 2)
  }

  const optionalOverlayItems = accessoryItems.filter((item, index, array) => (
    array.findIndex((candidate) => (
      candidate.category === item.category
      && candidate.sourceIndex === item.sourceIndex
    )) === index
  ))
  const blockingItemCount = blockingStructuralItems.length
  const remainingStructuralItems = structuralItems.filter((item) => !blockingStructuralItems.includes(item))
  const dominantCategory = blockingStructuralItems[0]?.category ?? accessoryCategories[0] ?? params.selectedItems[0]?.category ?? 'unknown'
  const mode: ProvadorMode =
    blockingItemCount >= 2 ? 'dual_garment'
      : blockingItemCount === 1 ? 'single_anchor'
        : 'accessory_only'

  return {
    mode,
    dominantCategory,
    blockingStructuralItems,
    remainingStructuralItems,
    optionalOverlayItems,
    structuralCategories,
    accessoryCategories,
    blockingItemCount,
    autoSplitConfidence: params.referenceMode === 'single-look-photo'
      ? (blockingItemCount > 0 ? 0.84 : 0.52)
      : 0.92,
    recoveryPlan: params.referenceMode === 'single-look-photo'
      ? 'auto_split_internal_first'
      : 'bounded_retry_then_finish',
  }
}

function dedupeProvadorItems(items: SegmentedFittingItem[]): SegmentedFittingItem[] {
  const seen = new Set<string>()
  const deduped: SegmentedFittingItem[] = []

  for (const item of items) {
    const key = [
      item.sourceIndex ?? 'na',
      item.category,
      item.description.trim().toLowerCase(),
      item.bbox.left,
      item.bbox.top,
      item.bbox.width,
      item.bbox.height,
    ].join(':')
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
  }

  return deduped
}

function extractLookSplitRequestedCategories(note?: string): string[] {
  const raw = note?.trim().toLowerCase()
  if (!raw) return []

  const matches: string[] = []
  const categoryMatchers: Array<{ category: string; pattern: RegExp }> = [
    { category: 'outerwear', pattern: /\b(casaco|jaqueta|blazer|trench|sobretudo|coat|jacket|outerwear)\b/i },
    { category: 'tops', pattern: /\b(blusa|camisa|camiseta|top|shirt|tee|blouse|regata)\b/i },
    { category: 'bottoms', pattern: /\b(calca|calÃ§a|jeans|saia|short|shorts|pants|trousers|skirt|bottom)\b/i },
    { category: 'one-pieces', pattern: /\b(vestido|macacao|macacÃ£o|jumpsuit|romper|dress|one[\s-]?piece)\b/i },
    { category: 'shoes', pattern: /\b(sapato|sapatos|tenis|tÃªnis|bota|sandalia|sandÃ¡lia|shoe|shoes|sneaker|boot|heel|heels)\b/i },
    { category: 'bags', pattern: /\b(bolsa|bag|handbag|purse|tote)\b/i },
    { category: 'headwear', pattern: /\b(chapeu|chapÃ©u|bone|bonÃ©|hat|cap|beanie|bucket hat)\b/i },
  ]

  for (const matcher of categoryMatchers) {
    if (matcher.pattern.test(raw)) matches.push(matcher.category)
  }

  return Array.from(new Set(matches))
}

function selectFittingItemsForLook(
  items: SegmentedFittingItem[],
  maxItems = 3,
  options?: {
    preferredCategories?: string[]
    includeAccessoryCategories?: string[]
  },
): {
  items: SegmentedFittingItem[]
  omittedCount: number
  selectedZones: FittingZone[]
} {
  const preferredCategories = new Set(options?.preferredCategories ?? [])
  const includeAccessoryCategories = new Set(options?.includeAccessoryCategories ?? [])
  const rankedItems = [...items].sort((a, b) => {
    const aPreferred = preferredCategories.has(a.category) ? 1 : 0
    const bPreferred = preferredCategories.has(b.category) ? 1 : 0
    if (bPreferred !== aPreferred) return bPreferred - aPreferred
    if (b.priority !== a.priority) return b.priority - a.priority
    return b.bbox.area - a.bbox.area
  })

  const selected: SegmentedFittingItem[] = []
  const bodyCategories: string[] = []

  for (const item of rankedItems) {
    if (!isStructuralBodyCategory(item.category)) continue
    if (selected.length >= maxItems) break
    if (!canCombineBodyCategories(bodyCategories, item.category)) continue

    selected.push(item)
    bodyCategories.push(item.category)
  }

  for (const item of rankedItems) {
    if (selected.length >= maxItems) break
    if (selected.includes(item)) continue
    if (!includeAccessoryCategories.has(item.category)) continue
    selected.push(item)
  }

  if (selected.length === 0) {
    const fallback = rankedItems.slice(0, maxItems)
    return {
      items: fallback,
      omittedCount: Math.max(0, rankedItems.length - fallback.length),
      selectedZones: fallback.map((item) => getFittingZone(item.category)),
    }
  }

  return {
    items: selected,
    omittedCount: Math.max(0, rankedItems.length - selected.length),
    selectedZones: selected.map((item) => getFittingZone(item.category)),
  }
}

function validateSeparateReferenceItems(items: SegmentedFittingItem[]): string | null {
  const bodyCategories: string[] = []
  const accessoryZones = new Map<FittingZone, string>()

  for (const item of items) {
    if (isStructuralBodyCategory(item.category)) {
      if (!canCombineBodyCategories(bodyCategories, item.category)) {
        return 'As referencias enviadas entram em conflito para o mesmo look. Envie 2-3 referencias separadas sem repetir a mesma peca principal.'
      }
      bodyCategories.push(item.category)
      continue
    }

    const zone = getFittingZone(item.category)
    if (accessoryZones.has(zone)) {
      return 'As referencias extras repetem a mesma zona do corpo. Envie uma referencia por acessorio ou peca para cada area.'
    }
    accessoryZones.set(zone, item.category)
  }

  return null
}

async function resolveVertexProjectConfig(): Promise<VertexProjectConfig> {
  const vertexKey = process.env.GOOGLE_VERTEX_KEY
  if (!vertexKey) throw new Error('GOOGLE_VERTEX_KEY nao configurada para o Provador')

  let projectId = process.env.VERTEX_PROJECT_ID
  if (!projectId) {
    try {
      const parsed = JSON.parse(vertexKey.startsWith('"') ? JSON.parse(vertexKey) : vertexKey)
      projectId = parsed.project_id
    } catch (error) {
      console.warn('[studio] Nao foi possivel extrair VERTEX_PROJECT_ID da chave JSON:', error)
    }
  }

  if (!projectId) throw new Error('VERTEX_PROJECT_ID nao configurado e nao foi possivel detectar pela chave JSON.')

  const location = process.env.VERTEX_LOCATION || 'us-central1'
  const token = await getVertexAccessToken(vertexKey)
  return { projectId, location, token }
}

async function normalizeImageToPng(buffer: Buffer): Promise<Buffer> {
  const sharp = (await import('sharp')).default
  return sharp(buffer).ensureAlpha().png().toBuffer()
}

async function normalizeImageForVertex(buffer: Buffer, prefer: 'png' | 'jpeg' = 'png'): Promise<NormalizedImageAsset> {
  const sharp = (await import('sharp')).default

  if (prefer === 'jpeg') {
    return {
      buffer: await sharp(buffer).flatten({ background: '#ffffff' }).jpeg({ quality: 95 }).toBuffer(),
      mimeType: 'image/jpeg',
    }
  }

  return {
    buffer: await sharp(buffer).ensureAlpha().png().toBuffer(),
    mimeType: 'image/png',
  }
}

function isNearWhitePixel(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const brightness = r + g + b
  return brightness >= 730 && (max - min) <= 18
}

async function buildForegroundMaskArtifacts(sourceBuffer: Buffer): Promise<{
  normalizedBuffer: Buffer
  maskRaw: Uint8Array
  width: number
  height: number
}> {
  const sharp = (await import('sharp')).default
  const normalizedBuffer = await sharp(sourceBuffer).ensureAlpha().png().toBuffer()
  const { data, info } = await sharp(normalizedBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const maskRaw = new Uint8Array(info.width * info.height)

  for (let index = 0; index < info.width * info.height; index += 1) {
    const offset = index * 4
    const alpha = data[offset + 3] ?? 0
    const r = data[offset] ?? 255
    const g = data[offset + 1] ?? 255
    const b = data[offset + 2] ?? 255
    const foreground = alpha > 24 && !isNearWhitePixel(r, g, b)
    maskRaw[index] = foreground ? 255 : 0
  }

  return {
    normalizedBuffer,
    maskRaw,
    width: info.width,
    height: info.height,
  }
}

function computeBoundingBoxFromMask(maskRaw: Uint8Array, width: number, height: number): BoundingBox | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  let area = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (maskRaw[y * width + x] === 0) continue
      area += 1
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  if (area === 0 || maxX < minX || maxY < minY) return null

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    area,
  }
}

function findConnectedMaskComponents(maskRaw: Uint8Array, width: number, height: number): BoundingBox[] {
  const visited = new Uint8Array(maskRaw.length)
  const boxes: BoundingBox[] = []
  const minArea = Math.max(900, Math.round(width * height * 0.004))

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x
      if (visited[index] === 1 || maskRaw[index] === 0) continue

      const stack = [index]
      visited[index] = 1
      let minX = x
      let minY = y
      let maxX = x
      let maxY = y
      let area = 0

      while (stack.length > 0) {
        const current = stack.pop() as number
        const cx = current % width
        const cy = Math.floor(current / width)
        area += 1
        if (cx < minX) minX = cx
        if (cy < minY) minY = cy
        if (cx > maxX) maxX = cx
        if (cy > maxY) maxY = cy

        const neighbors = [
          current - 1,
          current + 1,
          current - width,
          current + width,
        ]

        for (const neighbor of neighbors) {
          if (neighbor < 0 || neighbor >= maskRaw.length) continue
          const nx = neighbor % width
          const ny = Math.floor(neighbor / width)
          if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) continue
          if (visited[neighbor] === 1 || maskRaw[neighbor] === 0) continue
          visited[neighbor] = 1
          stack.push(neighbor)
        }
      }

      if (area < minArea) continue
      boxes.push({
        left: minX,
        top: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        area,
      })
    }
  }

  return boxes.sort((a, b) => b.area - a.area)
}

function expandBoundingBox(box: BoundingBox, width: number, height: number): BoundingBox {
  const padX = Math.max(12, Math.round(box.width * 0.08))
  const padY = Math.max(12, Math.round(box.height * 0.08))
  const left = Math.max(0, box.left - padX)
  const top = Math.max(0, box.top - padY)
  const right = Math.min(width, box.left + box.width + padX)
  const bottom = Math.min(height, box.top + box.height + padY)
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    area: box.area,
  }
}

async function cropSegmentedItem(
  normalizedBuffer: Buffer,
  maskRaw: Uint8Array,
  width: number,
  height: number,
  box: BoundingBox,
): Promise<{ imageBuffer: Buffer }> {
  const sharp = (await import('sharp')).default
  const expanded = expandBoundingBox(box, width, height)
  const imageBuffer = await sharp(normalizedBuffer)
    .extract({
      left: expanded.left,
      top: expanded.top,
      width: expanded.width,
      height: expanded.height,
    })
    .png()
    .toBuffer()

  return { imageBuffer }
}

async function cropTransparentSegmentedItem(
  normalizedBuffer: Buffer,
  maskRaw: Uint8Array,
  width: number,
  height: number,
  box: BoundingBox,
): Promise<{ imageBuffer: Buffer }> {
  const sharp = (await import('sharp')).default
  const expanded = expandBoundingBox(box, width, height)
  const { data } = await sharp(normalizedBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const cropped = Buffer.alloc(expanded.width * expanded.height * 4)

  for (let y = 0; y < expanded.height; y += 1) {
    for (let x = 0; x < expanded.width; x += 1) {
      const sourceX = expanded.left + x
      const sourceY = expanded.top + y
      const sourceIndex = (sourceY * width + sourceX) * 4
      const targetIndex = (y * expanded.width + x) * 4
      const visible = maskRaw[sourceY * width + sourceX] > 0

      cropped[targetIndex] = data[sourceIndex] ?? 0
      cropped[targetIndex + 1] = data[sourceIndex + 1] ?? 0
      cropped[targetIndex + 2] = data[sourceIndex + 2] ?? 0
      cropped[targetIndex + 3] = visible ? (data[sourceIndex + 3] ?? 255) : 0
    }
  }

  return {
    imageBuffer: await sharp(cropped, {
      raw: {
        width: expanded.width,
        height: expanded.height,
        channels: 4,
      },
    }).png().toBuffer(),
  }
}

async function segmentProductReference(
  sourceBuffer: Buffer,
  apiKey: string,
  explicitCategory?: string,
): Promise<SegmentedReferenceSet> {
  const { normalizedBuffer, maskRaw, width, height } = await buildForegroundMaskArtifacts(sourceBuffer)
  const allComponents = findConnectedMaskComponents(maskRaw, width, height)
  const fallbackBox = computeBoundingBoxFromMask(maskRaw, width, height)
  const candidateBoxes = (allComponents.length > 0 ? allComponents : fallbackBox ? [fallbackBox] : []).slice(0, 6)

  if (candidateBoxes.length === 0) {
    const normalized = await normalizeImageForVertex(sourceBuffer, 'png')
    const profile = await classifyProduct(normalized.buffer, apiKey)
    const category = inferFittingCategoryWithHint(profile, explicitCategory)
    return {
      items: [{
        imageBuffer: normalized.buffer,
        mimeType: normalized.mimeType,
        bbox: { left: 0, top: 0, width, height, area: width * height },
        profile,
        category,
        description: buildSegmentedItemDescription(profile, category),
        priority: getFittingRoutePriority(category),
      }],
      totalDetected: 1,
      omittedCount: 0,
    }
  }

  const items: SegmentedFittingItem[] = []
  for (const candidateBox of candidateBoxes) {
    const { imageBuffer } = await cropSegmentedItem(normalizedBuffer, maskRaw, width, height, candidateBox)
    const normalizedImage = await normalizeImageForVertex(imageBuffer, 'png')
    const profile = await classifyProduct(normalizedImage.buffer, apiKey)
    const category = inferFittingCategoryWithHint(profile, candidateBoxes.length === 1 ? explicitCategory : undefined)

    items.push({
      imageBuffer: normalizedImage.buffer,
      mimeType: normalizedImage.mimeType,
      bbox: candidateBox,
      profile,
      category,
      description: buildSegmentedItemDescription(profile, category),
      priority: getFittingRoutePriority(category),
    })
  }

  items.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    return b.bbox.area - a.bbox.area
  })

  return {
    items,
    totalDetected: items.length,
    omittedCount: 0,
  }
}

async function buildWholeReferenceItem(
  sourceBuffer: Buffer,
  apiKey: string,
  explicitCategory?: string,
  sourceIndex = 0,
): Promise<SegmentedFittingItem> {
  const sharp = (await import('sharp')).default
  const normalized = await normalizeImageForVertex(sourceBuffer, 'png')
  const metadata = await sharp(normalized.buffer).metadata()
  const width = metadata.width ?? 1
  const height = metadata.height ?? 1
  const profile = await classifyProduct(normalized.buffer, apiKey)
  const category = inferFittingCategoryWithHint(profile, explicitCategory)

  return {
    imageBuffer: normalized.buffer,
    mimeType: normalized.mimeType,
    bbox: { left: 0, top: 0, width, height, area: width * height },
    profile,
    category,
    description: buildSegmentedItemDescription(profile, category),
    priority: getFittingRoutePriority(category),
    sourceIndex,
  }
}

async function prepareSingleLookReferenceForGeneration(
  sourceBuffer: Buffer,
  category: string,
  profile: ProductProfile,
): Promise<{ image: NormalizedImageAsset; paddingMode: ReferencePaddingMode }> {
  const sharp = (await import('sharp')).default
  const normalized = await normalizeImageForVertex(sourceBuffer, 'png')
  const metadata = await sharp(normalized.buffer).metadata()
  const width = Math.max(1, metadata.width ?? 1)
  const height = Math.max(1, metadata.height ?? 1)
  const paddingMode: ReferencePaddingMode = isLongLookRiskCategory(profile, category) ? 'full-length-vertical' : 'standard'

  const targetWidth = paddingMode === 'full-length-vertical'
    ? Math.max(width + Math.round(width * 0.18), Math.round(width * 1.18))
    : Math.max(width + Math.round(width * 0.08), Math.round(width * 1.08))
  const targetHeight = paddingMode === 'full-length-vertical'
    ? Math.max(height + Math.round(height * 0.42), Math.round(height * 1.42))
    : Math.max(height + Math.round(height * 0.16), Math.round(height * 1.16))

  const left = Math.max(0, Math.round((targetWidth - width) / 2))
  const top = paddingMode === 'full-length-vertical'
    ? Math.max(0, Math.round((targetHeight - height) * 0.18))
    : Math.max(0, Math.round((targetHeight - height) / 2))

  return {
    image: {
      buffer: await sharp({
        create: {
          width: targetWidth,
          height: targetHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: normalized.buffer, left, top }])
        .png()
        .toBuffer(),
      mimeType: 'image/png',
    },
    paddingMode,
  }
}

function decideFittingRoute(items: SegmentedFittingItem[]): FittingRoute {
  return items.length > 1 ? 'provador-multi' : 'provador-single'
}

function isFullLookRoute(route: FittingRoute): boolean {
  return route === 'provador-multi' || route === 'single-look-rebuild'
}

function selectSingleLookRebuildDetailItems(items: SegmentedFittingItem[]): SegmentedFittingItem[] {
  const structural = items.filter((item) => isWearableFittingCategory(item.category))
  const accessories = items.filter((item) => isAccessoryCompatibleFittingCategory(item.category))

  const selected: SegmentedFittingItem[] = []
  const seenAccessoryCategory = new Set<string>()

  for (const item of structural) {
    selected.push(item)
  }

  for (const item of accessories) {
    if (seenAccessoryCategory.has(item.category)) continue
    seenAccessoryCategory.add(item.category)
    selected.push(item)
    if (selected.length >= 10) break
  }

  return selected.slice(0, 10)
}

function buildFittingPrompt(params: {
  category: string
  categoryPreset: string
  ratioInstruction: string
  poseInstruction: string
  energyInstruction: string
  userIntent: string
  route: FittingRoute
  itemDescriptions: string[]
}): string {
  const isLookRebuild = isFullLookRoute(params.route)
  const routeGoal = isLookRebuild
    ? 'Reconstruct the full submitted look in one single pass, using every reference as sovereign truth for the final outfit.'
    : 'Apply the single submitted client item with literal fidelity while preserving the exact same person.'
  const inputBlock = params.route === 'single-look-rebuild'
    ? `You receive:
[BASE PHOTO]: the exact model identity reference.
[CLIENT LOOK MASTER REFERENCE]: one single client photo that contains the complete submitted look.
[CLIENT LOOK DETAIL REFERENCES]: extracted mandatory detail crops for each required fashion item in that same look.`
    : isLookRebuild
    ? `You receive:
[BASE PHOTO]: the exact model identity reference.
[CLIENT LOOK REFERENCES]: two or more client fashion references that together define the final look.`
    : `You receive:
[BASE PHOTO]: the exact model identity reference.
[CLIENT ITEM REFERENCE]: one exclusive client fashion item that must be worn, used, or held with literal fidelity.`
  const replacementRule = isLookRebuild
    ? 'Reconstruct the complete submitted outfit exactly as referenced. Preserve every required garment, shoe, accessory, logo, text, color, trim, seam, closure, hardware, and visible structural detail from the submitted references.'
    : 'Replace only the relevant body zone for the submitted item when it is wearable, or make the item naturally worn/used/held when it is an accessory or object. Do not leave the old conflicting garment visible in the replaced zone.'

  return `You are a world-class fashion compositor for premium e-commerce try-on. Produce ONE single unified commercial studio photograph.

${inputBlock}

ROUTE: ${params.route}
FASHION CATEGORY: ${params.category}
TECHNICAL APPLICATION RULE: ${params.categoryPreset}
FRAME RULE: ${params.ratioInstruction}
POSE PRESET: ${params.poseInstruction}
ENERGY PRESET: ${params.energyInstruction}
USER REFINEMENT: ${params.userIntent}
ITEM DESCRIPTION(S): ${params.itemDescriptions.join(' | ')}

GOAL:
- ${routeGoal}
- Preserve the model identity exactly.
- Preserve the client references literally.

RULES - non-negotiable:
1. IDENTITY LOCK - HIGHEST PRIORITY: Preserve the exact same face, facial structure, age impression, skin tone, hair identity, body proportions, and overall person identity from [BASE PHOTO].
2. WHITE STUDIO LOCK: The final image must be shot on a pure white seamless studio background only. No environment, no room, no street, no props, no set dressing, no decorative elements, no scenario changes.
3. REFERENCE SOVEREIGNTY: Treat every submitted client reference as literal truth, never as inspiration. Do not reinterpret, beautify, editorialize, simplify, restyle, premium-ize, or invent missing decisions.
4. LITERAL FASHION FIDELITY: Preserve exact garment type, silhouette, color, print, text, logo, label, hardware, seams, hems, closures, cutouts, straps, sleeves, proportions, texture, trim, and all visible construction details.
5. ${replacementRule}
6. TECHNICAL APPLICATION ONLY: Use the TECHNICAL APPLICATION RULE only as a body-placement map. It must never override the literal submitted item design.
7. POSE AND FRAMING DISCIPLINE: Follow the FRAME RULE, POSE PRESET, ENERGY PRESET, and USER REFINEMENT only as light framing and expression guidance. They must never change outfit design, item proportions, or visual details.
8. ANATOMY LOCK: Keep natural human anatomy only. Exactly two arms, two hands, realistic legs, feet, shoulders, and neck. No fused limbs, no extra fingers, no impossible body positions.
9. CONTACT RULE: Accessories, shoes, and held items must have physically plausible contact with the correct body zone. Nothing may float, detach, hover, sit on the floor, or appear pasted into the frame.
10. NO SCENE DRIFT: Ignore any request for environment, background story, outdoor setting, cinematic scene, editorial set, or unrelated atmosphere. This is always a clean studio white-background Provador image.
11. OUTPUT: One photorealistic commercial studio image only. No collage, no split panel, no watermark, no generated text outside the submitted fashion items themselves.`
}

function buildRetryPrompt(
  basePrompt: string,
  issues: string[],
  weakestDimension?: string,
  composeVariant: 'product' | 'fitting' = 'fitting',
  fittingRoute?: FittingRoute,
): string {
  const issueBlock = issues.length > 0
    ? `\n\nPREVIOUS ATTEMPT FAILED. Issues detected: ${issues.join('; ')}. You MUST fix ALL of these.`
    : ''
  const focusBlock = weakestDimension
    ? `\nCRITICAL FOCUS FOR THIS RETRY: ${weakestDimension}. Do not compromise on this dimension.`
    : ''
  const modeLockBlock = composeVariant === 'product'
    ? '\nMODE LOCK: PRODUCT SHOWCASE ONLY. Keep pure white background, no scenario, no props, no outfit changes, product fully visible and dominant, and hands anatomically correct.'
    : `\nMODE LOCK: FASHION FITTING ONLY. Preserve the exact client item with literal fidelity. Do not redesign, restyle, simplify, beautify, reinterpret, or complete missing fashion decisions. Keep the exact item type, print, cutouts, straps, length, hardware, and proportions while fixing anatomy, drape, and placement.${
      isFullLookRoute(fittingRoute ?? 'provador-single')
        ? ' Preserve every submitted reference exactly in one unified white-background studio image. Do not drop, replace, or improvise any submitted garment, shoe, accessory, logo, text, or hardware.'
        : fittingRoute === 'gemini-hold' || fittingRoute === 'gemini-hold-accessories' || fittingRoute === 'provador-single'
        ? ' The item must be worn or held with believable hand or body contact. Never let it float, hover, sit on the floor, detach from the model, or invent extra accessories.'
        : fittingRoute === 'gemini-look-sequential'
          ? ' Preserve every already-approved garment exactly as it appears in the current base image. Only change the target clothing zone for the current item, never removing or restyling previously approved garments.'
          : ' Replace the relevant base garment entirely and remove every trace of the old base garment from the replaced zone.'
    }`
  return basePrompt + issueBlock + focusBlock + modeLockBlock
}

function buildGeminiSequentialStagePrompt(params: {
  currentCategory: string
  currentItemDescription: string
  currentPlacementSuggestion: string
  ratioInstruction: string
  poseInstruction: string
  energyInstruction: string
  userIntent: string
  preservedCategories: string[]
  stageLabel: string
}): string {
  const preservedBlock = params.preservedCategories.length > 0
    ? `ALREADY APPROVED GARMENTS TO PRESERVE EXACTLY: ${params.preservedCategories.join(', ')}.`
    : 'No prior garment has been approved yet in this sequence.'

  return `You are a world-class fashion compositor executing a multi-garment try-on sequence. Produce ONE single unified fashion photograph.

You receive:
[ORIGINAL PORTRAIT]: the exact model identity reference.
[CURRENT APPROVED LOOK]: the current approved base image. This image is sovereign.
[CURRENT CLIENT GARMENT]: the next garment to apply now.

ROUTE: gemini-look-sequential
SEQUENCE STAGE: ${params.stageLabel}
CURRENT GARMENT CATEGORY: ${params.currentCategory}
CURRENT GARMENT DESCRIPTION: ${params.currentItemDescription}
CURRENT GARMENT PLACEMENT: ${params.currentPlacementSuggestion}
FRAME RULE: ${params.ratioInstruction}
POSE PRESET: ${params.poseInstruction}
ENERGY PRESET: ${params.energyInstruction}
USER REFINEMENT: ${params.userIntent}
${preservedBlock}

GOAL:
- Preserve the current approved look exactly.
- Apply only the current client garment to the correct body zone.
- Keep every already-approved garment untouched, visible, and structurally identical.

RULES - non-negotiable:
1. CURRENT BASE IMAGE SOVEREIGNTY: Treat [CURRENT APPROVED LOOK] as the master truth for all already-approved garments, pose, and framing.
2. IDENTITY LOCK: Preserve the exact face, body proportions, skin tone, and hair identity from the original portrait and from the current approved look.
3. PRESERVATION LOCK: Do not remove, recolor, simplify, crop away, or restyle any already-approved garment.
4. TARGETED CHANGE ONLY: Change only the clothing zone that belongs to the current garment. Do not alter unrelated zones.
5. LITERAL GARMENT FIDELITY: Preserve the current client garment exactly: silhouette, hem, neckline, straps, sleeves, seams, hardware, colors, textures, closures, and visible construction.
6. NO WIPEOUTS: Never return to the original base outfit in zones that were already replaced in a prior approved stage.
7. NO COLLAGE: Output one photorealistic composed fashion image only. No split panels, no text, no watermark.`
}

function buildSinglePhotoRescuePrompt(
  basePrompt: string,
  profile: ProductProfile,
  category: string,
): string {
  const featureLine = profile.key_features.length > 0
    ? `Keep these visible features intact: ${profile.key_features.join(', ')}.`
    : 'Keep the full visible garment structure intact, including length, closures, sleeves, silhouette, and distinguishing construction details.'
  const fullLengthLock = isLongLookRiskCategory(profile, category)
    ? 'FULL-LENGTH VISIBILITY LOCK: keep the entire garment silhouette visible and structurally intact. Do not crop away hem, sleeve length, lapels, closures, buttons, or vertical proportion. Never compress a long coat or long garment into a cropped top, vest, or upper-body fragment.'
    : 'VISIBILITY LOCK: keep the exact item fully readable and do not hide or crop away the main structural details.'

  return `${basePrompt}

RESCUE MODE: SINGLE LOOK PHOTO.
Treat the fashion reference as one complete client garment captured in a single photo, not as inspiration and not as separated fragments.
${featureLine}
${fullLengthLock}
If the base image framing is tight, preserve the exact garment structure first and adjust the camera framing to keep the key item readable without changing the item design.`
}

async function callVertexVirtualTryOn(params: {
  portraitBuffer: Buffer
  portraitMimeType: string
  items: SegmentedFittingItem[]
  fittingRoute: FittingRoute
  executionMode: VertexTryOnExecutionMode
}): Promise<VertexTryOnCallResult> {
  if (params.items.length === 0) {
    return {
      imageBase64: null,
      productCountRequested: 0,
      productCountSent: 0,
      executionMode: params.executionMode,
      predictionCount: 0,
    }
  }
  const vertexItems = params.items

  const vertex = await resolveVertexProjectConfig()
  const url = `https://${vertex.location}-aiplatform.googleapis.com/v1/projects/${vertex.projectId}/locations/${vertex.location}/publishers/google/models/virtual-try-on-001:predict`

  const payloadMode = 'minimal'
  const payload = {
    instances: [{
      personImage: {
        image: {
          mimeType: params.portraitMimeType,
          bytesBase64Encoded: params.portraitBuffer.toString('base64'),
        },
      },
      productImages: vertexItems.map((item) => ({
        image: {
          mimeType: item.mimeType,
          bytesBase64Encoded: item.imageBuffer.toString('base64'),
        },
      })),
    }],
    parameters: {
      sampleCount: 1,
      personGeneration: 'allow_adult',
      safetySetting: 'block_medium_and_above',
      addWatermark: false,
      enhancePrompt: false,
      outputOptions: {
        mimeType: 'image/png',
      },
    },
  }

  console.log(
    `[studio] vertex-vto request | payload_mode=${payloadMode} route=${params.fittingRoute} exec=${params.executionMode} requested_items=${params.items.length} sent_items=${vertexItems.length} categories=${vertexItems.map((item) => item.category).join(',') || 'none'} input_mime_types=${[params.portraitMimeType, ...vertexItems.map((item) => item.mimeType)].join(',')} normalized_output_mime=image/png`,
  )

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${vertex.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(
      `[studio] vertex-vto error | payload_mode=${payloadMode} route=${params.fittingRoute} exec=${params.executionMode} requested_items=${params.items.length} sent_items=${vertexItems.length} categories=${vertexItems.map((item) => item.category).join(',') || 'none'} input_mime_types=${[params.portraitMimeType, ...vertexItems.map((item) => item.mimeType)].join(',')} normalized_output_mime=image/png`,
    )
    throw new Error(`Vertex VTO falhou (${response.status}): ${errorText.slice(0, 400)}`)
  }

  const data = await response.json()
  const predictions = Array.isArray((data as any).predictions) ? (data as any).predictions : []
  const imageBase64 = predictions[0]?.bytesBase64Encoded ?? null
  console.log(
    `[studio] vertex-vto response | route=${params.fittingRoute} exec=${params.executionMode} requested_items=${params.items.length} sent_items=${vertexItems.length} categories=${vertexItems.map((item) => item.category).join(',') || 'none'} predictions=${predictions.length} has_image=${imageBase64 ? 'yes' : 'no'}`,
  )

  return {
    imageBase64,
    productCountRequested: params.items.length,
    productCountSent: vertexItems.length,
    executionMode: params.executionMode,
    predictionCount: predictions.length,
  }
}

async function callGeminiSinglePhotoFittingRescue(params: {
  apiKey: string
  portraitImage: NormalizedImageAsset
  referenceItem: SegmentedFittingItem
  promptText: string
}): Promise<string | null> {
  const rescueModels = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview']
  const body = JSON.stringify({
    contents: [{
      role: 'user',
      parts: [
        { text: '[BASE PHOTO] â€” preserve this person exactly:' },
        {
          inlineData: {
            mimeType: params.portraitImage.mimeType,
            data: params.portraitImage.buffer.toString('base64'),
          },
        },
        { text: '[FASHION ITEM] â€” preserve this exact single-photo look reference with literal fidelity:' },
        {
          inlineData: {
            mimeType: params.referenceItem.mimeType,
            data: params.referenceItem.imageBuffer.toString('base64'),
          },
        },
        { text: params.promptText },
      ],
    }],
    generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
  })

  for (const model of rescueModels) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${params.apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body },
    )
    if (!res.ok) {
      console.warn(`[studio] single-photo-rescue model failed | model=${model} status=${res.status}`)
      continue
    }

    const json = await res.json()
    const parts = json.candidates?.[0]?.content?.parts ?? []
    const imgPart = parts.find((part: any) => part.inlineData?.mimeType?.startsWith('image/'))
    if (imgPart?.inlineData?.data) return imgPart.inlineData.data as string
  }

  return null
}

function buildHoldPrompt(params: {
  category: string
  ratioInstruction: string
  poseInstruction: string
  energyInstruction: string
  userIntent: string
  referenceDescription: string
  placementSuggestion: string
}): string {
  return `You are a world-class commercial compositor for accessories and props. Produce ONE single unified white-background studio photograph.

You receive:
[BASE PHOTO]: the exact model identity and scene reference.
[CLIENT ITEM]: the exclusive client item that must be worn, used, or held naturally.

ITEM CATEGORY: ${params.category}
REFERENCE DESCRIPTION: ${params.referenceDescription}
PLACEMENT SUGGESTION: ${params.placementSuggestion}
FRAME RULE: ${params.ratioInstruction}
POSE PRESET: ${params.poseInstruction}
ENERGY PRESET: ${params.energyInstruction}
USER REFINEMENT: ${params.userIntent}

RULES - non-negotiable:
1. Preserve the exact client item with literal fidelity: keep shape, proportions, colors, print, hardware, trim, closures, and every visible structural detail exactly as supplied.
2. Preserve the exact model identity from the base photo.
3. Keep a pure white seamless studio background only. No room, no street, no environment, no set dressing, no props other than the submitted client item.
4. The client item must be worn or held with physically plausible contact. It must touch the relevant hand, face, shoulder, arm, torso, or foot naturally.
5. Never let the client item float, hover, sit on the ground, rest disconnected in the scene, or appear as a detached prop with a fake shadow.
6. Never invent extra accessories, duplicate the item, or leave unrelated props in the composition.
7. Pose, energy, and user refinement are only light suggestions for framing, visibility, gesture, and expression. They must never redesign the item.
8. Keep anatomy natural with exactly two arms and two hands.
9. Output one photorealistic image only, with believable scale and natural perspective.
10. If the item cannot be worn as clothing, the model must visibly hold it or use it naturally instead of leaving it elsewhere in the frame.`
}

function buildAccessoryHoldPrompt(params: {
  ratioInstruction: string
  poseInstruction: string
  energyInstruction: string
  userIntent: string
  analyses: AccessoryReferenceAnalysis[]
  ignoredPropTypes?: string[]
}): string {
  const accessoryTypes = Array.from(new Set(params.analyses.flatMap((analysis) => analysis.items.map((item) => item.accessoryType))))
  const sourceBlocks = params.analyses.map((analysis, sourceIndex) => (
    `REFERENCE ${sourceIndex + 1}
REFERENCE KIND: ${analysis.referenceKind}
CONTAINS CLOTHING CONTEXT: ${analysis.hasSupportingClothingContext ? 'yes' : 'no'}
ACCESSORY COUNT: ${analysis.items.length}
ACCESSORIES:
${analysis.items.map((item, itemIndex) => (
  `- ACCESSORY ${itemIndex + 1}: type=${item.accessoryType}; fitting_category=${item.fittingCategory}; zone=${item.zone}; description=${item.description}; placement=${item.placementSuggestion}; key_features=${item.keyFeatures.join(', ') || 'none'}`
)).join('\n')}`
  )).join('\n\n')

  return `You are a world-class commercial compositor for fashion accessories. Produce ONE single unified white-background studio photograph.

You receive:
[BASE PHOTO]: the exact model identity and scene reference.
[CLIENT ACCESSORY REFERENCE n]: one to three client reference images. Each image may contain one accessory or a coordinated accessory set. Clothing visible inside a reference image is only context unless the accessory itself depends on that placement.

CLIENT ACCESSORY REFERENCES:
${sourceBlocks}

FRAME RULE: ${params.ratioInstruction}
POSE PRESET: ${params.poseInstruction}
ENERGY PRESET: ${params.energyInstruction}
USER REFINEMENT: ${params.userIntent}
IGNORE THESE NON-FASHION PROPS IF PRESENT: ${params.ignoredPropTypes && params.ignoredPropTypes.length > 0 ? params.ignoredPropTypes.join(', ') : 'none'}
SPECIAL JEWELRY RULES:
${accessoryTypes.includes('jewelry-neck')
  ? '- If a necklace is present, it must sit at the same apparent length and drop as the reference. Do not shorten it into a choker. The chain must drape naturally with realistic gravity, depth, and shadow interaction over skin and clothing.'
  : '- No necklace-specific rule.'}
${accessoryTypes.includes('jewelry-ear')
  ? '- If earrings are present, render them as a matched pair with consistent scale, height, orientation, and lighting on both ears.'
  : '- No earring-specific rule.'}
${accessoryTypes.some((type) => type.startsWith('jewelry-'))
  ? '- Jewelry must never look pasted onto skin. Preserve believable metal thickness, dimensional highlights, contact shadows, and separation from skin, hair, and fabric.'
  : '- No jewelry-specific material rule.'}

RULES - non-negotiable:
1. Preserve every client accessory with literal fidelity: keep shape, proportions, colors, print, hardware, trim, closures, and all visible structure exactly as supplied.
2. Preserve the exact model identity from the base photo.
3. Keep a pure white seamless studio background only. No room, no street, no environment, no set dressing, and no decorative props.
4. Every accessory must have physically plausible contact with the correct body zone. Nothing may float, hover, rest on the floor, or appear disconnected.
5. Never invent extra accessories, duplicate any item, fuse metal or straps into skin/hair, or merge two references into a hybrid object.
6. If one reference image contains a coordinated set, preserve every accessory from that set. Multiple accessories may share the same broad body zone when that matches the original set.
7. Pose, energy, and user refinement are only light framing suggestions. They must never redesign any accessory.
8. Keep anatomy natural with exactly two arms and two hands.
9. Ignore decorative props, styling objects, perfume bottles, flowers, umbrellas, and any non-fashion object that is not one of the supplied client accessories.
10. Output one photorealistic image only with natural perspective and clear visibility of all supplied accessories.`
}

const ACCESSORY_GEMINI_MODEL_CHAIN = [
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview',
  'gemini-2.5-flash-image',
] as const

const EDITORIAL_FINISHER_GEMINI_MODEL_CHAIN = [
  'gemini-3-pro-image-preview',
  'gemini-3.1-flash-image-preview',
] as const

function extractEditorialPropCandidates(ignoredPropTypes: string[]): string[] {
  const normalized = ignoredPropTypes
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  const candidates = new Set<string>()
  for (const item of normalized) {
    if (/(umbrella|parasol|guarda[- ]?chuva)/i.test(item)) {
      candidates.add('umbrella')
    }
  }

  return Array.from(candidates)
}

function buildHybridAccessoryOverlayPrompt(params: {
  ratioInstruction: string
  poseInstruction: string
  energyInstruction: string
  userIntent: string
  analyses: AccessoryReferenceAnalysis[]
  primaryWearableCategory: string
  ignoredPropTypes: string[]
}): string {
  return `${buildAccessoryHoldPrompt({
    ratioInstruction: params.ratioInstruction,
    poseInstruction: params.poseInstruction,
    energyInstruction: params.energyInstruction,
    userIntent: params.userIntent,
    analyses: params.analyses,
    ignoredPropTypes: params.ignoredPropTypes,
  })}

HYBRID OVERLAY LOCK:
- The base photo already contains the approved primary wearable in category ${params.primaryWearableCategory}.
- Preserve the existing clothing, shoes, silhouette, print placement, hems, straps, seams, cutouts, hardware, colors, and fit exactly as they already appear in the base photo.
- Add only the supplied client fashion accessories. Do not alter, restyle, simplify, beautify, recolor, or re-cut the existing outfit while applying accessories.
- If an accessory overlaps clothing, preserve the clothing underneath exactly and render only the natural contact, drape, pressure, and shadow caused by the accessory.
- Ignore all non-fashion props even if they are visible in the reference image.`
}

function buildEditorialFinisherPrompt(params: {
  ratioInstruction: string
  poseInstruction: string
  energyInstruction: string
  userIntent: string
  primaryWearableCategory: string
  detectedAccessoryTypes: string[]
  editorialPropCandidates: string[]
}): string {
  const fashionAccessoryLine = params.detectedAccessoryTypes.length > 0
    ? `Fashion accessories already validated for this look: ${params.detectedAccessoryTypes.join(', ')}. Preserve them exactly if they are already visible in the approved base image.`
    : 'No extra fashion accessory list is guaranteed. Preserve the approved base look exactly as-is.'
  const contextualPropLine = params.editorialPropCandidates.length > 0
    ? `Optional contextual props allowed only when physically plausible and visible in the styling board: ${params.editorialPropCandidates.join(', ')}.`
    : 'No contextual props are allowed.'

  return `You are a luxury fashion photo finisher working on top of an already approved virtual try-on result. Produce ONE single photorealistic image only.

You receive:
[APPROVED PROVADOR RESULT]: the approved base image. This image is sovereign.
[ORIGINAL PORTRAIT REFERENCE]: the original person identity reference.
[ORIGINAL STYLING BOARD]: the original client lookboard used only as styling guidance.

PRIMARY WEARABLE CATEGORY: ${params.primaryWearableCategory}
FRAME RULE: ${params.ratioInstruction}
POSE PRESET: ${params.poseInstruction}
ENERGY PRESET: ${params.energyInstruction}
USER REFINEMENT: ${params.userIntent}
${fashionAccessoryLine}
${contextualPropLine}

GOAL:
- Keep the approved Provador result exact as the base truth.
- Recover subtle styling signals from the original styling board only when they do not conflict with the approved wearable.
- Add optional contextual props only when they are physically plausible and clearly help the same fashion story.

RULES - non-negotiable:
1. BASE IMAGE SOVEREIGNTY: Treat [APPROVED PROVADOR RESULT] as the master truth. Do not redesign, restyle, beautify, simplify, or replace the approved outfit.
2. IDENTITY LOCK: Preserve the exact face, skin tone, body proportions, and hair identity from the portrait reference and from the approved base image.
3. WEARABLE FIDELITY LOCK: Preserve the exact clothing already approved in the base image, including silhouette, print placement, hem, length, straps, seams, cutouts, hardware, closures, colors, and proportions.
4. STYLING BOARD DISCIPLINE: Use the styling board only to recover missing fashion styling cues, accessory presence, and gentle editorial atmosphere. Never let it override the approved wearable.
5. NO NEW OUTFIT DECISIONS: Do not add, swap, recolor, or reinterpret garments. Never introduce new pants, tops, jackets, dresses, shoes, or replacement accessories that are not already approved or explicitly allowed.
6. CONTEXT PROP DISCIPLINE: Contextual props are optional. Only add an allowed prop when the body contact is plausible and the prop does not block or distort the approved outfit. All other props must be ignored.
7. ANATOMY LOCK: Keep exactly two arms, two hands, realistic shoulders, and natural body structure. No fused limbs or impossible grip.
8. CAMERA DISCIPLINE: Preserve the current approved composition and camera logic. Do not teleport the subject into a totally new unrelated environment, and do not turn this into a collage.
9. OUTPUT: One polished fashion image only, photorealistic, commercially refined, natural shadows, natural perspective, no watermark, no text.`
}

function buildEditorialFinisherRetryPrompt(
  basePrompt: string,
  issues: string[],
  weakestDimension?: string,
): string {
  const issueBlock = issues.length > 0
    ? `\n\nPREVIOUS EDITORIAL FINISHER ATTEMPT FAILED. Issues detected: ${issues.join('; ')}. You MUST fix ALL of these while preserving the approved base image.`
    : ''
  const focusBlock = weakestDimension
    ? `\nCRITICAL FOCUS FOR THIS RETRY: ${weakestDimension}.`
    : ''

  return `${basePrompt}${issueBlock}${focusBlock}

EDITORIAL FINISHER MODE LOCK:
- The approved base image remains sovereign.
- Do not change the approved clothing design.
- Do not remove already-correct accessories.
- Keep contextual props optional and physically plausible only.`
}

const FINE_JEWELRY_ACCESSORY_TYPES = new Set([
  'jewelry-neck',
  'jewelry-ear',
  'jewelry-wrist',
  'jewelry-hand',
])

function isFineJewelryOnlyAccessoryTypes(accessoryTypes: string[]): boolean {
  return accessoryTypes.length > 0 && accessoryTypes.every((type) => FINE_JEWELRY_ACCESSORY_TYPES.has(type))
}

function hasStructuralAccessoryFailureText(text: string): boolean {
  return /(missing|not visible|invisible|removed|absent|floating|hover|detached|disconnected|wrong zone|wrong body zone|placement|position|contact|grip|holding|scale|size|length|drop|drape|pair|both ears|symmetry)/i.test(text)
}

function hasMicroDetailAccessoryFailureText(text: string): boolean {
  return /(detail|texture|material|surface|chain|link|twisted|smooth|metal|finish|stone|gem|clasp|engraving|visible feature|thin|thickness|micro)/i.test(text)
}

function relaxFineJewelryQcResult(result: AccessoryQcResult): AccessoryQcResult {
  if (result.approved || !isFineJewelryOnlyAccessoryTypes(result.accessoryTypes)) return result

  const evidence = [result.weakestDimension, ...result.issues]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)

  if (evidence.length === 0) return result
  if (evidence.some((text) => hasStructuralAccessoryFailureText(text))) return result
  if (!evidence.some((text) => hasMicroDetailAccessoryFailureText(text))) return result

  return {
    ...result,
    approved: true,
    issues: Array.from(new Set([...result.issues, 'fine-jewelry-microdetail-tolerated'])).slice(0, 8),
    weakestDimension: undefined,
    qcRelaxed: true,
    qcRelaxReason: 'fine-jewelry-microdetail-tolerated',
  }
}

function shouldRunFineJewelryRetry(results: AccessoryQcResult[]): boolean {
  const failedResults = results.filter((result) => !result.approved)
  return failedResults.length > 0 && failedResults.every((result) => isFineJewelryOnlyAccessoryTypes(result.accessoryTypes))
}

function buildFineJewelryAccessoryRetryPrompt(
  basePrompt: string,
  issues: string[],
  weakestDimension?: string,
): string {
  return `${buildRetryPrompt(basePrompt, issues, weakestDimension, 'fitting', 'gemini-hold-accessories')}

FINE JEWELRY RESCUE LOCK:
- Preserve necklace chain topology, visible twists, link pattern, clasp logic, and apparent thickness exactly as referenced.
- Preserve earring pair symmetry, drop length, metal volume, and orientation on both sides.
- Preserve bracelet, watch, and ring silhouette with believable dimensional highlights and contact shadows.
- Never simplify fine jewelry into a generic smooth band, flat chain, or placeholder metallic shape.`
}

type AccessoryQcResult = {
  referenceUrl: string
  sourceIndex: number
  referenceKind: AccessoryReferenceKind
  category: string
  accessoryTypes: string[]
  approved: boolean
  score: number
  weakestDimension?: string
  issues: string[]
  qcRelaxed?: boolean
  qcRelaxReason?: string
}

type WearableQcResult = {
  referenceLabel: string
  sourceIndex: number
  category: string
  approved: boolean
  score: number
  weakestDimension?: string
  issues: string[]
}

async function assessWearableBatchQuality(params: {
  items: SegmentedFittingItem[]
  referenceUrls: string[]
  generatedBase64: string
  fittingRoute: FittingRoute
}): Promise<{
  approved: boolean
  weakestDimension?: string
  issues: string[]
  results: WearableQcResult[]
}> {
  const results: WearableQcResult[] = []

  for (let index = 0; index < params.items.length; index += 1) {
    const item = params.items[index]
    const sourceIndex = typeof item.sourceIndex === 'number' ? item.sourceIndex : index
    const referenceUrl = params.referenceUrls[sourceIndex] ?? ''
    const qc = await assessCompositionQuality(referenceUrl || `inline-reference:${index + 1}`, params.generatedBase64, item.profile, {
      variant: 'fitting',
      fittingCategory: item.category,
      fittingRoute: params.fittingRoute,
      referenceImage: !referenceUrl
        ? {
          mimeType: item.mimeType,
          dataBase64: item.imageBuffer.toString('base64'),
        }
        : undefined,
    })

    results.push({
      referenceLabel: referenceUrl ? `reference-url:${sourceIndex}` : `inline-segment:${index}`,
      sourceIndex,
      category: item.category,
      approved: qc.approved,
      score: qc.score,
      weakestDimension: qc.weakest_dimension,
      issues: qc.issues,
    })
  }

  const failedResults = results.filter((result) => !result.approved)
  const orderedByRisk = (failedResults.length > 0 ? failedResults : results).slice().sort((left, right) => left.score - right.score)
  const weakest = orderedByRisk[0]

  return {
    approved: failedResults.length === 0 && results.length > 0,
    weakestDimension: weakest?.weakestDimension,
    issues: Array.from(new Set(results.flatMap((result) => result.issues))).slice(0, 10),
    results,
  }
}

async function assessAccessoryBatchQuality(params: {
  analyses: AccessoryReferenceAnalysis[]
  generatedBase64: string
  fittingRoute: FittingRoute
}): Promise<{
  approved: boolean
  weakestDimension?: string
  issues: string[]
  results: AccessoryQcResult[]
}> {
  const results: AccessoryQcResult[] = []

  for (const analysis of params.analyses) {
    const referenceUrl = analysis.referenceUrl
    if (analysis.items.length === 0) continue

    const qcProfile: ProductProfile = {
      category: analysis.items.map((item) => item.accessoryType).join(', '),
      has_text_logo: false,
      deformation_risk: analysis.items.some((item) => item.confidence === 'low') ? 'medium' : 'low',
      shape_complexity: analysis.items.length > 2 ? 'complex' : 'medium',
      placement_suggestion: analysis.items.map((item) => item.placementSuggestion).join(' | '),
      key_features: analysis.items.flatMap((item) => item.keyFeatures).slice(0, 10),
    }
    const qcCategory = analysis.items[0]?.fittingCategory ?? 'other-accessory'

    const qc = await assessCompositionQuality(referenceUrl || `inline-accessory:${analysis.sourceIndex}`, params.generatedBase64, qcProfile, {
      variant: 'fitting',
      fittingCategory: qcCategory,
      fittingRoute: params.fittingRoute,
      referenceImage: !referenceUrl
        ? {
          mimeType: analysis.normalizedImage.mimeType,
          dataBase64: analysis.normalizedImage.buffer.toString('base64'),
        }
        : undefined,
    })

    results.push(relaxFineJewelryQcResult({
      referenceUrl: referenceUrl || `inline-accessory:${analysis.sourceIndex}`,
      sourceIndex: analysis.sourceIndex,
      referenceKind: analysis.referenceKind,
      category: qcCategory,
      accessoryTypes: analysis.items.map((item) => item.accessoryType),
      approved: qc.approved,
      score: qc.score,
      weakestDimension: qc.weakest_dimension,
      issues: qc.issues,
    }))
  }

  const failedResults = results.filter((result) => !result.approved)
  const orderedByRisk = (failedResults.length > 0 ? failedResults : results).slice().sort((left, right) => left.score - right.score)
  const weakest = orderedByRisk[0]

  return {
    approved: failedResults.length === 0 && results.length > 0,
    weakestDimension: weakest?.weakestDimension,
    issues: Array.from(new Set(results.flatMap((result) => result.issues))).slice(0, 8),
    results,
  }
}

function getLowestQcScore(results: Array<{ score: number }>) {
  if (results.length === 0) return 0
  return results.reduce((lowest, result) => Math.min(lowest, result.score), Number.POSITIVE_INFINITY)
}

function getWearableQcScore(
  result: CompositionQuality | {
    approved: boolean
    weakestDimension?: string
    issues: string[]
    results: WearableQcResult[]
  },
) {
  return 'score' in result ? result.score : getLowestQcScore(result.results)
}

function shouldSkipEditorialFinisherAfterStrongHybridApproval(params: {
  editorialPropCandidates: string[]
  garmentScore: number
  accessoryScore: number
  weakestDimension?: string
}) {
  if (params.editorialPropCandidates.length > 0) return false
  if (params.weakestDimension && /item fidelity|fit and placement|anatomy/i.test(params.weakestDimension)) {
    return false
  }

  return params.garmentScore >= 92 && params.accessoryScore >= 92
}

function getQcWeakestDimension(result: CompositionQuality | { weakestDimension?: string }): string | undefined {
  return 'weakestDimension' in result ? result.weakestDimension : (result as CompositionQuality).weakest_dimension
}

function getWearableQcFailureDetails(
  result: CompositionQuality | {
    weakestDimension?: string
    issues: string[]
    results?: WearableQcResult[]
  },
  fallbackCategory?: string,
): {
  category?: string
  retryReason: string
  weakestDimension?: string
  issues: string[]
} {
  const weakestDimension = getQcWeakestDimension(result)
  const issues = Array.isArray(result.issues) ? result.issues : []
  let category = fallbackCategory

  if ('results' in result && Array.isArray(result.results) && result.results.length > 0) {
    const failedResults = result.results.filter((entry) => !entry.approved)
    const ordered = (failedResults.length > 0 ? failedResults : result.results)
      .slice()
      .sort((left, right) => left.score - right.score)
    category = ordered[0]?.category ?? category
  }

  const retryReasonParts = [
    category ? `category:${category}` : undefined,
    weakestDimension,
    issues[0],
  ].filter(Boolean)

  return {
    category,
    retryReason: retryReasonParts.length > 0 ? retryReasonParts.join(' | ') : 'wearable-qc-reject',
    weakestDimension,
    issues,
  }
}

function roundUsd(value: number): number {
  return Number(value.toFixed(4))
}

function getProvadorPricingTier(params: {
  fittingStrategy: FittingStrategy
  editorialFinisherEligible: boolean
  fittingRoute?: FittingRoute
}): ProvadorPricingTier {
  if (params.fittingStrategy === 'gemini_only_accessories') return 'gemini_only_accessories'
  if (params.fittingStrategy === 'gemini_provador') return 'hybrid_vertex_gemini'
  if (params.fittingRoute === 'single-look-rebuild') return 'hybrid_vertex_gemini'
  if (params.fittingRoute === 'gemini-look-sequential') return 'hybrid_vertex_gemini'
  if (params.editorialFinisherEligible) return 'hybrid_vertex_gemini_editorial'
  if (params.fittingStrategy === 'hybrid_vertex_gemini') return 'hybrid_vertex_gemini'
  return 'vertex_only'
}

function buildEstimatedProviderCostBreakdown(params: {
  vertexCallCount: number
  geminiModelsTried: string[]
}): EstimatedProviderCostBreakdown {
  const gemini3ProCallCount = params.geminiModelsTried.filter((model) => model === 'gemini-3-pro-image-preview').length
  const gemini31FlashCallCount = params.geminiModelsTried.filter((model) => model === 'gemini-3.1-flash-image-preview').length
  const gemini25FlashCallCount = params.geminiModelsTried.filter((model) => model === 'gemini-2.5-flash-image').length
  const vertexTotal = params.vertexCallCount * PROVADOR_PROVIDER_COST_USD.vertex_vto_call
  const gemini3ProTotal = gemini3ProCallCount * PROVADOR_PROVIDER_COST_USD.gemini_3_pro_image_call
  const gemini31FlashTotal = gemini31FlashCallCount * PROVADOR_PROVIDER_COST_USD.gemini_3_1_flash_image_call
  const gemini25FlashTotal = gemini25FlashCallCount * PROVADOR_PROVIDER_COST_USD.gemini_2_5_flash_image_call
  const total = PROVADOR_PROVIDER_COST_USD.analysis_overhead + vertexTotal + gemini3ProTotal + gemini31FlashTotal + gemini25FlashTotal

  return {
    analysis_overhead_usd: roundUsd(PROVADOR_PROVIDER_COST_USD.analysis_overhead),
    vertex_call_count: params.vertexCallCount,
    vertex_total_usd: roundUsd(vertexTotal),
    gemini_3_pro_call_count: gemini3ProCallCount,
    gemini_3_pro_total_usd: roundUsd(gemini3ProTotal),
    gemini_3_1_flash_call_count: gemini31FlashCallCount,
    gemini_3_1_flash_total_usd: roundUsd(gemini31FlashTotal),
    gemini_2_5_flash_call_count: gemini25FlashCallCount,
    gemini_2_5_flash_total_usd: roundUsd(gemini25FlashTotal),
    total_usd: roundUsd(total),
  }
}

// â”€â”€ Compose â€” Virtual Try-On ou Colar Produto â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function preflightProvadorPricing(params: {
  product_url: string
  product_urls?: string[]
  fitting_group?: string
  fitting_category?: string
  vton_category?: string
}): Promise<ProvadorPricingPreflight> {
  const apiKey = (process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY) ?? ''
  if (!apiKey) throw new Error('GOOGLE_API_KEY nao configurada')

  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY nao configurada')

  const rawReferenceUrls = Array.isArray(params.product_urls)
    ? params.product_urls.filter((url): url is string => typeof url === 'string' && url.startsWith('http'))
    : []
  const referenceUrls = (rawReferenceUrls.length > 0 ? rawReferenceUrls : [params.product_url])
    .filter((url): url is string => typeof url === 'string' && url.startsWith('http'))
    .slice(0, 3)
  if (referenceUrls.length === 0) throw new Error('Nenhuma referencia valida foi enviada para o Provador')

  const referenceMode: FittingReferenceMode = referenceUrls.length > 1 ? 'separate-references' : 'single-look-photo'
  const explicitCategoryHint = getExplicitFittingCategoryHint(params.fitting_category ?? params.vton_category)
  const requestedFittingGroup = normalizeRequestedFittingGroup(params.fitting_group)

  const referenceResponses = await Promise.all(referenceUrls.map((url) => fetch(url)))
  if (referenceResponses.some((response) => !response.ok)) {
    throw new Error('Falha ao baixar imagens da referencia para o preflight do Provador')
  }

  const referenceBuffers = await Promise.all(
    referenceResponses.map((response) => response.arrayBuffer().then((buffer) => Buffer.from(buffer))),
  )

  const finalReferenceBuffers = await Promise.all(referenceUrls.map(async (url, index) => {
    let cleanedBuffer = referenceBuffers[index]
    try {
      const bgRes = await fetch('https://fal.run/fal-ai/bria/background-removal', {
        method: 'POST',
        headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: url }),
      })
      if (bgRes.ok) {
        const bgData = await bgRes.json()
        const cleanUrl = bgData.image?.url as string | undefined
        if (cleanUrl) {
          const cleanRes = await fetch(cleanUrl)
          if (cleanRes.ok) {
            cleanedBuffer = Buffer.from(await cleanRes.arrayBuffer())
          }
        }
      }
    } catch (error) {
      console.warn(`[studio] Bria falhou no preflight do Provador para referencia ${index + 1}:`, error)
    }
    return cleanedBuffer
  }))

  const detectedItems = referenceMode === 'single-look-photo'
    ? (await segmentProductReference(finalReferenceBuffers[0], apiKey, explicitCategoryHint)).items
    : await Promise.all(finalReferenceBuffers.map((buffer, index) => (
      buildWholeReferenceItem(buffer, apiKey, index === 0 ? explicitCategoryHint : undefined, index)
    )))

  detectedItems.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    return b.bbox.area - a.bbox.area
  })

  let fittingGroup = inferFittingGroup({
    requestedGroup: requestedFittingGroup,
    explicitCategoryHint,
    detectedItems,
  })
  const fittingGroupRequestMode = getFittingGroupRequestMode(requestedFittingGroup)

  let fittingStrategy: FittingStrategy = 'gemini_provador'
  let selectedAccessoryAnalyses: AccessoryReferenceAnalysis[] = []
  let ignoredPropTypes: string[] = []
  let primaryWearableCategory: string | undefined
  let singlePhotoPrimaryProductType: string | undefined
  let singlePhotoGarmentPriorityApplied = false

  if (referenceMode === 'single-look-photo') {
    const initialWholeLookItem = await buildWholeReferenceItem(finalReferenceBuffers[0], apiKey, explicitCategoryHint, 0)
    const wearableCandidates = detectedItems.filter((item) => isWearableFittingCategory(item.category))
    const primaryWearableCandidate = wearableCandidates[0]
    let singleLookWearableAnalysis: SingleLookWearableAnalysis | null = null

    if (
      fittingGroup === 'fashion_accessories'
      || !primaryWearableCandidate
      || !isStructuralBodyCategory(primaryWearableCandidate.category)
      || !isStructuralBodyCategory(initialWholeLookItem.category)
    ) {
      singleLookWearableAnalysis = await analyzeSingleLookWearableReference(finalReferenceBuffers[0], apiKey)
    }

    const garmentPriorityStructuralCategories = collectSingleLookStructuralCategories({
      detectedItems,
      wholeImageCategory: initialWholeLookItem.category,
      wearableAnalysis: singleLookWearableAnalysis,
    })
    singlePhotoPrimaryProductType = deriveSinglePhotoPrimaryProductType({
      structuralCategories: garmentPriorityStructuralCategories,
      primaryWearableCategory: primaryWearableCandidate?.category,
    })

    if (shouldPrioritizeGarmentLookboard({
      fittingInputMode: referenceMode,
      detectedItems,
      wholeImageCategory: initialWholeLookItem.category,
      wearableAnalysis: singleLookWearableAnalysis,
    })) {
      singlePhotoGarmentPriorityApplied = fittingGroup === 'fashion_accessories'
      fittingGroup = 'wearables'
    }

    if (fittingGroup === 'fashion_accessories') {
      const rawAccessoryAnalysis = await analyzeAccessoryReference(finalReferenceBuffers[0], apiKey, 0, referenceUrls[0])
      const accessoryAnalysis = rawAccessoryAnalysis ? filterAccessoryAnalysisItems(rawAccessoryAnalysis) : null
      if (accessoryAnalysis) {
        selectedAccessoryAnalyses = [accessoryAnalysis]
        ignoredPropTypes = accessoryAnalysis.ignoredNonFashionProps
      }
      fittingStrategy = 'gemini_only_accessories'
    } else {
      let wearableRouteCategory = primaryWearableCandidate?.category
        ?? (isWearableFittingCategory(initialWholeLookItem.category) ? initialWholeLookItem.category : undefined)
      if (!wearableRouteCategory) {
        const analyzedPrimaryCategory = parseKnownFittingCategory(singleLookWearableAnalysis?.primary_category)
        if (analyzedPrimaryCategory && isWearableFittingCategory(analyzedPrimaryCategory) && singleLookWearableAnalysis?.contains_wearable) {
          wearableRouteCategory = analyzedPrimaryCategory
        }
      }
      primaryWearableCategory = wearableRouteCategory

      const rawMixedAccessoryAnalysis = await analyzeAccessoryReference(finalReferenceBuffers[0], apiKey, 0, referenceUrls[0])
      const mixedAccessoryAnalysis = rawMixedAccessoryAnalysis ? filterAccessoryAnalysisItems(rawMixedAccessoryAnalysis) : null
      if (mixedAccessoryAnalysis) {
        ignoredPropTypes = mixedAccessoryAnalysis.ignoredNonFashionProps
      }
      if (mixedAccessoryAnalysis && mixedAccessoryAnalysis.containsAccessories && mixedAccessoryAnalysis.items.length > 0) {
        selectedAccessoryAnalyses = [mixedAccessoryAnalysis]
        fittingStrategy = 'gemini_provador'
      }
    }
  } else if (fittingGroup === 'fashion_accessories') {
    const rawAccessoryAnalyses = await Promise.all(
      finalReferenceBuffers.map((buffer, index) => analyzeAccessoryReference(buffer, apiKey, index, referenceUrls[index])),
    )
    const accessoryAnalyses = rawAccessoryAnalyses
      .filter((analysis): analysis is AccessoryReferenceAnalysis => Boolean(analysis))
      .map((analysis) => filterAccessoryAnalysisItems(analysis))
    selectedAccessoryAnalyses = accessoryAnalyses
    ignoredPropTypes = collectIgnoredPropTypes(accessoryAnalyses)
    fittingStrategy = 'gemini_only_accessories'
  } else {
    const wearableReferenceItems = detectedItems.filter((item) => isWearableFittingCategory(item.category))
    primaryWearableCategory = wearableReferenceItems[0]?.category
    const accessoryReferenceSeedItems = detectedItems.filter((item) => (
      !isWearableFittingCategory(item.category) && isAccessoryCompatibleFittingCategory(item.category)
    ))
    if (accessoryReferenceSeedItems.length > 0) {
      const accessorySourceIndexes = Array.from(new Set(
        accessoryReferenceSeedItems
          .map((item) => item.sourceIndex)
          .filter((value): value is number => typeof value === 'number'),
      ))
      const rawAccessoryAnalyses = await Promise.all(
        accessorySourceIndexes.map((sourceIndex) => analyzeAccessoryReference(
          finalReferenceBuffers[sourceIndex],
          apiKey,
          sourceIndex,
          referenceUrls[sourceIndex],
        )),
      )
      selectedAccessoryAnalyses = rawAccessoryAnalyses
        .filter((analysis): analysis is AccessoryReferenceAnalysis => Boolean(analysis))
        .map((analysis) => filterAccessoryAnalysisItems(analysis))
      ignoredPropTypes = collectIgnoredPropTypes(selectedAccessoryAnalyses)
      if (selectedAccessoryAnalyses.length > 0) {
        fittingStrategy = 'gemini_provador'
      }
    }
  }

  const editorialFinisherEligible = false
  const referenceMixMode = getFittingReferenceMixMode({
    referenceMode,
    fittingGroup,
    requestedGroup: requestedFittingGroup,
    selectedAccessoryAnalysisCount: selectedAccessoryAnalyses.length,
  })
  const predictedWearableCount = fittingGroup === 'wearables'
    ? detectedItems.filter((item) => isWearableFittingCategory(item.category)).length
    : 0
  const predictedAccessoryCount = selectedAccessoryAnalyses.reduce((sum, analysis) => sum + analysis.items.length, 0)
  const predictedRelevantCount = Math.max(
    predictedWearableCount,
    fittingGroup === 'wearables' && predictedWearableCount > 0 ? 1 : 0,
  ) + predictedAccessoryCount
  const predictedFittingRoute: FittingRoute = (
    referenceMode === 'single-look-photo'
    && fittingGroup === 'wearables'
    && predictedRelevantCount > 1
  )
    ? 'single-look-rebuild'
    : predictedRelevantCount > 1 ? 'provador-multi' : 'provador-single'
  const effectiveFittingStrategy = fittingStrategy
  const pricingTier = getProvadorPricingTier({ fittingStrategy: effectiveFittingStrategy, editorialFinisherEligible, fittingRoute: predictedFittingRoute })
  const expectedVertexCallCount = 0
  const expectedGeminiModelsTried = pricingTier === 'gemini_only_accessories'
    ? ['gemini-3-pro-image-preview']
    : ['gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview']
  const estimatedCostBreakdown = buildEstimatedProviderCostBreakdown({
    vertexCallCount: expectedVertexCallCount,
    geminiModelsTried: expectedGeminiModelsTried,
  })

  return {
    pricingStrategy: 'fixed_tier_conservative',
    pricingTier,
    fittingStrategy: effectiveFittingStrategy,
    fittingGroup,
    fittingGroupRequestMode,
    referenceMode,
    referenceMixMode,
    creditsCost: PROVADOR_TIER_CREDITS[pricingTier],
    editorialFinisherEligible,
    primaryWearableCategory,
    accessoryDetectedTypes: collectAccessoryTypes(selectedAccessoryAnalyses),
    ignoredPropTypes,
    ...(referenceMode === 'single-look-photo'
      ? {
          singlePhotoPrimaryProductType,
          singlePhotoGarmentPriorityApplied,
        }
      : {}),
    estimatedProviderCostUsd: estimatedCostBreakdown.total_usd,
    estimatedCostBreakdown,
  }
}

type SovereignSubmittedItemManifest = {
  submittedItemCategories: string[]
  submittedNonFashionItems: string[]
  submittedItemManifest: string[]
}

type SovereignFittingAuditResult = {
  approved: boolean
  missingOrDistortedItems: string[]
  notes: string[]
}

export type SourceFrameFidelityAuditResult = {
  approved: boolean
  blockingIssues: string[]
  warningIssues: string[]
  notes: string[]
}

type SovereignProvadorReferencePlan = {
  categories: string[]
  manifest: string[]
  conflictReasons: string[]
}

function buildSovereignProvadorReferencePlan(params: {
  explicitCategoryHint?: string
  guidedOverlayReferences: GuidedSplitReference[]
}): SovereignProvadorReferencePlan {
  const categories = dedupeNormalizedStrings([
    params.explicitCategoryHint ? normalizeFittingCategory(params.explicitCategoryHint) : '',
    ...params.guidedOverlayReferences.map((reference) => parseKnownFittingCategory(reference.category) ?? ''),
  ]).filter(Boolean)

  const manifest = dedupeNormalizedStrings([
    ...categories,
    ...params.guidedOverlayReferences
      .map((reference) => normalizeTalkingWhitespace(reference.description))
      .filter(Boolean),
  ]).slice(0, 16)

  const countByCategory = new Map<string, number>()
  for (const category of categories) {
    if (category === 'jewelry' || category === 'other-accessory') continue
    countByCategory.set(category, (countByCategory.get(category) ?? 0) + 1)
  }

  const conflictReasons = Array.from(countByCategory.entries())
    .filter(([, count]) => count > 1)
    .map(([category]) => `multiple_${category}`)

  if (categories.includes('one-pieces') && (categories.includes('tops') || categories.includes('bottoms'))) {
    conflictReasons.push('one-piece_conflicts_with_separates')
  }

  return {
    categories,
    manifest,
    conflictReasons: dedupeNormalizedStrings(conflictReasons),
  }
}

async function buildSovereignSubmittedItemManifest(params: {
  apiKey: string
  referenceMode: FittingReferenceMode
  referenceBuffers: Buffer[]
  referenceUrls: string[]
  explicitCategoryHint?: string
}): Promise<SovereignSubmittedItemManifest> {
  const submittedItemCategories: string[] = []
  const submittedNonFashionItems: string[] = []

  if (params.referenceMode === 'single-look-photo') {
    const segmented = await segmentProductReference(
      params.referenceBuffers[0],
      params.apiKey,
      params.explicitCategoryHint,
    )
    submittedItemCategories.push(...segmented.items.map((item) => item.category))

    const wholeItem = await buildWholeReferenceItem(
      params.referenceBuffers[0],
      params.apiKey,
      params.explicitCategoryHint,
      0,
    )
    submittedItemCategories.push(wholeItem.category)

    const accessoryAnalysis = await analyzeAccessoryReference(
      params.referenceBuffers[0],
      params.apiKey,
      0,
      params.referenceUrls[0],
    )
    if (accessoryAnalysis) {
      submittedItemCategories.push(...accessoryAnalysis.items.map((item) => item.fittingCategory))
      submittedNonFashionItems.push(...accessoryAnalysis.ignoredNonFashionProps)
    }
  } else {
    const wholeItems = await Promise.all(
      params.referenceBuffers.map((buffer, index) => buildWholeReferenceItem(
        buffer,
        params.apiKey,
        index === 0 ? params.explicitCategoryHint : undefined,
        index,
      )),
    )
    submittedItemCategories.push(...wholeItems.map((item) => item.category))

    const accessoryAnalyses = await Promise.all(
      params.referenceBuffers.map((buffer, index) => analyzeAccessoryReference(
        buffer,
        params.apiKey,
        index,
        params.referenceUrls[index] ?? '',
      )),
    )
    for (const analysis of accessoryAnalyses) {
      if (!analysis) continue
      submittedItemCategories.push(...analysis.items.map((item) => item.fittingCategory))
      submittedNonFashionItems.push(...analysis.ignoredNonFashionProps)
    }
  }

  const normalizedCategories = dedupeNormalizedStrings(submittedItemCategories)
  const normalizedNonFashionItems = dedupeNormalizedStrings(submittedNonFashionItems)

  return {
    submittedItemCategories: normalizedCategories,
    submittedNonFashionItems: normalizedNonFashionItems,
    submittedItemManifest: dedupeNormalizedStrings([
      ...normalizedCategories,
      ...normalizedNonFashionItems.map((item) => `prop:${item}`),
    ]).slice(0, 24),
  }
}

async function auditSovereignWhiteStudioComposition(params: {
  apiKey: string
  portraitInline: { mimeType: string; data: string }
  referenceInlines: Array<{ mimeType: string; data: string }>
  generatedBuffer: Buffer
  referenceMode: FittingReferenceMode
}): Promise<SovereignFittingAuditResult> {
  const generated = await normalizeImageForVertex(params.generatedBuffer, 'jpeg')
  const prompt = `Audit this generated white-studio fitting result.

IMAGE 1 is the base model photo.
The NEXT image(s) are sovereign submitted references.
The FINAL image is the generated result.

  Rules:
  - Every intentional visible submitted item from the reference images is mandatory in the result.
  - This includes clothes, shoes, bags, headwear, jewelry, eyewear, and also non-fashion props or objects intentionally submitted by the client, such as umbrella, perfume, flowers, or other visible scene objects.
  - The result must preserve the base model identity.
  - The result must use a clean white seamless studio background.
  - If the generated result still shows the original base-photo garment in a body zone that should have been replaced by a submitted wearable item, mark approved=false.
  - If a submitted wearable item is not actually worn by the model, mark approved=false.
  - Mark approved=false if any intentional submitted item is missing, materially redesigned, recolored, reshaped, replaced, simplified, or turned into a different kind of object.

Respond ONLY with valid JSON:
{
  "approved": true,
  "missing_or_distorted_items": ["<short issue>", "..."],
  "notes": ["<short note>", "..."]
}`

  try {
    const parts: Array<Record<string, unknown>> = [
      { text: prompt },
      { text: '[BASE MODEL PHOTO]' },
      { inlineData: params.portraitInline },
    ]

    params.referenceInlines.forEach((inline, index) => {
      parts.push({ text: `[SOVEREIGN SUBMITTED REFERENCE ${index + 1}]` })
      parts.push({ inlineData: inline })
    })

    parts.push({ text: '[GENERATED RESULT]' })
    parts.push({ inlineData: { mimeType: generated.mimeType, data: generated.buffer.toString('base64') } })

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${params.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    )
    if (!res.ok) throw new Error(`white-studio-audit HTTP ${res.status}`)

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const parsed = parseModelJsonResponse<{
      approved?: boolean
      missing_or_distorted_items?: string[]
      notes?: string[]
    }>(text)

    return {
      approved: Boolean(parsed.approved),
      missingOrDistortedItems: dedupeNormalizedStrings(parsed.missing_or_distorted_items ?? []).slice(0, 12),
      notes: dedupeNormalizedStrings(parsed.notes ?? []).slice(0, 8),
    }
  } catch (error: any) {
    console.warn('[studio] auditSovereignWhiteStudioComposition falhou:', error.message)
    return {
      approved: false,
      missingOrDistortedItems: ['audit_unavailable'],
      notes: dedupeNormalizedStrings(['audit_unavailable', String(error?.message ?? 'audit_error')]).slice(0, 8),
    }
  }
}

function normalizeAuditIssueList(values: unknown) {
  return dedupeNormalizedStrings(Array.isArray(values) ? values : []).slice(0, 12)
}

function isBlockingWhiteStudioIssue(
  issue: string,
  options: {
    advisoryMode: boolean
    structuralCategories: string[]
  },
) {
  const normalized = issue.trim().toLowerCase()
  if (!normalized) return false

  if (!options.advisoryMode) return true

  if (/(identity|face|hair|skin tone|body proportions|different person|wrong person|background|scene|environment|street|room|white studio|white seamless|not provided|base model)/i.test(normalized)) {
    return true
  }

  if (options.structuralCategories.some((category) => normalized.includes(category))) {
    return true
  }

  if (/(coat|jacket|blazer|shirt|top|blouse|dress|skirt|pants|trousers|shorts|jeans|outerwear|bottoms|one-piece|matching set|garment|main outfit)/i.test(normalized)) {
    return true
  }

  if (/(bracelet|bangle|jewelry|joia|glasses|eyewear|scarf|hat|headwear|bag|handbag|belt|boots|boot|shoe|shoes|ankle boots|mid-calf|fringe|watch|necklace|ring|perfume|umbrella|prop)/i.test(normalized)) {
    return false
  }

  return true
}

export async function auditGeneratedVideoFrameFidelity(params: {
  apiKey: string
  sourceImageUrl: string
  generatedFrameUrl: string
  visibleItemManifest?: string[]
  requireExactTextLogo?: boolean
  requireExactColor?: boolean
}): Promise<SourceFrameFidelityAuditResult> {
  if (!params.sourceImageUrl || !params.generatedFrameUrl) {
    return {
      approved: true,
      blockingIssues: [],
      warningIssues: [],
      notes: ['audit_skipped_missing_frame'],
    }
  }

  async function fetchInlineData(url: string) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`fidelity-audit download failed: ${response.status}`)
    const mimeType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await response.arrayBuffer())
    const normalized = await normalizeImageForVertex(buffer, 'jpeg')
    return { mimeType: normalized.mimeType, data: normalized.buffer.toString('base64') }
  }

  const prompt = `Audit source-frame fidelity for a generated video frame.

IMAGE 1 is the original source frame.
IMAGE 2 is the generated final video frame.

Rules:
- Preserve the exact same person and overall frame identity from IMAGE 1.
- Preserve visible products, packaging, labels, logos, printed text, props, wardrobe, and relevant accessories from IMAGE 1.
- If printed text, logo, label, or branding changes wording, spelling, layout, color, or identity, mark that as a blocking issue.
- If the main product changes shape, colorway, or branding, mark that as a blocking issue.
- Treat minor cinematic differences that do not alter branding or product identity as warning issues only.
- Ignore subtitles or generated text only if IMAGE 1 had none and IMAGE 2 also has none.
${params.requireExactTextLogo ? '- Exact text/logo fidelity is mandatory.' : ''}
${params.requireExactColor ? '- Exact color fidelity is mandatory.' : ''}
${params.visibleItemManifest && params.visibleItemManifest.length > 0 ? `Mandatory visible source items: ${params.visibleItemManifest.join(', ')}.` : ''}

Respond ONLY with valid JSON:
{
  "approved": true,
  "blocking_issues": ["<short issue>", "..."],
  "warning_issues": ["<short warning>", "..."],
  "notes": ["<short note>", "..."]
}`

  try {
    const [sourceInline, frameInline] = await Promise.all([
      fetchInlineData(params.sourceImageUrl),
      fetchInlineData(params.generatedFrameUrl),
    ])

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${params.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { text: '[SOURCE FRAME]' },
              { inlineData: sourceInline },
              { text: '[GENERATED VIDEO FRAME]' },
              { inlineData: frameInline },
            ],
          }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    )
    if (!res.ok) throw new Error(`video-fidelity-audit HTTP ${res.status}`)

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const parsed = parseModelJsonResponse<{
      approved?: boolean
      blocking_issues?: string[]
      warning_issues?: string[]
      notes?: string[]
    }>(text)

    const blockingIssues = normalizeAuditIssueList(parsed.blocking_issues)
    const warningIssues = normalizeAuditIssueList(parsed.warning_issues)

    return {
      approved: Boolean(parsed.approved) && blockingIssues.length === 0,
      blockingIssues,
      warningIssues,
      notes: dedupeNormalizedStrings(parsed.notes ?? []).slice(0, 8),
    }
  } catch (error: any) {
    console.warn('[studio] auditGeneratedVideoFrameFidelity falhou:', error.message)
    return {
      approved: true,
      blockingIssues: [],
      warningIssues: [],
      notes: ['audit_unavailable'],
    }
  }
}

async function composeSceneWhiteStudioFitting(params: {
  portrait_url: string
  product_url: string
  product_urls?: string[]
  guided_overlay_references?: unknown[]
  aspect_ratio?: string
  fitting_category?: string
  vton_category?: string
  fitting_pose_preset?: string
  fitting_energy_preset?: string
  smart_prompt?: string
  assetId: string
  userId: string
}): Promise<ComposeSceneResult> {
  const admin = createAdminClient()
  const apiKey = (process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY) ?? ''
  if (!apiKey) throw new Error('GOOGLE_API_KEY nao configurada')

  const rawReferenceUrls = Array.isArray(params.product_urls)
    ? params.product_urls.filter((url): url is string => typeof url === 'string' && url.startsWith('http'))
    : []
  const referenceUrls = (rawReferenceUrls.length > 0 ? rawReferenceUrls : [params.product_url])
    .filter((url): url is string => typeof url === 'string' && url.startsWith('http'))
    .slice(0, 3)
  if (!params.portrait_url?.startsWith('http')) throw new Error('Imagem base da modelo invalida para o Provador')
  if (referenceUrls.length === 0) throw new Error('Nenhuma referencia valida foi enviada para o Provador')

  const referenceMode: FittingReferenceMode = referenceUrls.length > 1 ? 'separate-references' : 'single-look-photo'
  const explicitCategoryHint = getExplicitFittingCategoryHint(params.fitting_category ?? params.vton_category)
  const guidedOverlayReferences = normalizeGuidedOverlayReferences(params.guided_overlay_references)
  const referencePlan = buildSovereignProvadorReferencePlan({
    explicitCategoryHint,
    guidedOverlayReferences,
  })
  const normalizedPrompt = normalizeFittingPrompt(params.smart_prompt)
  const ratioInstruction = getComposeAspectRatioInstruction(params.aspect_ratio)
  const poseInstruction = getFittingPoseInstruction(params.fitting_pose_preset)
  const energyInstruction = getFittingEnergyInstruction(params.fitting_energy_preset)
  const userIntent = normalizedPrompt.intent
    ? `Light direction only: ${normalizedPrompt.intent}. Use it only for micro-pose, facial energy, gaze, or framing. Never let it change submitted item set, colors, logos, text, materials, structure, layering, or styling.`
    : 'No extra creative deviation. Prioritize literal submitted-item fidelity over styling.'

  if (referencePlan.conflictReasons.length > 0) {
    failGuidedFitting(
      `Referencias soberanas conflitantes: ${referencePlan.conflictReasons.join(', ')}`,
      {
        fitting_engine: 'scene_white_studio',
        fitting_route: 'scene_white_studio',
        fitting_primary_route: 'scene_white_studio',
        provador_engine: 'scene_white_studio',
        pricing_strategy: 'white_studio_fixed',
        pricing_tier: 'scene_white_studio',
        white_studio_lock: true,
        sovereign_mode: 'strict',
        smart_prompt_policy: 'light_pose_only',
        reference_conflict_policy: 'fail_on_same_zone_conflict',
        fitting_reference_mode: referenceMode,
        fitting_reference_mix_mode: referenceMode === 'single-look-photo' ? 'single-look-photo' : 'sovereign-complementary',
        submitted_item_categories: referencePlan.categories,
        submitted_item_manifest: referencePlan.manifest,
        conflict_reasons: referencePlan.conflictReasons,
        failure_state: 'scene_white_studio_reference_conflict',
      },
      'scene-white-studio:reference-conflict',
    )
  }

  async function fetchInlineData(url: string) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Download falhou: ${response.status}`)
    const mimeType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await response.arrayBuffer())
    return {
      url,
      mimeType,
      buffer,
      data: buffer.toString('base64'),
    }
  }

  const portraitInline = await fetchInlineData(params.portrait_url)
  const referenceInlines = await Promise.all(referenceUrls.map((url) => fetchInlineData(url)))
  const structuralSubmittedCategories = referencePlan.categories.filter((category) => isStructuralBodyCategory(category))
  const wearableSubmittedCategories = referencePlan.categories.filter((category) => isWearableFittingCategory(category))
  const submittedStructuralChecklist = structuralSubmittedCategories.length > 0
    ? `Submitted structural garment categories that must visibly replace the base outfit where relevant: ${structuralSubmittedCategories.join(', ')}.`
    : ''
  const submittedWearableChecklist = wearableSubmittedCategories.length > 0
    ? `Submitted wearable categories that must be visibly worn by the model in the final image: ${wearableSubmittedCategories.join(', ')}.`
    : ''
  const explicitReplacementRule = structuralSubmittedCategories.length > 0
    ? 'WARDROBE REPLACEMENT LOCK: the model must literally wear the submitted garments in the correct body zones. Remove every trace of the original base-photo clothing from any zone replaced by submitted tops, bottoms, outerwear, one-pieces, or footwear.'
    : 'WEAR RULE: any submitted wearable item must be visibly worn or used by the model with believable contact. Do not leave the base item unchanged when a submitted wearable exists.'
  const singleLookWearRule = referenceMode === 'single-look-photo'
    ? 'If the sovereign reference is a full look photo, reconstruct that exact worn look on the model. Do not keep the base model outfit unchanged.'
    : 'If multiple submitted references define one outfit, combine them into one coherent worn look on the model. Do not keep the base model outfit unchanged in any replaced zone.'

  const promptLines = [
    'You are a source-sovereign fashion restoration compositor.',
    'Create ONE unified white-studio fitting image from the submitted references.',
    'Treat the base model photo as identity sovereign: preserve the exact same person, face, hair, skin tone, body proportions, age appearance, and natural identity.',
    referenceMode === 'single-look-photo'
      ? 'Treat the submitted reference image as one sovereign restoration reference. Rebuild that exact visible look and exact visible items on the base model.'
      : 'Treat all submitted reference images as complementary sovereign references. Combine all compatible visible items into one single worn look on the base model without dropping any submitted item.',
    'SOVEREIGN ITEM LOCK: preserve submitted garments, footwear, bags, glasses, jewelry, props, printed text, logos, labels, hardware, materials, silhouettes, proportions, shape, trims, closures, and colors literally as submitted.',
    'Act like a restoration artist, not a stylist. Do not reinterpret, improve, beautify, simplify, premium-ize, recolor, resize, restyle, or swap any submitted item.',
    explicitReplacementRule,
    singleLookWearRule,
    submittedStructuralChecklist,
    submittedWearableChecklist,
    referencePlan.manifest.length > 0
      ? `Submitted sovereign checklist: ${referencePlan.manifest.join(', ')}.`
      : '',
    'If a submitted item has visible text, branding, logo, print, or packaging, keep it exactly identical. Do not change a single letter, mark, color, or placement.',
    'Keep every intentional submitted accessory or prop if it is visible in the reference. Do not omit items just because they are small.',
    'Background rule: final image must always be a pure white seamless studio background with natural e-commerce shadows only, even if the submitted reference has another environment.',
    ratioInstruction,
    poseInstruction,
    energyInstruction,
    userIntent,
    'Keep the person fully readable in frame whenever needed to show the complete sovereign look clearly.',
    'Output: photorealistic premium studio fashion photo, natural commercial lighting, no collage, no watermark, no text outside the submitted item itself.',
  ].filter(Boolean)
  const finalPrompt = promptLines.join(' ')
  const geminiChain = ['gemini-3-pro-image-preview', 'gemini-3.1-flash-image-preview']
  const modelChainTried = new Set<string>()
  let lastGeminiError = ''

  function resolveSceneWhiteStudioFailureState(providerError: string) {
    const normalizedError = providerError.toLowerCase()
    return /429|quota|resource_exhausted|provider|temporar|unavailable|google/i.test(normalizedError)
      ? 'scene_white_studio_provider_unavailable'
      : 'scene_white_studio_generation_failed'
  }

  async function runGeminiWhiteStudioAttempt(promptText: string, stageLabel: string): Promise<{ buffer: Buffer | null; modelUsed: string; lastError: string }> {
    let attemptLastError = ''

    for (const model of geminiChain) {
      modelChainTried.add(model)
      try {
        console.log(`[studio] fitting scene_white_studio | trying=${model} stage=${stageLabel} mode=${referenceMode} refs=${referenceInlines.length}`)
        const parts: Array<Record<string, unknown>> = [
          { text: '[BASE MODEL PHOTO] Preserve this person exactly.' },
          { inlineData: { mimeType: portraitInline.mimeType, data: portraitInline.data } },
        ]

        referenceInlines.forEach((reference, index) => {
          parts.push({
            text: referenceMode === 'single-look-photo'
              ? '[SOVEREIGN LOOK REFERENCE] Preserve every intentional visible item and object from this image.'
              : `[SOVEREIGN LOOK REFERENCE ${index + 1}] Combine this reference faithfully into the final white-studio look.`,
          })
          parts.push({ inlineData: { mimeType: reference.mimeType, data: reference.data } })
        })

        parts.push({ text: promptText })

        const res = await fetchGoogleGenerateContent({
          model,
          feature: 'compose_fitting_white_studio',
          body: {
            contents: [{ role: 'user', parts }],
            generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
          },
        })
        if (!res.ok) throw new Error(`${model}: ${res.status} ${await res.text()}`)
        const data = await res.json()
        const imagePart = (data.candidates?.[0]?.content?.parts ?? []).find((part: any) => part.inlineData?.mimeType?.startsWith('image/'))
        if (!imagePart?.inlineData?.data) {
          throw new Error(`${model} sem imagem | reason=${data.candidates?.[0]?.finishReason}`)
        }
        console.log(`[studio] fitting scene_white_studio success=${model} stage=${stageLabel} via=vertex`)
        return { buffer: Buffer.from(imagePart.inlineData.data, 'base64'), modelUsed: model, lastError: '' }
      } catch (error: any) {
        attemptLastError = error.message
        lastGeminiError = error.message
        console.warn(`[studio] fitting scene_white_studio fail=${model} stage=${stageLabel}:`, error.message)
      }
    }

    return { buffer: null, modelUsed: '', lastError: attemptLastError }
  }

  async function uploadSceneWhiteStudioBuffer(buffer: Buffer) {
    const fileName = `compose-fitting-${params.assetId}-${Date.now()}.jpg`
    const filePath = `${params.userId}/${fileName}`
    const { error: uploadError } = await admin.storage
      .from('studio')
      .upload(filePath, buffer, { contentType: 'image/jpeg', upsert: true })
    if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`)
    const { data: urlData } = admin.storage.from('studio').getPublicUrl(filePath)
    return urlData.publicUrl
  }

  // Primary: Vertex VTO (virtual-try-on-001) — usa créditos Vertex AI
  try {
    console.log(`[studio] fitting vto | trying=vertex:virtual-try-on-001 mode=${referenceMode} refs=${referenceInlines.length}`)
    const vtoItems: SegmentedFittingItem[] = referenceInlines.map((ref, idx) => ({
      imageBuffer: ref.buffer,
      mimeType: ref.mimeType,
      bbox: { left: 0, top: 0, width: 1, height: 1, area: 1 },
      profile: {
        category: explicitCategoryHint ?? params.fitting_category ?? params.vton_category ?? 'garment',
        has_text_logo: false,
        deformation_risk: 'low' as const,
        shape_complexity: 'medium' as const,
        placement_suggestion: 'wear',
        key_features: [],
      },
      category: explicitCategoryHint ?? params.fitting_category ?? params.vton_category ?? 'garment',
      description: `reference item ${idx + 1}`,
      priority: idx,
    }))
    const vtoResult = await callVertexVirtualTryOn({
      portraitBuffer: portraitInline.buffer,
      portraitMimeType: portraitInline.mimeType,
      items: vtoItems,
      fittingRoute: referenceInlines.length > 1 ? 'vertex-vto-look' : 'vertex-vto-wear',
      executionMode: referenceInlines.length > 1 ? 'multi-ref-batch' : 'single-photo-whole-look',
    })
    if (vtoResult.imageBase64) {
      const vtoBuffer = Buffer.from(vtoResult.imageBase64, 'base64')
      const vtoPublicUrl = await uploadSceneWhiteStudioBuffer(vtoBuffer)
      return {
        url: vtoPublicUrl,
        extraData: {
          fitting_engine: 'vertex_vto',
          fitting_route: 'vertex_vto',
          fitting_primary_route: 'vertex_vto',
          provador_engine: 'vertex_vto',
          billing_route: 'vertex_vto_predict',
          stage1_engine: 'vertex:virtual-try-on-001',
          stage2_engine: 'none',
          fallback_used: false,
          white_studio_lock: true,
          sovereign_mode: 'strict',
          fitting_reference_mode: referenceMode,
          submitted_item_categories: referencePlan.categories,
          submitted_item_manifest: referencePlan.manifest,
        },
      }
    }
    console.warn('[studio] fitting vto | no image returned, falling back to gemini chain')
  } catch (vtoError: unknown) {
    console.warn(`[studio] fitting vto | error, falling back to gemini chain: ${vtoError instanceof Error ? vtoError.message : String(vtoError)}`)
  }

  const attemptOne = await runGeminiWhiteStudioAttempt(finalPrompt, 'attempt-1')
  if (!attemptOne.buffer) {
    const failureState = resolveSceneWhiteStudioFailureState(lastGeminiError)

    if (failureState === 'scene_white_studio_provider_unavailable') {
      console.warn(
        `[studio] fitting scene_white_studio fallback=legacy route=composeDedicatedFittingScene reason=${lastGeminiError || 'gemini_sem_imagem'}`,
      )

      try {
        const fallbackResult = await composeDedicatedFittingScene({
          portrait_url: params.portrait_url,
          product_url: params.product_url,
          product_urls: params.product_urls,
          guided_overlay_references: params.guided_overlay_references,
          aspect_ratio: params.aspect_ratio,
          fitting_category: params.fitting_category,
          vton_category: params.vton_category,
          fitting_pose_preset: params.fitting_pose_preset,
          fitting_energy_preset: params.fitting_energy_preset,
          smart_prompt: params.smart_prompt,
          assetId: params.assetId,
          userId: params.userId,
        })

        return {
          url: fallbackResult.url,
          extraData: {
            ...(fallbackResult.extraData ?? {}),
            fallback_used: true,
            scene_white_studio_fallback_used: true,
            scene_white_studio_fallback_path: 'composeDedicatedFittingScene',
            scene_white_studio_fallback_reason: failureState,
            scene_white_studio_model_chain_tried: Array.from(modelChainTried),
            scene_white_studio_last_provider_error: lastGeminiError,
            scene_white_studio_reference_mode: referenceMode,
          },
        }
      } catch (fallbackError: unknown) {
        const baseError = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError))
        const fallbackFailure =
          fallbackError && typeof fallbackError === 'object'
            ? fallbackError as StudioFailureContext
            : {}

        console.warn(
          `[studio] fitting scene_white_studio fallback_failed=legacy reason=${baseError.message}`,
        )

        throw attachStudioFailureContext(
          baseError,
          {
            ...(fallbackFailure.studioFailureData ?? {}),
            fallback_used: true,
            scene_white_studio_fallback_used: true,
            scene_white_studio_fallback_failed: true,
            scene_white_studio_fallback_path: 'composeDedicatedFittingScene',
            scene_white_studio_fallback_reason: failureState,
            scene_white_studio_model_chain_tried: Array.from(modelChainTried),
            scene_white_studio_last_provider_error: lastGeminiError,
            scene_white_studio_reference_mode: referenceMode,
          },
          fallbackFailure.studioRefundReason ?? 'scene-white-studio:legacy-fallback-failed',
        )
      }
    }

    failGuidedFitting(
      `Provador soberano indisponivel: ${lastGeminiError || 'gemini_sem_imagem'}`,
      {
        fitting_engine: 'scene_white_studio',
        fitting_route: 'scene_white_studio',
        fitting_primary_route: 'scene_white_studio',
        provador_engine: 'scene_white_studio',
        stage1_engine: 'gemini:scene_white_studio',
        stage2_engine: 'none',
        fitting_strategy: 'scene_white_studio',
        pricing_strategy: 'white_studio_fixed',
        pricing_tier: 'scene_white_studio',
        fallback_used: false,
        white_studio_lock: true,
        sovereign_mode: 'strict',
        smart_prompt_policy: 'light_pose_only',
        reference_conflict_policy: 'fail_on_same_zone_conflict',
        fitting_reference_mode: referenceMode,
        fitting_reference_mix_mode: referenceMode === 'single-look-photo' ? 'single-look-photo' : 'sovereign-complementary',
        required_all_submitted_items: true,
        submitted_item_categories: referencePlan.categories,
        submitted_item_manifest: referencePlan.manifest,
        model_chain_tried: Array.from(modelChainTried),
        last_provider_error: lastGeminiError,
        failure_state: failureState,
      },
      'scene-white-studio:provider-unavailable',
    )
  }

  const publicUrl = await uploadSceneWhiteStudioBuffer(attemptOne.buffer)

  const extraData: Record<string, unknown> = {
    fitting_engine: 'scene_white_studio',
    fitting_route: 'scene_white_studio',
    fitting_primary_route: 'scene_white_studio',
    provador_engine: 'scene_white_studio',
    stage1_engine: `gemini:${attemptOne.modelUsed}`,
    stage2_engine: 'none',
    fitting_strategy: 'scene_white_studio',
    pricing_strategy: 'white_studio_fixed',
    pricing_tier: 'scene_white_studio',
    fallback_used: false,
    provador_qc_mode: 'sovereign_prompt_only',
    provador_delivery_basis: 'direct_sovereign_generation',
    sovereign_mode: 'strict',
    smart_prompt_policy: 'light_pose_only',
    reference_conflict_policy: 'fail_on_same_zone_conflict',
    model_chain_tried: Array.from(modelChainTried),
    white_studio_lock: true,
    required_all_submitted_items: true,
    submitted_item_categories: referencePlan.categories,
    submitted_non_fashion_items: [],
    submitted_item_manifest: referencePlan.manifest,
    missing_or_distorted_items: [],
    advisory_missing_or_distorted_items: [],
    soft_missing_or_distorted_items: [],
    audit_unavailable: false,
    reference_mode: referenceMode,
    fitting_reference_mode: referenceMode,
    fitting_input_mode: referenceMode,
    fitting_reference_mix_mode: referenceMode === 'single-look-photo' ? 'single-look-photo' : 'sovereign-complementary',
    generation_budget_profile: 'direct-sovereign-scene-white-studio',
    removed_directives: normalizedPrompt.removedDirectives,
  }

  return { url: publicUrl, extraData }
}

// Legacy Vertex-based try-on pipeline.
// Inactive for the public Provador flow: keep only as technical reference until full removal.
async function composeDedicatedFittingScene(params: {
  portrait_url: string
  product_url: string
  product_urls?: string[]
  guided_overlay_references?: unknown[]
  position?: string
  product_scale?: number
  aspect_ratio?: string
  fitting_category?: string
  fitting_group?: string
  vton_category?: string
  fitting_pose_preset?: string
  fitting_energy_preset?: string
  smart_prompt?: string
  pricing_preflight?: ProvadorPricingPreflight
  assetId: string
  userId: string
}): Promise<ComposeSceneResult> {
  const admin = createAdminClient()
  const apiKey = (process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY) ?? 'vertex-managed'
  if (!apiKey) throw new Error('GOOGLE_API_KEY nÃƒÂ£o configurada')

  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY nÃƒÂ£o configurada')

  const rawReferenceUrls = Array.isArray(params.product_urls)
    ? params.product_urls.filter((url): url is string => typeof url === 'string' && url.startsWith('http'))
    : []
  const referenceUrls = (rawReferenceUrls.length > 0 ? rawReferenceUrls : [params.product_url])
    .filter((url): url is string => typeof url === 'string' && url.startsWith('http'))
    .slice(0, 3)
  if (referenceUrls.length === 0) throw new Error('Nenhuma referencia valida foi enviada para o Provador')

  const referenceMode: FittingReferenceMode = referenceUrls.length > 1 ? 'separate-references' : 'single-look-photo'
  const explicitCategoryHint = getExplicitFittingCategoryHint(params.fitting_category ?? params.vton_category)
  const requestedFittingGroup = normalizeRequestedFittingGroup(params.fitting_group)
  const guidedOverlayReferences = normalizeGuidedOverlayReferences(params.guided_overlay_references)

  const [portraitRes, ...referenceResponses] = await Promise.all([
    fetch(params.portrait_url),
    ...referenceUrls.map((url) => fetch(url)),
  ])
  if (!portraitRes.ok || referenceResponses.some((response) => !response.ok)) {
    throw new Error('Falha ao baixar imagens para o Provador')
  }

  const portraitBuf = Buffer.from(await portraitRes.arrayBuffer())
  const referenceBuffers = await Promise.all(
    referenceResponses.map((response) => response.arrayBuffer().then((buffer) => Buffer.from(buffer))),
  )

  const finalReferenceBuffers = await Promise.all(referenceUrls.map(async (url, index) => {
    let cleanedBuffer = referenceBuffers[index]
    try {
      const bgRes = await fetch('https://fal.run/fal-ai/bria/background-removal', {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: url }),
      })
      if (bgRes.ok) {
        const bgData = await bgRes.json()
        const cleanUrl = bgData.image?.url as string | undefined
        if (cleanUrl) {
          const cleanRes = await fetch(cleanUrl)
          if (cleanRes.ok) {
            cleanedBuffer = Buffer.from(await cleanRes.arrayBuffer())
          }
        }
      }
    } catch (error) {
      console.warn(`[studio] Bria falhou no Provador dedicado para referencia ${index + 1}:`, error)
    }
    return cleanedBuffer
  }))

  const normalizedPrompt = normalizeFittingPrompt(params.smart_prompt)
  if (normalizedPrompt.removedDirectives.length > 0) {
    console.log(`[studio] fitting prompt normalized | removed=${normalizedPrompt.removedDirectives.join(', ')}`)
  }

  const detectedItems = referenceMode === 'single-look-photo'
    ? (await segmentProductReference(
      finalReferenceBuffers[0],
      apiKey,
      explicitCategoryHint,
    )).items
    : await Promise.all(finalReferenceBuffers.map((buffer, index) => (
      buildWholeReferenceItem(
        buffer,
        apiKey,
        index === 0 ? explicitCategoryHint : undefined,
        index,
      )
    )))

  detectedItems.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    return b.bbox.area - a.bbox.area
  })

  let fittingGroup = inferFittingGroup({
    requestedGroup: requestedFittingGroup,
    explicitCategoryHint,
    detectedItems,
  })
  const fittingGroupRequestMode = getFittingGroupRequestMode(requestedFittingGroup)

  console.log(
    `[studio] fitting entry | mode=${referenceMode} group=${fittingGroup} requested_group=${requestedFittingGroup ?? 'auto'} reference_count=${referenceUrls.length} detected_count=${detectedItems.length} categories=${detectedItems.map((item) => item.category).join(',') || 'none'} explicit_hint=${explicitCategoryHint ?? 'none'}`,
  )

  let selectedItems: SegmentedFittingItem[] = []
  let selectedZones: FittingZone[] = []
  let omittedItemCount = 0
  let fittingRoute: FittingRoute
  let routedFittingCategory: string
  let singlePhotoPaddingMode: ReferencePaddingMode | undefined
  let singlePhotoPrimaryWearableCategory: string | undefined
  let singlePhotoGroupDecisionSource: string | undefined
  let singlePhotoPrimaryProductType: string | undefined
  let singlePhotoGarmentPriorityApplied = false
  let singlePhotoOverlayOnlyCategories: string[] = []
  let singlePhotoIgnoredProps: string[] = []
  let singlePhotoUsesSegmentedWearables = false
  let fittingReferenceModeInternal: FittingReferenceModeInternal = referenceMode === 'single-look-photo'
    ? 'direct-single-photo'
    : 'separate-references'
  let selectedAccessoryAnalyses: AccessoryReferenceAnalysis[] = []
  let selectedAccessoryDetailItems: SegmentedFittingItem[] = []
  let ignoredPropTypes: string[] = []
  let fittingStrategy: FittingStrategy = 'gemini_provador'
  const accessoryMissingMessage = 'Nao detectamos acessorios com confianca nessa referencia. Envie uma referencia mais limpa ou menos itens por vez.'
  const accessorySingleLimitMessage = 'Detectamos mais de 6 acessorios nessa imagem. Divida em mais de uma geracao.'
  const accessoryTotalLimitMessage = 'Detectamos mais de 6 acessorios no total das referencias enviadas. Divida em mais de uma geracao.'

  if (referenceMode === 'single-look-photo') {
    const initialWholeLookItem = await buildWholeReferenceItem(finalReferenceBuffers[0], apiKey, explicitCategoryHint, 0)
    const wearableCandidates = detectedItems.filter((item) => isWearableFittingCategory(item.category))
    const accessoryCandidates = detectedItems.filter((item) => isBodyAccessoryFittingCategory(item.category))
    const primaryWearableCandidate = wearableCandidates[0]
    omittedItemCount = Math.max(0, detectedItems.length - 1)
    let singleLookWearableAnalysis: SingleLookWearableAnalysis | null = null

    if (
      fittingGroup === 'fashion_accessories'
      || !primaryWearableCandidate
      || !isStructuralBodyCategory(primaryWearableCandidate.category)
      || !isStructuralBodyCategory(initialWholeLookItem.category)
    ) {
      singleLookWearableAnalysis = await analyzeSingleLookWearableReference(finalReferenceBuffers[0], apiKey)
    }

    const garmentPriorityStructuralCategories = collectSingleLookStructuralCategories({
      detectedItems,
      wholeImageCategory: initialWholeLookItem.category,
      wearableAnalysis: singleLookWearableAnalysis,
    })
    singlePhotoPrimaryProductType = deriveSinglePhotoPrimaryProductType({
      structuralCategories: garmentPriorityStructuralCategories,
      primaryWearableCategory: primaryWearableCandidate?.category,
    })

    if (shouldPrioritizeGarmentLookboard({
      fittingInputMode: referenceMode,
      detectedItems,
      wholeImageCategory: initialWholeLookItem.category,
      wearableAnalysis: singleLookWearableAnalysis,
    })) {
      singlePhotoGarmentPriorityApplied = fittingGroup === 'fashion_accessories'
      fittingGroup = 'wearables'
      if (singlePhotoGarmentPriorityApplied) {
        singlePhotoGroupDecisionSource = 'garment-priority-mixed-lookboard'
      }
    }

    console.log(
      `[studio] fitting single-photo analysis | group=${fittingGroup} whole_image_category=${initialWholeLookItem.category} wearable_candidate_count=${wearableCandidates.length} accessory_candidate_count=${accessoryCandidates.length} primary_wearable_category=${primaryWearableCandidate?.category ?? 'none'}`,
    )

    if (fittingGroup === 'fashion_accessories') {
      const rawAccessoryAnalysis = await analyzeAccessoryReference(
        finalReferenceBuffers[0],
        apiKey,
        0,
        referenceUrls[0],
      )
      const accessoryAnalysis = rawAccessoryAnalysis ? filterAccessoryAnalysisItems(rawAccessoryAnalysis) : null
      const detectedAccessoryTypes = accessoryAnalysis ? collectAccessoryTypes([accessoryAnalysis]) : []

      if (!accessoryAnalysis || !accessoryAnalysis.containsAccessories || accessoryAnalysis.items.length === 0) {
        const failureData = {
          fitting_group: fittingGroup,
          fitting_reference_mode: referenceMode,
          detected_categories: detectedItems.map((item) => item.category),
          selected_item_categories: [],
          selected_item_zones: [],
          qc_failure_kind: 'accessory-reference-not-detected',
          accessory_reference_kind: accessoryAnalysis?.referenceKind ?? 'unclear',
          accessory_detected_count: accessoryAnalysis?.accessoryCount ?? 0,
          accessory_detected_types: detectedAccessoryTypes,
          single_photo_group_decision_source: 'reference-driven-accessory-missing',
        }
        failGuidedFitting(accessoryMissingMessage, failureData, 'guided:compose-accessory-missing')
      }

      if (accessoryAnalysis.reportedAccessoryCount > 6) {
        const failureData = {
          fitting_group: fittingGroup,
          fitting_reference_mode: referenceMode,
          detected_categories: detectedItems.map((item) => item.category),
          selected_item_categories: [],
          selected_item_zones: [],
          qc_failure_kind: 'accessory-over-limit-single-photo',
          accessory_reference_kind: accessoryAnalysis.referenceKind,
          accessory_detected_count: accessoryAnalysis.reportedAccessoryCount,
          accessory_detected_types: detectedAccessoryTypes,
          single_photo_group_decision_source: 'reference-driven-accessory-over-limit',
        }
        failGuidedFitting(accessorySingleLimitMessage, failureData, 'guided:compose-accessory-over-limit')
      }

      selectedAccessoryAnalyses = [accessoryAnalysis]
      ignoredPropTypes = accessoryAnalysis.ignoredNonFashionProps
      const detectedAccessoryItems = detectedItems
        .filter((item) => isAccessoryCompatibleFittingCategory(item.category))
        .slice(0, 6)
      selectedItems = detectedAccessoryItems.length > 0
        ? detectedAccessoryItems
        : buildAccessorySegmentedItemsFromAnalyses(selectedAccessoryAnalyses)
      selectedAccessoryDetailItems = selectedItems
      selectedZones = selectedItems.map((item) => getFittingZone(item.category))
      fittingRoute = 'gemini-hold-accessories'
      fittingStrategy = 'gemini_only_accessories'
      routedFittingCategory = selectedItems[0]?.category ?? 'other-accessory'
      singlePhotoGroupDecisionSource = accessoryAnalysis.referenceKind === 'accessory-set'
        ? 'reference-driven-accessory-set'
        : 'reference-driven-accessory-single'
      console.log(
        `[studio] single-photo-accessory | detected_categories=${detectedItems.map((item) => item.category).join(',') || initialWholeLookItem.category} whole_image_category=${initialWholeLookItem.category} wearable_candidate_count=${wearableCandidates.length} accessory_candidate_count=${accessoryCandidates.length} accessory_reference_kind=${accessoryAnalysis.referenceKind} accessory_count=${accessoryAnalysis.accessoryCount} accessory_types=${detectedAccessoryTypes.join(',') || 'none'} routed_category=${routedFittingCategory} decision_source=${singlePhotoGroupDecisionSource} sent_as=single-accessory-reference`,
      )
    } else {
      let wearableRouteCategory = primaryWearableCandidate?.category
        ?? (isWearableFittingCategory(initialWholeLookItem.category) ? initialWholeLookItem.category : undefined)
      let wearableRouteProfile = primaryWearableCandidate?.profile ?? initialWholeLookItem.profile

      if (!wearableRouteCategory) {
        const analyzedPrimaryCategory = parseKnownFittingCategory(singleLookWearableAnalysis?.primary_category)
        if (analyzedPrimaryCategory && isWearableFittingCategory(analyzedPrimaryCategory) && singleLookWearableAnalysis?.contains_wearable) {
          wearableRouteCategory = analyzedPrimaryCategory
          wearableRouteProfile = {
            category: analyzedPrimaryCategory,
            has_text_logo: initialWholeLookItem.profile.has_text_logo,
            deformation_risk: initialWholeLookItem.profile.deformation_risk,
            shape_complexity: initialWholeLookItem.profile.shape_complexity,
            placement_suggestion: singleLookWearableAnalysis.placement_suggestion || initialWholeLookItem.profile.placement_suggestion,
            key_features: singleLookWearableAnalysis.key_features.length > 0
              ? singleLookWearableAnalysis.key_features
              : initialWholeLookItem.profile.key_features,
          }
          console.log(
            `[studio] fitting single-photo rescue | image_kind=${singleLookWearableAnalysis.image_kind} primary_category=${analyzedPrimaryCategory} secondary_categories=${singleLookWearableAnalysis.secondary_categories.join(',') || 'none'} contains_wearable=${singleLookWearableAnalysis.contains_wearable}`,
          )
        }
      }

      singlePhotoPrimaryWearableCategory = wearableRouteCategory

      if (!wearableRouteCategory) {
        const failureData = {
          fitting_group: fittingGroup,
          fitting_reference_mode: referenceMode,
          detected_categories: detectedItems.map((item) => item.category),
          selected_item_categories: [],
          selected_item_zones: [],
          qc_failure_kind: 'group-mismatch-single-photo',
          single_photo_primary_wearable_category: undefined,
          single_photo_group_decision_source: singleLookWearableAnalysis ? 'lookboard-analysis-guided-fail' : 'all-accessories-guided-fail',
        }
        failGuidedFitting(buildFittingGroupMismatchMessage(fittingGroup), failureData, 'guided:compose-group-mismatch')
      }

      if (!singlePhotoGroupDecisionSource) {
        singlePhotoGroupDecisionSource = primaryWearableCandidate
          ? 'segmented-wearable'
          : singleLookWearableAnalysis
            ? 'lookboard-analysis-wearable'
            : 'whole-image-wearable'
      }

      const segmentedSingleLook = selectFittingItemsForLook(wearableCandidates, 3, {
        preferredCategories: [wearableRouteCategory],
        includeAccessoryCategories: ['shoes'],
      })
      const segmentedWearableItems = segmentedSingleLook.items.filter((item) => isWearableFittingCategory(item.category))
      const segmentedStructuralWearables = segmentedWearableItems.filter((item) => isStructuralBodyCategory(item.category))
      const deferredHeadwearItems = wearableCandidates.filter((item) => (
        item.category === 'headwear'
        && !segmentedWearableItems.includes(item)
        && segmentedStructuralWearables.length > 0
      ))

      if (deferredHeadwearItems.length > 0) {
        const headwearAnalyses = deferredHeadwearItems.map((item) => buildSyntheticAccessoryAnalysisFromSegmentedItem(item))
        selectedAccessoryAnalyses = [...selectedAccessoryAnalyses, ...headwearAnalyses]
        selectedAccessoryDetailItems = [
          ...selectedAccessoryDetailItems,
          ...deferredHeadwearItems,
        ]
        ignoredPropTypes = Array.from(new Set(ignoredPropTypes))
        fittingStrategy = 'gemini_provador'
      }

      if (segmentedWearableItems.length > 1) {
        selectedItems = segmentedWearableItems
        selectedZones = segmentedWearableItems.map((item) => getFittingZone(item.category))
        omittedItemCount = Math.max(0, detectedItems.length - segmentedWearableItems.length)
        fittingRoute = decideFittingRoute(segmentedWearableItems)
        routedFittingCategory = wearableRouteCategory
        singlePhotoUsesSegmentedWearables = true
        fittingReferenceModeInternal = 'auto-split-from-single-photo'
        if (!singlePhotoGarmentPriorityApplied) {
          singlePhotoGroupDecisionSource = 'segmented-multi-item-single-photo'
        }
        console.log(
          `[studio] single-photo-segmented-look | detected_categories=${detectedItems.map((item) => item.category).join(',') || wearableRouteCategory} selected_categories=${segmentedWearableItems.map((item) => item.category).join(',')} primary_wearable_category=${singlePhotoPrimaryWearableCategory ?? 'none'} omitted_count=${omittedItemCount}`,
        )
      } else {
        const preparedReference = await prepareSingleLookReferenceForGeneration(
          finalReferenceBuffers[0],
          wearableRouteCategory,
          wearableRouteProfile,
        )
        const sharp = (await import('sharp')).default
        const preparedMetadata = await sharp(preparedReference.image.buffer).metadata()
        const wholeLookItem: SegmentedFittingItem = {
          ...initialWholeLookItem,
          profile: wearableRouteProfile,
          category: wearableRouteCategory,
          description: buildSegmentedItemDescription(wearableRouteProfile, wearableRouteCategory),
          priority: getFittingRoutePriority(wearableRouteCategory),
          imageBuffer: preparedReference.image.buffer,
          mimeType: preparedReference.image.mimeType,
          bbox: {
            left: 0,
            top: 0,
            width: Math.max(1, preparedMetadata.width ?? 1),
            height: Math.max(1, preparedMetadata.height ?? 1),
            area: Math.max(1, (preparedMetadata.width ?? 1) * (preparedMetadata.height ?? 1)),
          },
        }
        selectedItems = [wholeLookItem]
        selectedZones = [getFittingZone(wholeLookItem.category)]
        fittingRoute = decideFittingRoute([wholeLookItem])
        routedFittingCategory = wholeLookItem.category
        singlePhotoPaddingMode = preparedReference.paddingMode
        console.log(
          `[studio] single-photo-whole-look | detected_categories=${detectedItems.map((item) => item.category).join(',') || wholeLookItem.category} whole_image_category=${initialWholeLookItem.category} wearable_candidate_count=${wearableCandidates.length} accessory_candidate_count=${accessoryCandidates.length} primary_wearable_category=${singlePhotoPrimaryWearableCategory ?? 'none'} routed_category=${wholeLookItem.category} decision_source=${singlePhotoGroupDecisionSource} sent_as=single-full-look-reference`,
        )
      }

      const rawMixedAccessoryAnalysis = await analyzeAccessoryReference(
        finalReferenceBuffers[0],
        apiKey,
        0,
        referenceUrls[0],
      )
      const mixedAccessoryAnalysis = rawMixedAccessoryAnalysis ? filterAccessoryAnalysisItems(rawMixedAccessoryAnalysis) : null
      if (mixedAccessoryAnalysis) {
        ignoredPropTypes = mixedAccessoryAnalysis.ignoredNonFashionProps
        singlePhotoIgnoredProps = mixedAccessoryAnalysis.ignoredNonFashionProps
      }
      if (mixedAccessoryAnalysis && mixedAccessoryAnalysis.containsAccessories && mixedAccessoryAnalysis.items.length > 0) {
        selectedAccessoryAnalyses = [...selectedAccessoryAnalyses, mixedAccessoryAnalysis]
        selectedAccessoryDetailItems = [
          ...selectedAccessoryDetailItems,
          ...buildAccessorySegmentedItemsFromAnalyses([mixedAccessoryAnalysis]),
        ]
        singlePhotoOverlayOnlyCategories = collectOverlayOnlyAccessoryCategories([mixedAccessoryAnalysis])
        fittingStrategy = 'gemini_provador'
      }
    }
  } else {
    if (fittingGroup === 'fashion_accessories') {
      const rawAccessoryAnalyses = await Promise.all(
        finalReferenceBuffers.map((buffer, index) => analyzeAccessoryReference(buffer, apiKey, index, referenceUrls[index])),
      )
      const accessoryAnalyses = rawAccessoryAnalyses
        .filter((analysis): analysis is AccessoryReferenceAnalysis => Boolean(analysis))
        .map((analysis) => filterAccessoryAnalysisItems(analysis))

      if (accessoryAnalyses.length !== referenceUrls.length || accessoryAnalyses.some((analysis) => !analysis.containsAccessories || analysis.items.length === 0)) {
        const failureData = {
          fitting_group: fittingGroup,
          fitting_reference_mode: referenceMode,
          detected_categories: detectedItems.map((item) => item.category),
          selected_item_categories: [],
          selected_item_zones: [],
          qc_failure_kind: 'accessory-reference-not-detected',
        }
        failGuidedFitting(accessoryMissingMessage, failureData, 'guided:compose-accessory-missing')
      }

      const totalReportedAccessoryCount = sumReportedAccessoryCount(accessoryAnalyses)
      if (totalReportedAccessoryCount > 6) {
        const failureData = {
          fitting_group: fittingGroup,
          fitting_reference_mode: referenceMode,
          detected_categories: detectedItems.map((item) => item.category),
          selected_item_categories: [],
          selected_item_zones: [],
          qc_failure_kind: 'accessory-over-limit-multi-reference',
          accessory_detected_count: totalReportedAccessoryCount,
          accessory_detected_types: collectAccessoryTypes(accessoryAnalyses),
        }
        failGuidedFitting(accessoryTotalLimitMessage, failureData, 'guided:compose-accessory-over-limit')
      }

      selectedAccessoryAnalyses = accessoryAnalyses
      selectedItems = buildAccessorySegmentedItemsFromAnalyses(selectedAccessoryAnalyses)
      selectedZones = collectAccessoryZones(selectedAccessoryAnalyses)
      omittedItemCount = 0
      fittingRoute = 'provador-multi'
      routedFittingCategory = selectedItems[0]?.category ?? 'other-accessory'
      console.log(
        `[studio] multi-ref-accessory | reference_count=${referenceUrls.length} accessory_total=${selectedItems.length} accessory_types=${collectAccessoryTypes(selectedAccessoryAnalyses).join(',') || 'none'} routed_category=${routedFittingCategory}`,
      )
    } else {
      const wearableReferenceItems = detectedItems.filter((item) => isWearableFittingCategory(item.category))
      const accessoryReferenceSeedItems = detectedItems.filter((item) => (
        !isWearableFittingCategory(item.category) && isAccessoryCompatibleFittingCategory(item.category)
      ))
      const accessorySourceIndexes = Array.from(new Set(
        accessoryReferenceSeedItems
          .map((item) => item.sourceIndex)
          .filter((value): value is number => typeof value === 'number'),
      ))

      if (accessorySourceIndexes.length > 0) {
        const rawAccessoryAnalyses = await Promise.all(
          accessorySourceIndexes.map((sourceIndex) => analyzeAccessoryReference(
            finalReferenceBuffers[sourceIndex],
            apiKey,
            sourceIndex,
            referenceUrls[sourceIndex],
          )),
        )
        const accessoryAnalyses = rawAccessoryAnalyses
          .filter((analysis): analysis is AccessoryReferenceAnalysis => Boolean(analysis))
          .map((analysis) => filterAccessoryAnalysisItems(analysis))

        if (accessoryAnalyses.length !== accessorySourceIndexes.length || accessoryAnalyses.some((analysis) => !analysis.containsAccessories || analysis.items.length === 0)) {
          const failureData = {
            fitting_group: fittingGroup,
            fitting_reference_mode: referenceMode,
            detected_categories: detectedItems.map((item) => item.category),
            selected_item_categories: [],
            selected_item_zones: [],
            qc_failure_kind: 'accessory-reference-not-detected',
          }
          failGuidedFitting(accessoryMissingMessage, failureData, 'guided:compose-accessory-missing')
        }

        const totalReportedAccessoryCount = sumReportedAccessoryCount(accessoryAnalyses)
        if (totalReportedAccessoryCount > 6) {
          const failureData = {
            fitting_group: fittingGroup,
            fitting_reference_mode: referenceMode,
            detected_categories: detectedItems.map((item) => item.category),
            selected_item_categories: [],
            selected_item_zones: [],
            qc_failure_kind: 'accessory-over-limit-multi-reference',
            accessory_detected_count: totalReportedAccessoryCount,
            accessory_detected_types: collectAccessoryTypes(accessoryAnalyses),
          }
          failGuidedFitting(accessoryTotalLimitMessage, failureData, 'guided:compose-accessory-over-limit')
        }

        selectedAccessoryAnalyses = accessoryAnalyses
        selectedAccessoryDetailItems = buildAccessorySegmentedItemsFromAnalyses(selectedAccessoryAnalyses)
        ignoredPropTypes = collectIgnoredPropTypes(selectedAccessoryAnalyses)
      }

      if (guidedOverlayReferences.length > 0) {
        const guidedAccessoryAnalyses = (await Promise.all(
          guidedOverlayReferences
            .filter((reference) => reference.role === 'overlay-only')
            .map((reference) => buildGuidedAccessoryAnalysisFromReference(reference)),
        )).filter((analysis): analysis is AccessoryReferenceAnalysis => Boolean(analysis))

        if (guidedAccessoryAnalyses.length > 0) {
          selectedAccessoryAnalyses = [...selectedAccessoryAnalyses, ...guidedAccessoryAnalyses]
          selectedAccessoryDetailItems = [
            ...selectedAccessoryDetailItems,
            ...buildAccessorySegmentedItemsFromAnalyses(guidedAccessoryAnalyses),
          ]
          fittingStrategy = 'gemini_provador'
        }
      }

      const conflictMessage = validateSeparateReferenceItems(wearableReferenceItems)
      if (conflictMessage) {
        const failureData = {
          fitting_group: fittingGroup,
          fitting_reference_mode: referenceMode,
          fitting_generation_strategy: 'guided-fail-before-generation' satisfies FittingGenerationStrategy,
          qc_failure_kind: 'preflight-reference-conflict',
          detected_categories: wearableReferenceItems.map((item) => item.category),
          selected_item_categories: [],
          selected_item_zones: [],
        }
        console.warn(`[studio] fitting preflight conflict | categories=${wearableReferenceItems.map((item) => item.category).join(',')}`)
        failGuidedFitting(conflictMessage, failureData, 'guided:compose-reference-conflict')
      }

      if (wearableReferenceItems.length === 0) {
        const failureData = {
          fitting_group: fittingGroup,
          fitting_reference_mode: referenceMode,
          detected_categories: detectedItems.map((item) => item.category),
          selected_item_categories: [],
          selected_item_zones: [],
          qc_failure_kind: 'group-mismatch-separate-references',
        }
        failGuidedFitting(buildFittingGroupMismatchMessage(fittingGroup), failureData, 'guided:compose-group-mismatch')
      }

      const selectedLook = selectFittingItemsForLook(wearableReferenceItems, 3)
      selectedItems = selectedLook.items
      selectedZones = selectedLook.selectedZones
      omittedItemCount = selectedLook.omittedCount
      fittingRoute = decideFittingRoute(selectedItems)
      if (selectedAccessoryAnalyses.length > 0) fittingStrategy = 'gemini_provador'
      const primaryItem = selectedItems[0]
      routedFittingCategory = primaryItem?.category
        ?? inferFittingCategoryWithHint(
          primaryItem?.profile ?? await classifyProduct(finalReferenceBuffers[0], apiKey),
          explicitCategoryHint,
        )
    }
  }

  if (referenceMode === 'single-look-photo' && selectedAccessoryAnalyses.length > 0 && singlePhotoOverlayOnlyCategories.length === 0) {
    singlePhotoOverlayOnlyCategories = collectOverlayOnlyAccessoryCategories(selectedAccessoryAnalyses)
  }
  if (referenceMode === 'single-look-photo' && ignoredPropTypes.length > 0 && singlePhotoIgnoredProps.length === 0) {
    singlePhotoIgnoredProps = ignoredPropTypes
  }

  const primaryItem = selectedItems[0]
  const provadorSelection = classifyProvadorSelection({
    selectedItems,
    selectedAccessoryDetailItems,
    referenceMode,
  })
  const blockingWearableItems = provadorSelection.blockingStructuralItems
  const remainingStructuralItems = provadorSelection.remainingStructuralItems
  const provadorOptionalOverlayItems = provadorSelection.optionalOverlayItems
  const provadorRelevantItems = dedupeProvadorItems([
    ...selectedItems,
    ...selectedAccessoryDetailItems,
  ])
  const provadorWearableItems = provadorRelevantItems.filter((item) => isWearableFittingCategory(item.category))
  const provadorAccessoryItems = provadorRelevantItems.filter((item) => isAccessoryCompatibleFittingCategory(item.category))
  const provadorReferenceCount = provadorRelevantItems.length
  const singlePhotoFullLookMandatory = (
    referenceMode === 'single-look-photo'
    && fittingGroup === 'wearables'
    && provadorReferenceCount > 1
  )
  fittingRoute = singlePhotoFullLookMandatory
    ? 'single-look-rebuild'
    : provadorReferenceCount > 1 ? 'provador-multi' : 'provador-single'
  if (fittingGroup === 'wearables') {
    fittingStrategy = 'gemini_provador'
  }
  const routedCategoryPreset = getFittingCategoryPreset(routedFittingCategory)
  const routedPoseInstruction = getFittingPoseInstruction(params.fitting_pose_preset)
  const routedEnergyInstruction = getFittingEnergyInstruction(params.fitting_energy_preset)
  const ratioInstruction = getComposeAspectRatioInstruction(params.aspect_ratio)
  const userIntent = normalizedPrompt.intent || 'No extra refinement. Keep the exact client item fully faithful, clearly visible, and naturally fitted on the model.'
  const portraitVertexImage = await normalizeImageForVertex(portraitBuf, 'png')
  const portraitGeminiImage = await normalizeImageForVertex(portraitBuf, 'jpeg')
  const editorialPropCandidates: string[] = []
  const editorialFinisherEligible = false
  const referenceMixMode = params.pricing_preflight?.referenceMixMode ?? getFittingReferenceMixMode({
    referenceMode,
    fittingGroup,
    requestedGroup: requestedFittingGroup,
    selectedAccessoryAnalysisCount: selectedAccessoryAnalyses.length,
  })
  const pricingTier = params.pricing_preflight?.pricingTier
    ?? getProvadorPricingTier({ fittingStrategy, editorialFinisherEligible, fittingRoute })
  const pricingStrategy = params.pricing_preflight?.pricingStrategy ?? 'fixed_tier_conservative'
  const engineTrace: Array<Record<string, unknown>> = []
  let vertexCallCount = 0
  let geminiImageAttemptCount = 0
  let editorialFinisherAttemptCount = 0
  const geminiModelsTried: string[] = []
  let fallbackBranchUsed = 'none'
  let preparedContinuationItems: SegmentedFittingItem[] = []
  let preparedContinuationReason = ''

  function trackVertexCall(stage: string, itemCount: number) {
    vertexCallCount += 1
    engineTrace.push({
      stage,
      engine: 'vertex',
      model: 'virtual-try-on-001',
      item_count: itemCount,
    })
  }

  function trackGeminiAttempt(stage: string, model: string) {
    geminiImageAttemptCount += 1
    geminiModelsTried.push(model)
    engineTrace.push({
      stage,
      engine: 'gemini',
      model,
    })
  }

  engineTrace.push({
    stage: 'routing',
    engine: 'router',
    reference_mode: referenceMode,
    reference_mix_mode: referenceMixMode,
    fitting_group: fittingGroup,
    fitting_group_request_mode: fittingGroupRequestMode,
    fitting_strategy: fittingStrategy,
    requested_group: requestedFittingGroup ?? 'auto',
  })

  const extraData: Record<string, unknown> = {
    provador_strategy_version: 'v3_gemini_unified',
    provador_mode: provadorSelection.mode,
    reference_item_count: provadorReferenceCount,
    dominant_category: provadorSelection.dominantCategory,
    blocking_item_count: provadorSelection.blockingItemCount,
    optional_overlay_categories: provadorSelection.accessoryCategories,
    auto_recovery_attempted: false,
    auto_recovery_succeeded: false,
    auto_split_confidence: provadorSelection.autoSplitConfidence,
    recovery_plan: provadorSelection.recoveryPlan,
    provador_engine: 'gemini_flux',
    fitting_group: fittingGroup,
    fitting_group_request_mode: fittingGroupRequestMode,
    fitting_strategy: fittingStrategy,
    fitting_reference_mode: referenceMode,
    fitting_reference_mode_internal: fittingReferenceModeInternal,
    fitting_reference_mix_mode: referenceMixMode,
    fitting_input_mode: referenceMode,
    fitting_route: fittingRoute,
    generation_budget_profile: singlePhotoFullLookMandatory ? 'bounded-full-look' : 'standard',
    segmented_items_count: detectedItems.length,
    omitted_item_count: omittedItemCount,
    detected_categories: detectedItems.map((item) => item.category),
    selected_item_categories: provadorRelevantItems.map((item) => item.category),
    selected_item_zones: selectedZones,
    structural_categories: provadorSelection.structuralCategories,
    blocking_structural_categories: blockingWearableItems.map((item) => item.category),
    remaining_structural_categories: remainingStructuralItems.map((item) => item.category),
    optional_overlay_item_categories: provadorOptionalOverlayItems.map((item) => item.category),
    full_look_mandatory: singlePhotoFullLookMandatory,
    required_full_look_categories: singlePhotoFullLookMandatory
      ? Array.from(new Set(provadorRelevantItems.map((item) => item.category)))
      : [],
    applied_categories: provadorRelevantItems.map((item) => item.category),
    applied_structural_categories: [],
    continuation_ready: false,
    stage_results: [],
    candidate_attempts: [],
    ignored_prop_types: ignoredPropTypes,
    auto_split_attempted: singlePhotoUsesSegmentedWearables,
    auto_split_selected_categories: singlePhotoUsesSegmentedWearables
      ? selectedItems.map((item) => item.category)
      : [],
    auto_split_reference_count: singlePhotoUsesSegmentedWearables ? selectedItems.length : 0,
    auto_split_failed_stage: 'none',
    primary_wearable_category: singlePhotoPrimaryWearableCategory ?? routedFittingCategory,
    stage1_engine: 'gemini:pending',
    stage2_engine: 'flux:standby',
    final_qc_status: 'pending',
    pricing_strategy: pricingStrategy,
    pricing_tier: pricingTier,
    estimated_provider_cost_usd: params.pricing_preflight?.estimatedProviderCostUsd ?? 0,
    estimated_cost_breakdown: params.pricing_preflight?.estimatedCostBreakdown ?? null,
    single_photo_primary_product_type: singlePhotoPrimaryProductType ?? params.pricing_preflight?.singlePhotoPrimaryProductType ?? '',
    single_photo_garment_priority_applied: singlePhotoGarmentPriorityApplied || Boolean(params.pricing_preflight?.singlePhotoGarmentPriorityApplied),
    single_photo_overlay_only_categories: singlePhotoOverlayOnlyCategories,
    single_photo_ignored_props: singlePhotoIgnoredProps,
    engine_trace: engineTrace,
    vertex_call_count: 0,
    vertex_product_count_requested: 0,
    vertex_product_count_sent: 0,
    vertex_prediction_count: 0,
    vertex_requested_product_count: 0,
    gemini_image_attempt_count: 0,
    gemini_models_tried: geminiModelsTried,
    editorial_finisher_attempt_count: 0,
    fallback_branch_used: fallbackBranchUsed,
    editorial_finisher_attempted: false,
    editorial_finisher_used: false,
    editorial_finisher_model: 'none',
    editorial_finisher_skip_reason: 'none',
    editorial_prop_candidates: editorialPropCandidates,
    editorial_props_applied: [],
    editorial_qc_status: editorialFinisherEligible ? 'pending' : 'not_attempted',
    accessory_overlay_skipped_reason: 'none',
    vertex_single_photo_fallback_attempted: false,
    vertex_single_photo_fallback_used: false,
    vertex_single_photo_fallback_trigger: 'none',
    vertex_validation_target: referenceMode === 'single-look-photo'
      ? (singlePhotoUsesSegmentedWearables ? 'auto-split-sequential' : 'vertex-single-photo-direct')
      : 'separate-references-batch-first',
    model_chain_tried: [],
  }
  if (referenceMode === 'single-look-photo') {
    extraData.single_photo_primary_wearable_category = singlePhotoPrimaryWearableCategory
    extraData.single_photo_group_decision_source = singlePhotoGroupDecisionSource
  }
  if (selectedAccessoryAnalyses.length > 0) {
    extraData.accessory_reference_mode = referenceMode
    extraData.accessory_reference_kind = selectedAccessoryAnalyses.length === 1
      ? selectedAccessoryAnalyses[0].referenceKind
      : 'multi-reference'
    extraData.accessory_detected_count = selectedAccessoryDetailItems.length
    extraData.accessory_detected_types = collectAccessoryTypes(selectedAccessoryAnalyses)
    extraData.accessory_detected_zones = collectAccessoryZones(selectedAccessoryAnalyses)
    extraData.accessory_set_count = selectedAccessoryAnalyses.filter((analysis) => analysis.referenceKind === 'accessory-set').length
    extraData.accessory_total_count = sumReportedAccessoryCount(selectedAccessoryAnalyses)
  }
  if (referenceMode === 'single-look-photo' && fittingGroup === 'wearables') {
    if (singlePhotoUsesSegmentedWearables) {
      extraData.reference_padding_mode = 'segmented-items'
      extraData.single_photo_segmented_item_count = selectedItems.filter((item) => isWearableFittingCategory(item.category)).length
      extraData.fitting_rescue_policy = 'segmented-single-photo-sequential'
      extraData.fitting_rescue_engine = 'vertex:virtual-try-on-001'
      extraData.fitting_rescue_trigger = 'segmented-single-look-detected'
    } else {
      extraData.reference_padding_mode = singlePhotoPaddingMode ?? 'standard'
      extraData.fitting_rescue_policy = 'disabled-for-vertex-validation'
      extraData.fitting_rescue_engine = 'disabled'
      extraData.fitting_rescue_trigger = 'vertex-only-cycle'
    }
  }
  if (singlePhotoFullLookMandatory) {
    extraData.fitting_generation_strategy = 'bounded-full-look'
    extraData.vertex_execution_path = 'disabled_for_single-look-rebuild'
  }

  function finalizeProvadorAudit() {
    const estimatedCostBreakdown = buildEstimatedProviderCostBreakdown({
      vertexCallCount,
      geminiModelsTried,
    })
    extraData.vertex_call_count = vertexCallCount
    extraData.gemini_image_attempt_count = geminiImageAttemptCount
    extraData.gemini_models_tried = Array.from(new Set(geminiModelsTried))
    extraData.editorial_finisher_attempt_count = editorialFinisherAttemptCount
    extraData.fallback_branch_used = fallbackBranchUsed
    extraData.estimated_cost_breakdown = estimatedCostBreakdown
    extraData.estimated_provider_cost_usd = estimatedCostBreakdown.total_usd
  }

  function failGuidedFittingWithAudit(params: {
    message: string
    refundReason: string
    failureKind?: string
    retryReason?: string
    criticalCategory?: string
    autoSplitFailedStage?: string
    extra?: Record<string, unknown>
  }): never {
    if (params.failureKind) extraData.qc_failure_kind = params.failureKind
    if (params.retryReason) extraData.retry_reason = params.retryReason
    if (params.criticalCategory) extraData.qc_failure_category = params.criticalCategory
    if (params.autoSplitFailedStage) extraData.auto_split_failed_stage = params.autoSplitFailedStage
    finalizeProvadorAudit()
    failGuidedFitting(
      params.message,
      { ...extraData, ...(params.extra ?? {}) },
      params.refundReason,
    )
  }

  async function createGuidedOuterwearSplitFailover(): Promise<never> {
    const structuralCategoriesDetected = Array.from(new Set(
      detectedItems
        .map((item) => item.category)
        .filter((category) => isOuterwearSplitStructuralCategory(category)),
    ))
    const accessoryCategoriesDetected = Array.from(new Set(
      detectedItems
        .map((item) => item.category)
        .filter((category) => isOuterwearSplitAccessoryCategory(category)),
    ))
    const rankedCoreItems = selectedItems
      .filter((item) => isOuterwearSplitStructuralCategory(item.category))
      .sort((a, b) => {
        const rankDelta = rankGuidedSplitCoreCategory(a.category) - rankGuidedSplitCoreCategory(b.category)
        if (rankDelta !== 0) return rankDelta
        if (b.priority !== a.priority) return b.priority - a.priority
        return b.bbox.area - a.bbox.area
      })
    const coreItems = rankedCoreItems.slice(0, 3)
    const overlayItems = detectedItems
      .filter((item) => isOuterwearSplitAccessoryCategory(item.category))
      .reduce<SegmentedFittingItem[]>((acc, item) => {
        if (acc.some((existing) => existing.category === item.category)) return acc
        acc.push(item)
        return acc
      }, [])
      .slice(0, 6)
    const guidedCoreCategories = Array.from(new Set(coreItems.map((item) => item.category)))
    const escalationReason = 'single-look-photo com outerwear dominante e multiplas pecas estruturais'

    extraData.fitting_generation_strategy = 'guided-fail-before-generation'
    extraData.vertex_execution_path = 'outerwear-guided-split-required'
    extraData.vertex_validation_target = 'outerwear-guided-split-required'
    extraData.stage1_engine = 'blocked:outerwear-guided-split'
    extraData.stage2_engine = 'pending'
    extraData.outerwear_failure_policy = 'require-split'
    extraData.accessory_core_policy = 'overlay-only'
    extraData.outerwear_policy = 'required_split'
    extraData.accessories_overlay_only = true
    extraData.structural_categories_detected = structuralCategoriesDetected
    extraData.accessory_categories_detected = accessoryCategoriesDetected
    extraData.escalation_reason = escalationReason
    extraData.guided_split_generated = false
    extraData.guided_split_reference_count = 0
    extraData.guided_split_categories = []
    extraData.guided_split_status = 'failed'
    extraData.failure_state = 'manual_split_required'
    extraData.credit_protected = true
    extraData.duplicate_charge_blocked = true
    extraData.billing_reason = 'QC rejected or guided split required before deliverable output'

    const candidateAttempts = extraData.candidate_attempts as string[]
    candidateAttempts.length = 0
    candidateAttempts.push('outerwear-split-required:detected')

    try {
      const guidedReferences = await uploadGuidedSplitReferences({
        sourceBuffer: finalReferenceBuffers[0],
        items: [...coreItems, ...overlayItems],
        assetId: params.assetId,
        userId: params.userId,
      })
      const coreReferences = guidedReferences.filter((reference) => reference.role === 'vertex-core')
      const overlayReferences = guidedReferences.filter((reference) => reference.role === 'overlay-only')

      extraData.guided_split_generated = guidedReferences.length > 0
      extraData.guided_split_reference_count = guidedReferences.length
      extraData.guided_split_categories = guidedReferences.map((reference) => reference.category)
      extraData.guided_split_references = guidedReferences
      extraData.guided_overlay_references = overlayReferences

      const hasRequiredCoreCoverage = guidedCoreCategories.every((category) => (
        coreReferences.some((reference) => reference.category === category)
      ))

      if (!hasRequiredCoreCoverage || coreReferences.length === 0) {
        candidateAttempts.push('outerwear-guided-split:failed')
        failGuidedFittingWithAudit({
          message: 'Nao conseguimos isolar as pecas principais com seguranca. Envie imagens separadas do casaco, blusa e calca para garantir fidelidade.',
          refundReason: 'guided:compose-outerwear-split-manual',
          failureKind: 'guided-fail-before-generation',
          extra: {
            failure_state: 'manual_split_required',
            guided_split_status: 'failed',
            next_action: null,
          },
        })
      }

      const nextAction = {
        type: 'regenerate_with_guided_split',
        label: 'Regenerar com look separado',
        asset_id: params.assetId,
        references: guidedReferences,
        regenerate_params: {
          compose_variant: 'fitting',
          compose_mode: 'gemini',
          fitting_group: 'wearables',
          product_url: coreReferences[0]?.image_url ?? '',
          product_urls: coreReferences.map((reference) => reference.image_url),
          fitting_category: coreReferences[0]?.category ?? routedFittingCategory,
          vton_category: coreReferences[0]?.category ?? routedFittingCategory,
          guided_overlay_references: overlayReferences,
        },
      }

      candidateAttempts.push('outerwear-guided-split:prepared')
      failGuidedFittingWithAudit({
        message: 'Detectamos um look completo com casaco/outerwear dominante. Para preservar o casaco com fidelidade, o sistema separou automaticamente as pecas principais e deixou a regeneracao pronta.',
        refundReason: 'guided:compose-outerwear-split-required',
        failureKind: 'guided-fail-before-generation',
        extra: {
          failure_state: 'split_required_after_outerwear_failure',
          guided_split_status: 'ready',
          next_action: nextAction,
        },
      })
    } catch (error) {
      if (error instanceof Error && 'studioFailureData' in error) {
        throw error
      }

      candidateAttempts.push('outerwear-guided-split:error')
      failGuidedFittingWithAudit({
        message: 'Nao conseguimos isolar as pecas principais com seguranca. Envie imagens separadas do casaco, blusa e calca para garantir fidelidade.',
        refundReason: 'guided:compose-outerwear-split-error',
        failureKind: 'guided-fail-before-generation',
        extra: {
          failure_state: 'manual_split_required',
          guided_split_status: 'failed',
          next_action: null,
        },
      })
    }
  }

  async function createGuidedGarmentSplitFailover(): Promise<never> {
    const structuralCategoriesDetected = collectSingleLookStructuralCategories({
      detectedItems,
      wholeImageCategory: singlePhotoPrimaryWearableCategory,
      wearableAnalysis: null,
    })
    const overlayAccessoryCategories = collectOverlayOnlyAccessoryCategories(selectedAccessoryAnalyses)
    const rankedCoreItems = selectedItems
      .filter((item) => isStructuralBodyCategory(item.category))
      .sort((a, b) => {
        const rankDelta = rankGuidedSplitCoreCategory(a.category) - rankGuidedSplitCoreCategory(b.category)
        if (rankDelta !== 0) return rankDelta
        if (b.priority !== a.priority) return b.priority - a.priority
        return b.bbox.area - a.bbox.area
      })
    const coreItems = rankedCoreItems.slice(0, 3)
    const guidedCoreCategories = Array.from(new Set(coreItems.map((item) => item.category)))
    const escalationReason = 'single-look-photo com roupa principal e acessorios misturados; roupa priorizada sobre acessorios'

    extraData.fitting_generation_strategy = 'guided-fail-before-generation'
    extraData.vertex_execution_path = 'garment-look-split-required'
    extraData.vertex_validation_target = 'garment-look-split-required'
    extraData.stage1_engine = 'blocked:garment-look-split'
    extraData.stage2_engine = 'pending'
    extraData.accessory_core_policy = 'overlay-only'
    extraData.accessories_overlay_only = true
    extraData.structural_categories_detected = structuralCategoriesDetected
    extraData.accessory_categories_detected = overlayAccessoryCategories
    extraData.escalation_reason = escalationReason
    extraData.guided_split_generated = false
    extraData.guided_split_reference_count = 0
    extraData.guided_split_categories = []
    extraData.guided_split_status = 'failed'
    extraData.failure_state = 'manual_split_required'
    extraData.credit_protected = true
    extraData.duplicate_charge_blocked = true
    extraData.billing_reason = 'QC rejected or guided split required before deliverable output'
    extraData.single_photo_garment_priority_applied = true

    const candidateAttempts = extraData.candidate_attempts as string[]
    candidateAttempts.length = 0
    candidateAttempts.push('garment-look-split:detected')

    try {
      const garmentReferences = await uploadGuidedSplitReferences({
        sourceBuffer: finalReferenceBuffers[0],
        items: coreItems,
        assetId: params.assetId,
        userId: params.userId,
      })
      const overlayReferences = selectedAccessoryAnalyses.length > 0
        ? await uploadGuidedAccessoryReferencesFromAnalyses({
            analyses: selectedAccessoryAnalyses,
            assetId: params.assetId,
            userId: params.userId,
          })
        : []
      const guidedReferences = [...garmentReferences, ...overlayReferences]
      const coreReferences = guidedReferences.filter((reference) => reference.role === 'vertex-core')

      extraData.guided_split_generated = guidedReferences.length > 0
      extraData.guided_split_reference_count = guidedReferences.length
      extraData.guided_split_categories = guidedReferences.map((reference) => reference.category)
      extraData.guided_split_references = guidedReferences
      extraData.guided_overlay_references = overlayReferences

      const requiresMatchingSetCoverage = singlePhotoPrimaryProductType === 'matching_set'
      const hasRequiredCoreCoverage = guidedCoreCategories.every((category) => (
        coreReferences.some((reference) => reference.category === category)
      )) && (!requiresMatchingSetCoverage || coreReferences.length >= 2)

      if (!hasRequiredCoreCoverage || coreReferences.length === 0) {
        candidateAttempts.push('garment-look-split:failed')
        failGuidedFittingWithAudit({
          message: 'Nao conseguimos isolar as pecas principais com seguranca. Envie imagens separadas da blusa e da parte de baixo para garantir fidelidade.',
          refundReason: 'guided:compose-garment-split-manual',
          failureKind: 'guided-fail-before-generation',
          extra: {
            failure_state: 'manual_split_required',
            guided_split_status: 'failed',
            next_action: null,
          },
        })
      }

      const nextAction = {
        type: 'regenerate_with_guided_split',
        label: 'Regenerar com look separado',
        asset_id: params.assetId,
        references: guidedReferences,
        regenerate_params: {
          compose_variant: 'fitting',
          compose_mode: 'gemini',
          fitting_group: 'wearables',
          product_url: coreReferences[0]?.image_url ?? '',
          product_urls: coreReferences.map((reference) => reference.image_url),
          fitting_category: coreReferences[0]?.category ?? routedFittingCategory,
          vton_category: coreReferences[0]?.category ?? routedFittingCategory,
          guided_overlay_references: overlayReferences,
        },
      }

      candidateAttempts.push('garment-look-split:prepared')
      failGuidedFittingWithAudit({
        message: 'Detectamos um look de roupa com acessorios misturados. Para preservar o conjunto principal com fidelidade, o sistema separou automaticamente as pecas principais e deixou a regeneracao pronta.',
        refundReason: 'guided:compose-garment-split-required',
        failureKind: 'guided-fail-before-generation',
        extra: {
          failure_state: 'split_required_after_garment_priority',
          guided_split_status: 'ready',
          next_action: nextAction,
        },
      })
    } catch (error) {
      if (error instanceof Error && 'studioFailureData' in error) {
        throw error
      }

      candidateAttempts.push('garment-look-split:error')
      failGuidedFittingWithAudit({
        message: 'Nao conseguimos isolar as pecas principais com seguranca. Envie imagens separadas da blusa e da parte de baixo para garantir fidelidade.',
        refundReason: 'guided:compose-garment-split-error',
        failureKind: 'guided-fail-before-generation',
        extra: {
          failure_state: 'manual_split_required',
          guided_split_status: 'failed',
          next_action: null,
        },
      })
    }
  }

  console.log(
    `[studio] fitting selection | mode=${referenceMode} group=${fittingGroup} route=${fittingRoute} selected_count=${selectedItems.length} selected_categories=${selectedItems.map((item) => item.category).join(',') || 'none'} omitted_count=${omittedItemCount} primary_wearable_category=${singlePhotoPrimaryWearableCategory ?? 'none'} decision_source=${singlePhotoGroupDecisionSource ?? 'n/a'}`,
  )

  if (!primaryItem) throw new Error('Nenhum item valido encontrado para o Provador.')

  const wearableQcItems = blockingWearableItems.length > 0
    ? blockingWearableItems
    : selectedItems.filter((item) => isWearableFittingCategory(item.category))
  async function runWearableQualityCheckForItems(candidateBase64: string, qcRoute: FittingRoute, itemsForQc: SegmentedFittingItem[]) {
    if (itemsForQc.length > 1) {
      return assessWearableBatchQuality({
        items: itemsForQc,
        referenceUrls,
        generatedBase64: candidateBase64,
        fittingRoute: qcRoute,
      })
    }

    const qcPrimaryItem = itemsForQc[0] ?? primaryItem
    const primaryReferenceUrl = typeof qcPrimaryItem.sourceIndex === 'number'
      ? (referenceUrls[qcPrimaryItem.sourceIndex] ?? '')
      : (referenceUrls[0] ?? '')

    return assessCompositionQuality(primaryReferenceUrl || 'inline-reference:primary', candidateBase64, qcPrimaryItem.profile, {
      variant: 'fitting',
      fittingCategory: qcPrimaryItem.category,
      fittingRoute: qcRoute,
      referenceImage: !primaryReferenceUrl
        ? {
          mimeType: qcPrimaryItem.mimeType,
          dataBase64: qcPrimaryItem.imageBuffer.toString('base64'),
        }
        : undefined,
    })
  }
  async function runWearableQualityCheck(candidateBase64: string, qcRoute: FittingRoute) {
    return runWearableQualityCheckForItems(candidateBase64, qcRoute, wearableQcItems)
  }
  async function runMandatoryFullLookQualityCheck(candidateBase64: string, qcRoute: FittingRoute) {
    const garmentQc = await runWearableQualityCheck(candidateBase64, qcRoute)
    const accessoryQc = selectedAccessoryAnalyses.length > 0
      ? await assessAccessoryBatchQuality({
        analyses: selectedAccessoryAnalyses,
        generatedBase64: candidateBase64,
        fittingRoute: qcRoute,
      })
      : null

    if (accessoryQc) {
      extraData.accessory_qc_results = accessoryQc.results
    }

    return {
      approved: garmentQc.approved && (accessoryQc ? accessoryQc.approved : true),
      weakestDimension: getQcWeakestDimension(garmentQc) ?? accessoryQc?.weakestDimension,
      issues: Array.from(new Set([
        ...garmentQc.issues,
        ...(accessoryQc?.issues ?? []),
      ])).slice(0, 12),
      garmentQc,
      accessoryQc,
    }
  }

  let resultBuffer: Buffer
  function buildSinglePhotoFailureMessage(criticalCategory?: string): string {
    if (singlePhotoUsesSegmentedWearables) {
      const criticalPieceSuffix = criticalCategory ? ` A peca critica foi ${criticalCategory}.` : ''
      return `Nao conseguimos preservar o look completo com fidelidade mesmo apos separar automaticamente as pecas principais desta foto.${criticalPieceSuffix} Se precisar, use Separar Look como ultimo recurso e envie referencias manuais.`
    }

    return 'Nao conseguimos preservar o look completo com fidelidade a partir de uma unica foto no Vertex. Envie 2-3 referencias separadas da roupa, calcado e acessorios ou ajuste a foto de origem.'
  }

  const requiresOuterwearGuidedSplit = false && (
    referenceMode === 'single-look-photo'
    && fittingGroup === 'wearables'
    && shouldRequireOuterwearSplit({
      fittingInputMode: referenceMode,
      detectedCategories: detectedItems.map((item) => item.category),
      primaryWearableCategory: singlePhotoPrimaryWearableCategory ?? routedFittingCategory,
    })
  )

  if (requiresOuterwearGuidedSplit) {
    await createGuidedOuterwearSplitFailover()
  }

  const requiresGarmentGuidedSplit = false && (
    referenceMode === 'single-look-photo'
    && fittingGroup === 'wearables'
    && singlePhotoGarmentPriorityApplied
    && !requiresOuterwearGuidedSplit
    && (
      singlePhotoPrimaryProductType === 'matching_set'
      || selectedAccessoryAnalyses.length > 0
    )
  )

  if (requiresGarmentGuidedSplit) {
    await createGuidedGarmentSplitFailover()
  }

  async function callGeminiWearableCompose(params: {
    promptText: string
    basePhoto: NormalizedImageAsset
    referenceItem: SegmentedFittingItem
    stageLabel: string
    includePortraitReference?: boolean
  }): Promise<GeminiImageCallResult> {
    const holdModels = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview']
    const parts: Array<Record<string, unknown>> = [
      { text: '[CURRENT APPROVED LOOK] - preserve this base image exactly:' },
      { inlineData: { mimeType: params.basePhoto.mimeType, data: params.basePhoto.buffer.toString('base64') } },
    ]

    if (params.includePortraitReference) {
      parts.push(
        { text: '[ORIGINAL PORTRAIT] - preserve this exact person identity:' },
        { inlineData: { mimeType: portraitGeminiImage.mimeType, data: portraitGeminiImage.buffer.toString('base64') } },
      )
    }

    parts.push(
      { text: '[CURRENT CLIENT GARMENT] - apply this garment with literal fidelity:' },
      { inlineData: { mimeType: params.referenceItem.mimeType, data: params.referenceItem.imageBuffer.toString('base64') } },
      { text: params.promptText },
    )

    const requestBody = {
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }

    for (const model of holdModels) {
      trackGeminiAttempt(params.stageLabel, model)
      try {
        const res = await fetchGoogleGenerateContent({
          model,
          feature: 'compose_hold_item',
          body: requestBody,
        })
        if (!res.ok) continue
        const json = await res.json()
        const responseParts = json.candidates?.[0]?.content?.parts ?? []
        const imgPart = responseParts.find((part: any) => part.inlineData?.mimeType?.startsWith('image/'))
        if (imgPart?.inlineData?.data) return { imageBase64: imgPart.inlineData.data as string, modelUsed: model }
      } catch { /* continue */ }
    }

    return { imageBase64: null }
  }

  async function callGeminiProvadorImage(params: {
    promptText: string
    parts: Array<Record<string, unknown>>
    stageLabel: string
  }): Promise<GeminiImageCallResult> {
    const provadorModels = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview']
    const requestBody = {
      contents: [{ role: 'user', parts: params.parts }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }

    for (const model of provadorModels) {
      trackGeminiAttempt(params.stageLabel, model)
      try {
        const res = await fetchGoogleGenerateContent({
          model,
          feature: 'compose_provador',
          body: requestBody,
        })
        if (!res.ok) continue
        const json = await res.json()
        const responseParts = json.candidates?.[0]?.content?.parts ?? []
        const imgPart = responseParts.find((part: any) => part.inlineData?.mimeType?.startsWith('image/'))
        if (imgPart?.inlineData?.data) return { imageBase64: imgPart.inlineData.data as string, modelUsed: model }
      } catch { /* continue */ }
    }

    return { imageBase64: null }
  }

  async function callFluxProvadorImage(promptText: string, stageLabel: string): Promise<string | null> {
    fallbackBranchUsed = 'flux-dev-image-to-image'
    engineTrace.push({
      stage: stageLabel,
      engine: 'flux',
      model: 'fal-ai/flux/dev/image-to-image',
    })

    const imageSize = params.aspect_ratio === '1:1'
      ? 'square_hd'
      : params.aspect_ratio === '16:9'
        ? 'landscape_16_9'
        : 'portrait_16_9'

    const res = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: params.portrait_url,
        prompt: promptText,
        strength: 0.48,
        num_inference_steps: 38,
        guidance_scale: 3.5,
        image_size: imageSize,
        output_format: 'jpeg',
      }),
    })
    if (!res.ok) return null

    const fluxData = await res.json()
    const fluxUrl = fluxData.images?.[0]?.url
    if (!fluxUrl) return null

    const imageRes = await fetch(fluxUrl)
    if (!imageRes.ok) return null

    return Buffer.from(await imageRes.arrayBuffer()).toString('base64')
  }

  if (fittingRoute === 'provador-single' || fittingRoute === 'provador-multi' || fittingRoute === 'single-look-rebuild') {
    const candidateAttempts = extraData.candidate_attempts as string[]
    candidateAttempts.length = 0
    const boundedFullLookMode = fittingRoute === 'single-look-rebuild'
    const rebuildDetailItems = boundedFullLookMode
      ? selectSingleLookRebuildDetailItems(provadorRelevantItems)
      : provadorRelevantItems.slice(0, 4)
    let masterLookReference: NormalizedImageAsset | null = null

    const promptText = buildFittingPrompt({
      category: isFullLookRoute(fittingRoute) ? 'full-look' : primaryItem.category,
      categoryPreset: isFullLookRoute(fittingRoute)
        ? 'Rebuild the complete submitted look in one single white-background studio frame using all submitted references as literal truth.'
        : getFittingCategoryPreset(primaryItem.category).instruction,
      ratioInstruction,
      poseInstruction: routedPoseInstruction,
      energyInstruction: routedEnergyInstruction,
      userIntent,
      route: fittingRoute,
      itemDescriptions: provadorRelevantItems.map((item) => item.description),
    })

    const referenceParts: Array<Record<string, unknown>> = [
      { text: '[BASE PHOTO] - preserve this exact model identity:' },
      { inlineData: { mimeType: portraitGeminiImage.mimeType, data: portraitGeminiImage.buffer.toString('base64') } },
    ]

    if (fittingRoute === 'provador-single') {
      const singleReference = provadorRelevantItems[0] ?? primaryItem
      referenceParts.push(
        { text: '[CLIENT ITEM REFERENCE] - preserve this item literally:' },
        { inlineData: { mimeType: singleReference.mimeType, data: singleReference.imageBuffer.toString('base64') } },
      )
    } else if (referenceMode === 'single-look-photo') {
      masterLookReference = await normalizeImageForVertex(finalReferenceBuffers[0], 'jpeg')
      referenceParts.push(
        { text: '[CLIENT LOOK MASTER REFERENCE] - this reference defines the submitted look:' },
        { inlineData: { mimeType: masterLookReference.mimeType, data: masterLookReference.buffer.toString('base64') } },
      )
      for (const [index, item] of rebuildDetailItems.entries()) {
        referenceParts.push(
          { text: `[CLIENT LOOK DETAIL ${index + 1}] - preserve this item literally:` },
          { inlineData: { mimeType: item.mimeType, data: item.imageBuffer.toString('base64') } },
        )
      }
    } else {
      const usedSourceIndexes = Array.from(new Set(
        provadorRelevantItems
          .map((item) => item.sourceIndex)
          .filter((value): value is number => typeof value === 'number' && value >= 0),
      )).slice(0, 5)

      for (const [index, sourceIndex] of usedSourceIndexes.entries()) {
        const normalizedReference = await normalizeImageForVertex(finalReferenceBuffers[sourceIndex], 'jpeg')
        referenceParts.push(
          { text: `[CLIENT LOOK REFERENCE ${index + 1}] - preserve this submitted fashion reference literally:` },
          { inlineData: { mimeType: normalizedReference.mimeType, data: normalizedReference.buffer.toString('base64') } },
        )
      }
    }

    referenceParts.push({ text: promptText })

    async function callSingleLookAccessoryRepair(
      prompt: string,
      basePhoto: NormalizedImageAsset,
    ): Promise<GeminiImageCallResult> {
      const referencePromptParts: Array<Record<string, unknown>> = [
        { text: '[APPROVED LOOK REBUILD BASE] - preserve the current rebuilt outfit, model identity, silhouette, and garment structure exactly:' },
        { inlineData: { mimeType: basePhoto.mimeType, data: basePhoto.buffer.toString('base64') } },
      ]

      if (masterLookReference) {
        referencePromptParts.push(
          { text: '[CLIENT LOOK MASTER REFERENCE] - all mandatory fashion items from this look must remain present and literal:' },
          { inlineData: { mimeType: masterLookReference.mimeType, data: masterLookReference.buffer.toString('base64') } },
        )
      }

      for (const [index, analysis] of selectedAccessoryAnalyses.entries()) {
        referencePromptParts.push(
          { text: `[CLIENT ACCESSORY REFERENCE ${index + 1}] - restore this submitted accessory or coordinated accessory set literally:` },
          { inlineData: { mimeType: analysis.normalizedImage.mimeType, data: analysis.normalizedImage.buffer.toString('base64') } },
        )
      }

      for (const [index, item] of selectedAccessoryDetailItems.entries()) {
        referencePromptParts.push(
          { text: `[CLIENT ACCESSORY DETAIL ${index + 1}] - preserve these exact accessory details, color, hardware, edges, and silhouette:` },
          { inlineData: { mimeType: item.mimeType, data: item.imageBuffer.toString('base64') } },
        )
      }

      const requestBody = {
        contents: [{
          role: 'user',
          parts: [
            ...referencePromptParts,
            { text: prompt },
          ],
        }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }

      for (const model of ACCESSORY_GEMINI_MODEL_CHAIN) {
        trackGeminiAttempt('single-look-rebuild-accessory-repair', model)
        try {
          const res = await fetchGoogleGenerateContent({
            model,
            feature: 'compose_accessory_repair',
            body: requestBody,
          })
          if (!res.ok) continue
          const json = await res.json()
          const parts = json.candidates?.[0]?.content?.parts ?? []
          const imgPart = parts.find((part: any) => part.inlineData?.mimeType?.startsWith('image/'))
          if (imgPart?.inlineData?.data) {
            return { imageBase64: imgPart.inlineData.data as string, modelUsed: model }
          }
        } catch { /* continue */ }
      }

      return { imageBase64: null }
    }

    const runFinalQc = async (candidateBase64: string) => {
      if (provadorWearableItems.length > 0 && selectedAccessoryAnalyses.length > 0) {
        const garmentQc = await runWearableQualityCheckForItems(candidateBase64, fittingRoute, provadorWearableItems)
        const accessoryQc = await assessAccessoryBatchQuality({
          analyses: selectedAccessoryAnalyses,
          generatedBase64: candidateBase64,
          fittingRoute,
        })
        extraData.accessory_qc_results = accessoryQc.results
        return {
          approved: garmentQc.approved && accessoryQc.approved,
          weakestDimension: getQcWeakestDimension(garmentQc) ?? accessoryQc.weakestDimension,
          issues: Array.from(new Set([
            ...garmentQc.issues,
            ...accessoryQc.issues,
          ])).slice(0, 12),
          garmentQc,
          accessoryQc,
        }
      }
      if (provadorWearableItems.length > 0) {
        return runWearableQualityCheckForItems(candidateBase64, fittingRoute, provadorWearableItems)
      }
      if (selectedAccessoryAnalyses.length > 0) {
        return assessAccessoryBatchQuality({
          analyses: selectedAccessoryAnalyses,
          generatedBase64: candidateBase64,
          fittingRoute,
        })
      }
      return runWearableQualityCheckForItems(candidateBase64, fittingRoute, [primaryItem])
    }

    let approvedBase64: string | null = null
    let engineUsed = ''
    let fallbackUsed = false

    const initialResult = await callGeminiProvadorImage({
      promptText,
      parts: referenceParts,
      stageLabel: `${fittingRoute}:attempt-1`,
    })
    approvedBase64 = initialResult.imageBase64
    engineUsed = initialResult.modelUsed ? `gemini:${initialResult.modelUsed}` : ''

    if (!approvedBase64 && !boundedFullLookMode) {
      approvedBase64 = await callFluxProvadorImage(promptText, `${fittingRoute}:flux-fallback`)
      if (approvedBase64) {
        engineUsed = 'flux:fal-ai/flux/dev/image-to-image'
        fallbackUsed = true
      }
    }

    if (!approvedBase64) {
      throw new Error(
        boundedFullLookMode
          ? 'Os modelos Gemini nao conseguiram reconstruir o look completo em foto unica.'
          : 'Todos os modelos Gemini e o fallback Flux falharam no Provador',
      )
    }

    let qc = await runFinalQc(approvedBase64)
    extraData.stage1_engine = engineUsed || 'gemini:unknown'
    extraData.fallback_used = fallbackUsed
    extraData.model_chain_tried = Array.from(new Set([
      ...geminiModelsTried,
      ...(fallbackUsed ? ['fal-ai/flux/dev/image-to-image'] : []),
    ]))

    logFittingQc({
      mode: referenceMode,
      route: fittingRoute,
      stage: `${fittingRoute}:attempt-1`,
      categories: provadorRelevantItems.map((item) => item.category),
      approved: qc.approved,
      weakestDimension: getQcWeakestDimension(qc),
      issues: qc.issues,
    })

    if (!qc.approved && !fallbackUsed) {
      candidateAttempts.push(`${fittingRoute}:attempt-1-rejected`)
      const retryPrompt = buildRetryPrompt(
        promptText,
        qc.issues,
        getQcWeakestDimension(qc),
        'fitting',
        fittingRoute,
      )
      const retryResult = await callGeminiProvadorImage({
        promptText: retryPrompt,
        parts: [...referenceParts.slice(0, -1), { text: retryPrompt }],
        stageLabel: `${fittingRoute}:attempt-2`,
      })

      if (retryResult.imageBase64) {
        approvedBase64 = retryResult.imageBase64
        engineUsed = retryResult.modelUsed ? `gemini:${retryResult.modelUsed}` : engineUsed
        qc = await runFinalQc(approvedBase64)
        extraData.stage1_engine = engineUsed || extraData.stage1_engine
        extraData.model_chain_tried = Array.from(new Set([...geminiModelsTried]))
        logFittingQc({
          mode: referenceMode,
          route: fittingRoute,
          stage: `${fittingRoute}:attempt-2`,
          categories: provadorRelevantItems.map((item) => item.category),
          approved: qc.approved,
          weakestDimension: getQcWeakestDimension(qc),
          issues: qc.issues,
        })
      }
    }

    if (!qc.approved && !fallbackUsed && !boundedFullLookMode) {
      const fluxRetryPrompt = buildRetryPrompt(
        promptText,
        qc.issues,
        getQcWeakestDimension(qc),
        'fitting',
        fittingRoute,
      )
      const fluxRetryBase64 = await callFluxProvadorImage(fluxRetryPrompt, `${fittingRoute}:flux-retry`)
      if (fluxRetryBase64) {
        approvedBase64 = fluxRetryBase64
        engineUsed = 'flux:fal-ai/flux/dev/image-to-image'
        fallbackUsed = true
        qc = await runFinalQc(approvedBase64)
        extraData.stage1_engine = engineUsed
        extraData.fallback_used = true
        extraData.model_chain_tried = Array.from(new Set([
          ...geminiModelsTried,
          'fal-ai/flux/dev/image-to-image',
        ]))
        logFittingQc({
          mode: referenceMode,
          route: fittingRoute,
          stage: `${fittingRoute}:flux-retry`,
          categories: provadorRelevantItems.map((item) => item.category),
          approved: qc.approved,
          weakestDimension: getQcWeakestDimension(qc),
          issues: qc.issues,
        })
      }
    }

    if (!qc.approved && boundedFullLookMode && selectedAccessoryAnalyses.length > 0 && approvedBase64) {
      const accessoryRepairBase = await normalizeImageForVertex(Buffer.from(approvedBase64, 'base64'), 'jpeg')
      const accessoryRepairPrompt = `${buildHybridAccessoryOverlayPrompt({
        ratioInstruction,
        poseInstruction: routedPoseInstruction,
        energyInstruction: routedEnergyInstruction,
        userIntent,
        analyses: selectedAccessoryAnalyses,
        primaryWearableCategory: routedFittingCategory,
        ignoredPropTypes,
      })}

FULL LOOK REBUILD RESCUE:
- This is a mandatory full-look rebuild. Every submitted fashion item must be present together in the same final frame.
- Preserve the current rebuilt garments exactly when they are already correct.
- Repair only the missing or distorted submitted accessories, trims, eyewear, headwear, jewelry, and bag details without recoloring the look.
- White items must stay truly white, never cream, beige, or off-white unless the reference clearly shows that tone.
- Fix these detected issues from the previous attempt: ${qc.issues.join('; ') || getQcWeakestDimension(qc) || 'restore all missing or distorted accessories'}`

      const repairAttempt = await callSingleLookAccessoryRepair(accessoryRepairPrompt, accessoryRepairBase)
      if (repairAttempt.imageBase64) {
        approvedBase64 = repairAttempt.imageBase64
        engineUsed = repairAttempt.modelUsed ? `gemini:${repairAttempt.modelUsed}` : engineUsed
        qc = await runFinalQc(approvedBase64)
        extraData.stage2_engine = repairAttempt.modelUsed ? `gemini:${repairAttempt.modelUsed}` : extraData.stage2_engine
        extraData.model_chain_tried = Array.from(new Set([
          ...geminiModelsTried,
          ...(repairAttempt.modelUsed ? [repairAttempt.modelUsed] : []),
        ]))
        logFittingQc({
          mode: referenceMode,
          route: fittingRoute,
          stage: `${fittingRoute}:accessory-repair`,
          categories: provadorRelevantItems.map((item) => item.category),
          approved: qc.approved,
          weakestDimension: getQcWeakestDimension(qc),
          issues: qc.issues,
        })
      }
    }

    if (!qc.approved) {
      if (boundedFullLookMode) {
        failGuidedFittingWithAudit({
          message: 'Nao conseguimos reconstruir o look completo com fidelidade suficiente. Como todos os itens enviados sao obrigatorios, esta tentativa foi bloqueada para evitar resultado parcial.',
          refundReason: 'guided:compose-single-look-rebuild-qc',
          failureKind: 'full-look-mandatory-qc-fail',
          retryReason: getQcWeakestDimension(qc) ?? qc.issues[0] ?? 'single-look-rebuild:qc-fail',
          criticalCategory: primaryItem.category,
          extra: {
            required_full_look_categories: Array.from(new Set(provadorRelevantItems.map((item) => item.category))),
          },
        })
      }
      throw new Error(`Provador rejeitado no QC final: ${qc.issues.join(', ') || getQcWeakestDimension(qc) || 'QC reprovado'}`)
    }

    candidateAttempts.push(`${fittingRoute}:approved`)
    extraData.final_qc_status = 'approved'
    extraData.reference_item_count = provadorReferenceCount
    extraData.applied_categories = provadorRelevantItems.map((item) => item.category)
    if (boundedFullLookMode) {
      extraData.fitting_generation_strategy = 'bounded-full-look'
      extraData.vertex_execution_path = 'disabled_for_single-look-rebuild'
      extraData.stage1_engine = engineUsed || extraData.stage1_engine
      extraData.model_chain_tried = Array.from(new Set(geminiModelsTried))
    }
    finalizeProvadorAudit()
    resultBuffer = Buffer.from(approvedBase64, 'base64')
  } else if (fittingRoute === 'gemini-hold' || fittingRoute === 'gemini-hold-accessories' || fittingRoute === 'gemini-look-sequential') {
    if (fittingRoute === 'gemini-look-sequential') {
      const stageResults: Array<Record<string, unknown>> = []
      const appendStageResult = (stage: string, item: SegmentedFittingItem, status: 'approved' | 'failed' | 'kept_base', issues: string[] = []) => {
        stageResults.push({
          stage,
          category: item.category,
          status,
          issues: issues.slice(0, 5),
        })
      }

      const sequentialItems = blockingWearableItems.slice(0, 2)
      const anchorItem = sequentialItems[0] ?? primaryItem
      const complementItem = sequentialItems[1]
      extraData.fitting_generation_strategy = (
        remainingStructuralItems.length > 0 ? 'gemini-look-sequential-partial' : 'gemini-look-sequential'
      ) satisfies FittingGenerationStrategy
      extraData.auto_recovery_attempted = sequentialItems.length > 1 || remainingStructuralItems.length > 0
      extraData.vertex_execution_path = 'disabled_for_multi_piece'
      extraData.vertex_call_count = 0
      extraData.vertex_product_count_requested = 0
      extraData.vertex_product_count_sent = 0
      extraData.vertex_prediction_count = 0
      extraData.applied_structural_categories = []
      extraData.remaining_structural_categories = [...remainingStructuralItems.map((item) => item.category)]

      let approvedBase64: string | null = null
      let stage1ModelUsed = ''
      const stage1Prompt = buildGeminiSequentialStagePrompt({
        currentCategory: anchorItem.category,
        currentItemDescription: anchorItem.description,
        currentPlacementSuggestion: anchorItem.profile.placement_suggestion,
        ratioInstruction,
        poseInstruction: routedPoseInstruction,
        energyInstruction: routedEnergyInstruction,
        userIntent,
        preservedCategories: [],
        stageLabel: 'anchor',
      })
      let stage1Base64 = await callGeminiWearableCompose({
        promptText: stage1Prompt,
        basePhoto: portraitGeminiImage,
        referenceItem: anchorItem,
        stageLabel: 'gemini-look-sequential:stage-1',
        includePortraitReference: true,
      }).then((result) => {
        stage1ModelUsed = result.modelUsed ?? ''
        return result.imageBase64
      })

      if (!stage1Base64) {
        throw new Error('Todos os modelos Gemini falharam ao aplicar a peca principal do Provador')
      }

      if (stage1ModelUsed) {
        extraData.stage1_engine = `gemini:${stage1ModelUsed}`
      }

      let stage1Qc = await runWearableQualityCheckForItems(stage1Base64, fittingRoute, [anchorItem])
      logFittingQc({
        mode: referenceMode,
        route: fittingRoute,
        stage: 'gemini-look-sequential:stage-1',
        categories: [anchorItem.category],
        approved: stage1Qc.approved,
        weakestDimension: getQcWeakestDimension(stage1Qc),
        issues: stage1Qc.issues,
      })

      if (!stage1Qc.approved) {
        const retryBase64 = await callGeminiWearableCompose({
          promptText: buildRetryPrompt(stage1Prompt, stage1Qc.issues, getQcWeakestDimension(stage1Qc), 'fitting', fittingRoute),
          basePhoto: portraitGeminiImage,
          referenceItem: anchorItem,
          stageLabel: 'gemini-look-sequential:stage-1-retry',
          includePortraitReference: true,
        }).then((result) => {
          stage1ModelUsed = result.modelUsed ?? stage1ModelUsed
          return result.imageBase64
        })

        if (!retryBase64) {
          throw new Error(`Provador rejeitado na peca principal: ${stage1Qc.issues.join(', ') || 'sem imagem'}`)
        }

        stage1Base64 = retryBase64
        if (stage1ModelUsed) {
          extraData.stage1_engine = `gemini:${stage1ModelUsed}`
        }
        stage1Qc = await runWearableQualityCheckForItems(stage1Base64, fittingRoute, [anchorItem])
        logFittingQc({
          mode: referenceMode,
          route: fittingRoute,
          stage: 'gemini-look-sequential:stage-1-retry',
          categories: [anchorItem.category],
          approved: stage1Qc.approved,
          weakestDimension: getQcWeakestDimension(stage1Qc),
          issues: stage1Qc.issues,
        })
      }

      if (!stage1Qc.approved) {
        appendStageResult('stage_1', anchorItem, 'failed', stage1Qc.issues)
        throw new Error(`Provador rejeitado na peca principal: ${stage1Qc.issues.join(', ') || getQcWeakestDimension(stage1Qc) || 'QC reprovado'}`)
      }

      appendStageResult('stage_1', anchorItem, 'approved', stage1Qc.issues)
      approvedBase64 = stage1Base64
      extraData.applied_structural_categories = [anchorItem.category]
      extraData.auto_recovery_succeeded = true

      if (complementItem) {
        const stage2BasePhoto = await normalizeImageForVertex(Buffer.from(stage1Base64, 'base64'), 'jpeg')
        let stage2ModelUsed = ''
        const stage2Prompt = buildGeminiSequentialStagePrompt({
          currentCategory: complementItem.category,
          currentItemDescription: complementItem.description,
          currentPlacementSuggestion: complementItem.profile.placement_suggestion,
          ratioInstruction,
          poseInstruction: routedPoseInstruction,
          energyInstruction: routedEnergyInstruction,
          userIntent,
          preservedCategories: [anchorItem.category],
          stageLabel: 'complement',
        })

        let stage2Base64 = await callGeminiWearableCompose({
          promptText: stage2Prompt,
          basePhoto: stage2BasePhoto,
          referenceItem: complementItem,
          stageLabel: 'gemini-look-sequential:stage-2',
          includePortraitReference: true,
        }).then((result) => {
          stage2ModelUsed = result.modelUsed ?? ''
          return result.imageBase64
        })

        if (stage2Base64) {
          if (stage2ModelUsed) {
            extraData.stage2_engine = `gemini:${stage2ModelUsed}`
          }

          let stage2Qc = await runWearableQualityCheckForItems(stage2Base64, fittingRoute, [anchorItem, complementItem])
          logFittingQc({
            mode: referenceMode,
            route: fittingRoute,
            stage: 'gemini-look-sequential:stage-2',
            categories: [anchorItem.category, complementItem.category],
            approved: stage2Qc.approved,
            weakestDimension: getQcWeakestDimension(stage2Qc),
            issues: stage2Qc.issues,
          })

          if (!stage2Qc.approved) {
            const retryBase64 = await callGeminiWearableCompose({
              promptText: buildRetryPrompt(stage2Prompt, stage2Qc.issues, getQcWeakestDimension(stage2Qc), 'fitting', fittingRoute),
              basePhoto: stage2BasePhoto,
              referenceItem: complementItem,
              stageLabel: 'gemini-look-sequential:stage-2-retry',
              includePortraitReference: true,
            }).then((result) => {
              stage2ModelUsed = result.modelUsed ?? stage2ModelUsed
              return result.imageBase64
            })

            if (retryBase64) {
              stage2Base64 = retryBase64
              if (stage2ModelUsed) {
                extraData.stage2_engine = `gemini:${stage2ModelUsed}`
              }
              stage2Qc = await runWearableQualityCheckForItems(stage2Base64, fittingRoute, [anchorItem, complementItem])
              logFittingQc({
                mode: referenceMode,
                route: fittingRoute,
                stage: 'gemini-look-sequential:stage-2-retry',
                categories: [anchorItem.category, complementItem.category],
                approved: stage2Qc.approved,
                weakestDimension: getQcWeakestDimension(stage2Qc),
                issues: stage2Qc.issues,
              })
            }
          }

          if (stage2Qc.approved) {
            appendStageResult('stage_2', complementItem, 'approved', stage2Qc.issues)
            approvedBase64 = stage2Base64
            extraData.applied_structural_categories = [anchorItem.category, complementItem.category]
          } else {
            appendStageResult('stage_2', complementItem, 'kept_base', stage2Qc.issues)
            preparedContinuationItems = [complementItem, ...remainingStructuralItems]
            preparedContinuationReason = 'stage-2-preservation-failed'
            extraData.continuation_ready = true
            extraData.remaining_structural_categories = preparedContinuationItems.map((item) => item.category)
            extraData.public_error_code = 'resultado_pronto_para_revisao'
            extraData.public_error_title = 'Resultado pronto para revisao'
            extraData.public_error_message = 'Ajustamos a peca principal e deixamos o proximo passo do look preparado.'
          }
        } else {
          appendStageResult('stage_2', complementItem, 'kept_base', ['gemini-stage-2-no-image'])
          preparedContinuationItems = [complementItem, ...remainingStructuralItems]
          preparedContinuationReason = 'stage-2-no-image'
          extraData.continuation_ready = true
          extraData.remaining_structural_categories = preparedContinuationItems.map((item) => item.category)
          extraData.public_error_code = 'resultado_pronto_para_revisao'
          extraData.public_error_title = 'Resultado pronto para revisao'
          extraData.public_error_message = 'Ajustamos a peca principal e deixamos o proximo passo do look preparado.'
        }
      } else if (remainingStructuralItems.length > 0) {
        preparedContinuationItems = [...remainingStructuralItems]
        preparedContinuationReason = 'remaining-structural-items'
        extraData.continuation_ready = true
        extraData.remaining_structural_categories = preparedContinuationItems.map((item) => item.category)
        extraData.public_error_code = 'resultado_pronto_para_revisao'
        extraData.public_error_title = 'Resultado pronto para revisao'
        extraData.public_error_message = 'Ajustamos a peca principal e deixamos o proximo passo do look preparado.'
      }

      extraData.stage_results = stageResults
      if (extraData.continuation_ready === true) {
        extraData.accessory_overlay_skipped_reason = 'structural-continuation-pending'
        extraData.editorial_qc_status = 'skipped_structural_continuation_pending'
      }
      extraData.final_qc_status = 'approved'
      finalizeProvadorAudit()
      resultBuffer = Buffer.from(approvedBase64, 'base64')
    } else {
    const holdPrompt = fittingRoute === 'gemini-hold-accessories'
      ? buildAccessoryHoldPrompt({
        ratioInstruction,
        poseInstruction: routedPoseInstruction,
        energyInstruction: routedEnergyInstruction,
        userIntent,
        analyses: selectedAccessoryAnalyses,
        ignoredPropTypes,
      })
      : buildHoldPrompt({
        category: primaryItem.category,
        ratioInstruction,
        poseInstruction: routedPoseInstruction,
        energyInstruction: routedEnergyInstruction,
        userIntent,
        referenceDescription: selectedItems.map((item) => item.description).join(' | '),
        placementSuggestion: selectedItems.map((item) => item.profile.placement_suggestion).filter(Boolean).join(' | '),
      })
    extraData.fitting_generation_strategy = (
      referenceMode === 'single-look-photo' ? 'single-photo-hold-item' : 'multi-ref-hold-item'
    ) satisfies FittingGenerationStrategy
    if (fittingRoute === 'gemini-hold-accessories') {
      extraData.accessory_reference_count = selectedAccessoryAnalyses.length
    }

    const holdModels = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview']
    async function callGeminiHold(promptText: string, itemsForGeneration: SegmentedFittingItem[]): Promise<GeminiImageCallResult> {
      const body = JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: '[BASE PHOTO] Ã¢â‚¬â€ preserve this person exactly:' },
            { inlineData: { mimeType: 'image/jpeg', data: portraitBuf.toString('base64') } },
            { text: '[CLIENT ITEM] Ã¢â‚¬â€ integrate naturally into the base photo:' },
            { inlineData: { mimeType: primaryItem.mimeType, data: primaryItem.imageBuffer.toString('base64') } },
            { text: promptText },
          ],
        }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      })

      for (const model of holdModels) {
        trackGeminiAttempt(fittingRoute === 'gemini-hold-accessories' ? 'gemini-hold-accessories' : 'gemini-hold', model)
        try {
          const res = await fetchGoogleGenerateContent({
            model,
            feature: 'compose_gemini_hold',
            body: JSON.parse(body),
          })
          if (!res.ok) continue
          const json = await res.json()
          const parts = json.candidates?.[0]?.content?.parts ?? []
          const imgPart = parts.find((part: any) => part.inlineData?.mimeType?.startsWith('image/'))
          if (imgPart?.inlineData?.data) return { imageBase64: imgPart.inlineData.data as string, modelUsed: model }
        } catch { /* continue */ }
      }

      return { imageBase64: null }
    }

    async function callGeminiAccessoryHold(
      promptText: string,
      analysesForGeneration: AccessoryReferenceAnalysis[],
      detailItemsForGeneration: SegmentedFittingItem[],
      basePhoto: NormalizedImageAsset,
    ): Promise<GeminiImageCallResult> {
      const referenceParts = analysesForGeneration.flatMap((analysis, index) => ([
        { text: `[CLIENT ACCESSORY REFERENCE ${index + 1}] - preserve every accessory in this reference:` },
        { inlineData: { mimeType: analysis.normalizedImage.mimeType, data: analysis.normalizedImage.buffer.toString('base64') } },
      ]))
      const detailParts = detailItemsForGeneration.flatMap((item, index) => ([
        { text: `[CLIENT ACCESSORY DETAIL ${index + 1}] - literal accessory crop for material, scale, and construction fidelity:` },
        { inlineData: { mimeType: item.mimeType, data: item.imageBuffer.toString('base64') } },
      ]))
      const body = JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: '[BASE PHOTO] - preserve this person exactly:' },
            { inlineData: { mimeType: basePhoto.mimeType, data: basePhoto.buffer.toString('base64') } },
            ...referenceParts,
            ...detailParts,
            { text: promptText },
          ],
        }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      })

      for (const model of ACCESSORY_GEMINI_MODEL_CHAIN) {
        trackGeminiAttempt('gemini-hold-accessories', model)
        try {
          const res = await fetchGoogleGenerateContent({
            model,
            feature: 'compose_gemini_accessory_hold',
            body: JSON.parse(body),
          })
          if (!res.ok) continue
          const json = await res.json()
          const parts = json.candidates?.[0]?.content?.parts ?? []
          const imgPart = parts.find((part: any) => part.inlineData?.mimeType?.startsWith('image/'))
          if (imgPart?.inlineData?.data) {
            return { imageBase64: imgPart.inlineData.data as string, modelUsed: model }
          }
        } catch { /* continue */ }
      }

      return { imageBase64: null }
    }

    let holdModelUsed = ''
    let accessoryModelUsed = ''
    let approvedBase64 = await (
      fittingRoute === 'gemini-hold-accessories'
        ? callGeminiAccessoryHold(holdPrompt, selectedAccessoryAnalyses, selectedAccessoryDetailItems, portraitGeminiImage).then((result) => {
          accessoryModelUsed = result.modelUsed ?? ''
          return result.imageBase64
        })
        : callGeminiHold(holdPrompt, selectedItems).then((result) => {
          holdModelUsed = result.modelUsed ?? ''
          return result.imageBase64
        })
    )
    if (!approvedBase64) throw new Error('Todos os modelos Gemini falharam no ramo de uso/segurar do Provador')
    if (fittingRoute === 'gemini-hold-accessories' && accessoryModelUsed) {
      extraData.stage2_engine = `gemini:${accessoryModelUsed}`
    } else if (holdModelUsed) {
      extraData.stage2_engine = `gemini:${holdModelUsed}`
    }

    const qc1 = fittingRoute === 'gemini-hold-accessories'
      ? await assessAccessoryBatchQuality({
        analyses: selectedAccessoryAnalyses,
        generatedBase64: approvedBase64,
        fittingRoute,
      })
      : await runWearableQualityCheck(approvedBase64, fittingRoute)
    if (fittingRoute === 'gemini-hold-accessories' && 'results' in qc1) {
      extraData.accessory_qc_results = qc1.results
    }
    logFittingQc({
      mode: referenceMode,
      route: fittingRoute,
      stage: fittingRoute === 'gemini-hold-accessories' ? 'gemini-hold-accessories:attempt-1' : 'gemini-hold:attempt-1',
      categories: selectedItems.map((item) => item.category),
      approved: qc1.approved,
      weakestDimension: getQcWeakestDimension(qc1),
      issues: qc1.issues,
    })
    if (!qc1.approved) {
      extraData.retry_reason = getQcWeakestDimension(qc1) ?? qc1.issues[0] ?? 'initial-reject'
      extraData.qc_failure_kind = 'initial-reject'
      const retryBase64 = await (
        fittingRoute === 'gemini-hold-accessories'
          ? callGeminiAccessoryHold(
            buildRetryPrompt(
              holdPrompt,
              qc1.issues,
              getQcWeakestDimension(qc1),
              'fitting',
              fittingRoute,
            ),
            selectedAccessoryAnalyses,
            selectedAccessoryDetailItems,
            portraitGeminiImage,
          ).then((result) => {
            accessoryModelUsed = result.modelUsed ?? accessoryModelUsed
            return result.imageBase64
          })
          : callGeminiHold(
            buildRetryPrompt(
              holdPrompt,
              qc1.issues,
              getQcWeakestDimension(qc1),
              'fitting',
              fittingRoute,
            ),
            selectedItems,
          ).then((result) => {
            holdModelUsed = result.modelUsed ?? holdModelUsed
            return result.imageBase64
          })
      )
      if (!retryBase64) {
        throw new Error(`Provador rejeitado no QC (${qc1.issues.join(', ') || 'retry sem imagem'})`)
      }
      if (fittingRoute === 'gemini-hold-accessories' && accessoryModelUsed) {
        extraData.stage2_engine = `gemini:${accessoryModelUsed}`
      } else if (holdModelUsed) {
        extraData.stage2_engine = `gemini:${holdModelUsed}`
      }

      const qc2 = fittingRoute === 'gemini-hold-accessories'
        ? await assessAccessoryBatchQuality({
          analyses: selectedAccessoryAnalyses,
          generatedBase64: retryBase64,
          fittingRoute,
        })
        : await runWearableQualityCheck(retryBase64, fittingRoute)
      if (fittingRoute === 'gemini-hold-accessories' && 'results' in qc2) {
        extraData.accessory_qc_results = qc2.results
      }
      logFittingQc({
        mode: referenceMode,
        route: fittingRoute,
        stage: fittingRoute === 'gemini-hold-accessories' ? 'gemini-hold-accessories:attempt-2' : 'gemini-hold:attempt-2',
        categories: selectedItems.map((item) => item.category),
        approved: qc2.approved,
        weakestDimension: getQcWeakestDimension(qc2),
        issues: qc2.issues,
      })
      let approvedAfterTargetedRetry = false
      if (!qc2.approved) {
        if (
          fittingRoute === 'gemini-hold-accessories'
          && 'results' in qc2
          && shouldRunFineJewelryRetry(qc2.results as AccessoryQcResult[])
        ) {
          extraData.accessory_qc_retry_policy = 'fine-jewelry-attempt-3'
          const jewelryRetryBase64 = await callGeminiAccessoryHold(
            buildFineJewelryAccessoryRetryPrompt(
              holdPrompt,
              qc2.issues,
              getQcWeakestDimension(qc2),
            ),
            selectedAccessoryAnalyses,
            selectedAccessoryDetailItems,
            portraitGeminiImage,
          ).then((result) => {
            accessoryModelUsed = result.modelUsed ?? accessoryModelUsed
            return result.imageBase64
          })

          if (jewelryRetryBase64) {
            if (accessoryModelUsed) {
              extraData.stage2_engine = `gemini:${accessoryModelUsed}`
            }
            const qc3 = await assessAccessoryBatchQuality({
              analyses: selectedAccessoryAnalyses,
              generatedBase64: jewelryRetryBase64,
              fittingRoute,
            })
            extraData.accessory_qc_results = qc3.results
            logFittingQc({
              mode: referenceMode,
              route: fittingRoute,
              stage: 'gemini-hold-accessories:attempt-3-fine-jewelry',
              categories: selectedItems.map((item) => item.category),
              approved: qc3.approved,
              weakestDimension: getQcWeakestDimension(qc3),
              issues: qc3.issues,
            })
            if (qc3.approved) {
              approvedBase64 = jewelryRetryBase64
              approvedAfterTargetedRetry = true
            }
          }
        }
        if (!approvedAfterTargetedRetry) {
          extraData.qc_failure_kind = 'guided-fail-after-qc'
          if (referenceMode === 'single-look-photo' && fittingRoute === 'gemini-hold') {
            failGuidedFittingWithAudit({
              message: buildSinglePhotoFailureMessage(primaryItem.category),
              refundReason: 'guided:compose-single-look-qc',
              failureKind: 'guided-fail-after-qc',
              retryReason: `category:${primaryItem.category} | gemini-hold-single-photo-qc`,
              criticalCategory: primaryItem.category,
            })
          }
          throw new Error(`Provador rejeitado apos retry: ${(qc2.issues ?? qc1.issues).join(', ')}`)
        }
      }
      if (!approvedAfterTargetedRetry) {
        approvedBase64 = retryBase64
      }
    }

    extraData.final_qc_status = 'approved'
    finalizeProvadorAudit()
    resultBuffer = Buffer.from(approvedBase64, 'base64')
    }
  } else {
    const vertexWearableItems = blockingWearableItems.length > 0
      ? blockingWearableItems
      : selectedItems.filter((item) => isWearableFittingCategory(item.category))
    if (vertexWearableItems.length === 0) {
      throw new Error('Nenhum item vestivel valido foi encontrado para o fluxo Vertex VTO.')
    }

    const candidateAttempts = extraData.candidate_attempts as string[]
    const multiRefBatchEligible = referenceMode === 'separate-references' && vertexWearableItems.length > 1
    extraData.vertex_candidate_categories = vertexWearableItems.map((item) => item.category)
    extraData.vertex_requested_product_count = vertexWearableItems.length
    extraData.vertex_multi_product_candidate = multiRefBatchEligible

    if (referenceMode === 'separate-references') {
      console.warn(
        `[studio] vertex-vto separate-references | batch_candidate=${multiRefBatchEligible ? 'yes' : 'no'} items=${vertexWearableItems.length} categories=${vertexWearableItems.map((item) => item.category).join(',')}`,
      )
    }

    async function runVertexTryOnSequence(options?: {
      executionMode?: VertexTryOnExecutionMode
      stage?: string
    }): Promise<VertexTryOnCallResult> {
      let currentPersonImage = portraitVertexImage
      let latestResult: VertexTryOnCallResult = {
        imageBase64: null,
        productCountRequested: 0,
        productCountSent: 0,
        executionMode: 'multi-ref-sequential',
        predictionCount: 0,
      }

      for (const item of vertexWearableItems) {
        trackVertexCall(
          options?.stage
            ?? (referenceMode === 'single-look-photo' ? 'vertex-single-photo-sequential' : 'vertex-sequential'),
          1,
        )
        latestResult = await callVertexVirtualTryOn({
          portraitBuffer: currentPersonImage.buffer,
          portraitMimeType: currentPersonImage.mimeType,
          items: [item],
          fittingRoute,
          executionMode: options?.executionMode
            ?? (referenceMode === 'single-look-photo' ? 'single-photo-whole-look' : 'multi-ref-sequential'),
        })
        if (!latestResult.imageBase64) return latestResult
        currentPersonImage = await normalizeImageForVertex(Buffer.from(latestResult.imageBase64, 'base64'), 'png')
      }

      return latestResult
    }

    let approvedBase64: string | null = null
    let singlePhotoGeminiFallbackApproved = false
    let shouldShortCircuitEditorialFinisher = false

    async function runSinglePhotoGeminiFallback(params: {
      trigger: string
      sourceIssues: string[]
      weakestDimension?: string
    }): Promise<string | null> {
      const fallbackRoute: FittingRoute = 'gemini-hold'
      const fallbackBasePrompt = buildFittingPrompt({
        category: primaryItem.category,
        categoryPreset: routedCategoryPreset.instruction,
        ratioInstruction,
        poseInstruction: routedPoseInstruction,
        energyInstruction: routedEnergyInstruction,
        userIntent,
        route: fallbackRoute,
        itemDescriptions: selectedItems.map((item) => item.description),
      })
      const holdModels = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview']

      async function callGeminiSinglePhotoWearable(promptText: string): Promise<GeminiImageCallResult> {
        const body = JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: '[BASE PHOTO] - preserve this person exactly:' },
              { inlineData: { mimeType: portraitGeminiImage.mimeType, data: portraitGeminiImage.buffer.toString('base64') } },
              { text: '[FASHION ITEM] - reproduce this client garment with exact fidelity:' },
              { inlineData: { mimeType: primaryItem.mimeType, data: primaryItem.imageBuffer.toString('base64') } },
              { text: promptText },
            ],
          }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        })

        for (const model of holdModels) {
          trackGeminiAttempt('gemini-single-photo-fallback', model)
          try {
            const res = await fetchGoogleGenerateContent({
              model,
              feature: 'compose_single_photo_fallback',
              body: JSON.parse(body),
            })
            if (!res.ok) continue
            const json = await res.json()
            const parts = json.candidates?.[0]?.content?.parts ?? []
            const imgPart = parts.find((part: any) => part.inlineData?.mimeType?.startsWith('image/'))
            if (imgPart?.inlineData?.data) return { imageBase64: imgPart.inlineData.data as string, modelUsed: model }
          } catch { /* continue */ }
        }

        return { imageBase64: null }
      }

      extraData.vertex_single_photo_fallback_attempted = true
      extraData.vertex_single_photo_fallback_trigger = params.trigger
      fallbackBranchUsed = 'gemini-single-photo-fallback'
      candidateAttempts.push(`${fallbackRoute}:single-photo-fallback:attempt-1`)

      const firstPrompt = params.sourceIssues.length > 0
        ? buildRetryPrompt(
          fallbackBasePrompt,
          params.sourceIssues,
          params.weakestDimension,
          'fitting',
          fallbackRoute,
        )
        : fallbackBasePrompt
      let fallbackModelUsed = ''
      const firstAttempt = await callGeminiSinglePhotoWearable(firstPrompt)
      fallbackModelUsed = firstAttempt.modelUsed ?? fallbackModelUsed
      const firstBase64 = firstAttempt.imageBase64
      if (!firstBase64) {
        candidateAttempts.push(`${fallbackRoute}:single-photo-fallback:no-image`)
        return null
      }
      if (fallbackModelUsed) {
        extraData.stage2_engine = `gemini:${fallbackModelUsed}`
      }

      const qc1 = await assessCompositionQuality(referenceUrls[0], firstBase64, primaryItem.profile, {
        variant: 'fitting',
        fittingCategory: routedFittingCategory,
        fittingRoute: fallbackRoute,
      })
      logFittingQc({
        mode: referenceMode,
        route: fallbackRoute,
        stage: 'gemini-single-photo-fallback:attempt-1',
        categories: selectedItems.map((item) => item.category),
        approved: qc1.approved,
        weakestDimension: qc1.weakest_dimension,
        issues: qc1.issues,
      })
      if (qc1.approved) {
        candidateAttempts.push(`${fallbackRoute}:single-photo-fallback:approved-attempt-1`)
        extraData.fitting_generation_strategy = 'single-photo-hold-item' satisfies FittingGenerationStrategy
        extraData.fitting_primary_route = fittingRoute
        extraData.fitting_route = fallbackRoute
        extraData.vertex_single_photo_fallback_used = true
        singlePhotoGeminiFallbackApproved = true
        return firstBase64
      }

      candidateAttempts.push(`${fallbackRoute}:single-photo-fallback:qc-rejected-attempt-1`)
      const retryAttempt = await callGeminiSinglePhotoWearable(
        buildRetryPrompt(
          fallbackBasePrompt,
          qc1.issues,
          qc1.weakest_dimension,
          'fitting',
          fallbackRoute,
        ),
      )
      fallbackModelUsed = retryAttempt.modelUsed ?? fallbackModelUsed
      const retryBase64 = retryAttempt.imageBase64
      if (!retryBase64) {
        candidateAttempts.push(`${fallbackRoute}:single-photo-fallback:no-image-retry`)
        return null
      }
      if (fallbackModelUsed) {
        extraData.stage2_engine = `gemini:${fallbackModelUsed}`
      }

      const qc2 = await assessCompositionQuality(referenceUrls[0], retryBase64, primaryItem.profile, {
        variant: 'fitting',
        fittingCategory: routedFittingCategory,
        fittingRoute: fallbackRoute,
      })
      logFittingQc({
        mode: referenceMode,
        route: fallbackRoute,
        stage: 'gemini-single-photo-fallback:attempt-2',
        categories: selectedItems.map((item) => item.category),
        approved: qc2.approved,
        weakestDimension: qc2.weakest_dimension,
        issues: qc2.issues,
      })
      if (!qc2.approved) {
        candidateAttempts.push(`${fallbackRoute}:single-photo-fallback:qc-rejected-attempt-2`)
        return null
      }

      candidateAttempts.push(`${fallbackRoute}:single-photo-fallback:approved-attempt-2`)
      extraData.fitting_generation_strategy = 'single-photo-hold-item' satisfies FittingGenerationStrategy
      extraData.fitting_primary_route = fittingRoute
      extraData.fitting_route = fallbackRoute
      extraData.vertex_single_photo_fallback_used = true
      singlePhotoGeminiFallbackApproved = true
      return retryBase64
    }

    async function callGeminiHybridAccessoryOverlay(
      promptText: string,
      basePhoto: NormalizedImageAsset,
    ): Promise<GeminiImageCallResult> {
      const referenceParts = selectedAccessoryAnalyses.flatMap((analysis, index) => ([
        { text: `[CLIENT ACCESSORY REFERENCE ${index + 1}] - preserve every accessory in this reference:` },
        { inlineData: { mimeType: analysis.normalizedImage.mimeType, data: analysis.normalizedImage.buffer.toString('base64') } },
      ]))
      const detailParts = selectedAccessoryDetailItems.flatMap((item, index) => ([
        { text: `[CLIENT ACCESSORY DETAIL ${index + 1}] - literal accessory crop for material, scale, and construction fidelity:` },
        { inlineData: { mimeType: item.mimeType, data: item.imageBuffer.toString('base64') } },
      ]))
      const body = JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: '[BASE PHOTO] - preserve this approved wearable result exactly:' },
            { inlineData: { mimeType: basePhoto.mimeType, data: basePhoto.buffer.toString('base64') } },
            ...referenceParts,
            ...detailParts,
            { text: promptText },
          ],
        }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      })

      for (const model of ACCESSORY_GEMINI_MODEL_CHAIN) {
        trackGeminiAttempt('hybrid-accessory-overlay', model)
        try {
          const res = await fetchGoogleGenerateContent({
            model,
            feature: 'compose_hybrid_accessory_overlay',
            body: JSON.parse(body),
          })
          if (!res.ok) continue
          const json = await res.json()
          const parts = json.candidates?.[0]?.content?.parts ?? []
          const imgPart = parts.find((part: any) => part.inlineData?.mimeType?.startsWith('image/'))
          if (imgPart?.inlineData?.data) {
            return { imageBase64: imgPart.inlineData.data as string, modelUsed: model }
          }
        } catch { /* continue */ }
      }

      return { imageBase64: null }
    }

    async function runHybridAccessoryOverlay(base64: string): Promise<string> {
      const basePhoto = await normalizeImageForVertex(Buffer.from(base64, 'base64'), 'jpeg')
      const hybridPrompt = buildHybridAccessoryOverlayPrompt({
        ratioInstruction,
        poseInstruction: routedPoseInstruction,
        energyInstruction: routedEnergyInstruction,
        userIntent,
        analyses: selectedAccessoryAnalyses,
        primaryWearableCategory: routedFittingCategory,
        ignoredPropTypes,
      })

      const evaluateHybridResult = async (candidateBase64: string, stage: string) => {
        const garmentQc = await runWearableQualityCheck(candidateBase64, fittingRoute)
        const accessoryQc = await assessAccessoryBatchQuality({
          analyses: selectedAccessoryAnalyses,
          generatedBase64: candidateBase64,
          fittingRoute: 'gemini-hold-accessories',
        })
        extraData.accessory_qc_results = accessoryQc.results
        logFittingQc({
          mode: referenceMode,
          route: fittingRoute,
          stage,
          categories: [...vertexWearableItems.map((item) => item.category), ...selectedAccessoryDetailItems.map((item) => item.category)],
          approved: garmentQc.approved && accessoryQc.approved,
          weakestDimension: getQcWeakestDimension(garmentQc) ?? accessoryQc.weakestDimension,
          issues: Array.from(new Set([...garmentQc.issues, ...accessoryQc.issues])),
        })

        return {
          approved: garmentQc.approved && accessoryQc.approved,
          garmentApproved: garmentQc.approved,
          accessoryApproved: accessoryQc.approved,
          garmentScore: getWearableQcScore(garmentQc),
          accessoryScore: getLowestQcScore(accessoryQc.results),
          weakestDimension: getQcWeakestDimension(garmentQc) ?? accessoryQc.weakestDimension,
          issues: Array.from(new Set([...garmentQc.issues, ...accessoryQc.issues])).slice(0, 10),
        }
      }

      const firstAttempt = await callGeminiHybridAccessoryOverlay(hybridPrompt, basePhoto)
      if (!firstAttempt.imageBase64) {
        if (singlePhotoFullLookMandatory) {
          failGuidedFittingWithAudit({
            message: 'Nao conseguimos aplicar todos os itens do look enviado pelo cliente. Nesta foto unica, roupa, acessorios, calcado e headwear sao obrigatorios no resultado final.',
            refundReason: 'guided:compose-full-look-accessory-overlay-missing',
            failureKind: 'full-look-mandatory-overlay-missing',
            retryReason: 'hybrid-accessory-overlay:no-image',
          })
        }
        extraData.accessory_overlay_skipped_reason = 'no-image_kept_base'
        extraData.accessory_qc_status = 'no-image_kept_base'
        return base64
      }
      extraData.stage2_engine = firstAttempt.modelUsed ? `gemini:${firstAttempt.modelUsed}` : 'gemini:unknown'
      const firstQc = await evaluateHybridResult(firstAttempt.imageBase64, 'hybrid-accessories:attempt-1')
      if (firstQc.approved) {
        if (shouldSkipEditorialFinisherAfterStrongHybridApproval({
          editorialPropCandidates,
          garmentScore: firstQc.garmentScore,
          accessoryScore: firstQc.accessoryScore,
          weakestDimension: firstQc.weakestDimension,
        })) {
          shouldShortCircuitEditorialFinisher = true
          extraData.editorial_qc_status = 'skipped_after_strong_hybrid_approval'
          extraData.editorial_finisher_skip_reason = 'strong-hybrid-approval'
          console.log(
            `[studio] editorial finisher skipped | reason=strong-hybrid-approval garment_score=${firstQc.garmentScore} accessory_score=${firstQc.accessoryScore}`,
          )
        }
        return firstAttempt.imageBase64
      }

      extraData.retry_reason = firstQc.weakestDimension ?? firstQc.issues[0] ?? 'hybrid-accessory-reject'
      const retryAttempt = await callGeminiHybridAccessoryOverlay(
        buildRetryPrompt(
          hybridPrompt,
          firstQc.issues,
          firstQc.weakestDimension,
          'fitting',
          'gemini-hold-accessories',
        ),
        basePhoto,
      )
      if (!retryAttempt.imageBase64) {
        if (singlePhotoFullLookMandatory) {
          failGuidedFittingWithAudit({
            message: 'Nao conseguimos preservar todos os itens do look completo apos o retry. O resultado precisa conter tudo o que o cliente enviou.',
            refundReason: 'guided:compose-full-look-accessory-overlay-retry-missing',
            failureKind: 'full-look-mandatory-overlay-retry-missing',
            retryReason: 'hybrid-accessory-overlay:retry-no-image',
          })
        }
        extraData.accessory_overlay_skipped_reason = 'retry_no_image_kept_base'
        extraData.accessory_qc_status = firstQc.garmentApproved ? 'soft_reject_kept_base' : 'retry_no_image_kept_base'
        return base64
      }
      if (retryAttempt.modelUsed) {
        extraData.stage2_engine = `gemini:${retryAttempt.modelUsed}`
      }
      const retryQc = await evaluateHybridResult(retryAttempt.imageBase64, 'hybrid-accessories:attempt-2')
      if (!retryQc.approved) {
        if (singlePhotoFullLookMandatory) {
          failGuidedFittingWithAudit({
            message: 'O QC reprovou o look completo porque nem todos os itens enviados pelo cliente foram preservados. Nesta rota, nada pode ficar de fora.',
            refundReason: 'guided:compose-full-look-accessory-overlay-qc',
            failureKind: 'full-look-mandatory-overlay-qc-fail',
            retryReason: retryQc.weakestDimension ?? retryQc.issues[0] ?? 'hybrid-accessory-overlay:qc-fail',
          })
        }
        extraData.accessory_overlay_skipped_reason = retryQc.garmentApproved ? 'soft_reject_kept_base' : 'hard_reject_kept_base'
        extraData.accessory_qc_status = retryQc.garmentApproved ? 'soft_reject_kept_base' : 'hard_reject_kept_base'
        return base64
      }

      if (shouldSkipEditorialFinisherAfterStrongHybridApproval({
        editorialPropCandidates,
        garmentScore: retryQc.garmentScore,
        accessoryScore: retryQc.accessoryScore,
        weakestDimension: retryQc.weakestDimension,
      })) {
        shouldShortCircuitEditorialFinisher = true
        extraData.editorial_qc_status = 'skipped_after_strong_hybrid_approval'
        extraData.editorial_finisher_skip_reason = 'strong-hybrid-approval'
        console.log(
          `[studio] editorial finisher skipped | reason=strong-hybrid-approval garment_score=${retryQc.garmentScore} accessory_score=${retryQc.accessoryScore}`,
        )
      }

      return retryAttempt.imageBase64
    }

    async function callGeminiEditorialFinisher(
      promptText: string,
      basePhoto: NormalizedImageAsset,
      stylingBoard: NormalizedImageAsset,
    ): Promise<GeminiImageCallResult> {
      const referenceParts = selectedAccessoryAnalyses.flatMap((analysis, index) => ([
        { text: `[CLIENT ACCESSORY REFERENCE ${index + 1}] - styling guidance only:` },
        { inlineData: { mimeType: analysis.normalizedImage.mimeType, data: analysis.normalizedImage.buffer.toString('base64') } },
      ]))
      const detailParts = selectedAccessoryDetailItems.flatMap((item, index) => ([
        { text: `[CLIENT ACCESSORY DETAIL ${index + 1}] - preserve these already-approved fashion accessories if visible:` },
        { inlineData: { mimeType: item.mimeType, data: item.imageBuffer.toString('base64') } },
      ]))
      const body = JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: '[APPROVED PROVADOR RESULT] - this is the sovereign base image:' },
            { inlineData: { mimeType: basePhoto.mimeType, data: basePhoto.buffer.toString('base64') } },
            { text: '[ORIGINAL PORTRAIT REFERENCE] - preserve this exact person identity:' },
            { inlineData: { mimeType: portraitGeminiImage.mimeType, data: portraitGeminiImage.buffer.toString('base64') } },
            { text: '[ORIGINAL STYLING BOARD] - styling guidance only, never override the approved outfit:' },
            { inlineData: { mimeType: stylingBoard.mimeType, data: stylingBoard.buffer.toString('base64') } },
            ...referenceParts,
            ...detailParts,
            { text: promptText },
          ],
        }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      })

      for (const model of EDITORIAL_FINISHER_GEMINI_MODEL_CHAIN) {
        trackGeminiAttempt('editorial-finisher', model)
        try {
          const res = await fetchGoogleGenerateContent({
            model,
            feature: 'compose_editorial_finisher',
            body: JSON.parse(body),
          })
          if (!res.ok) continue
          const json = await res.json()
          const parts = json.candidates?.[0]?.content?.parts ?? []
          const imgPart = parts.find((part: any) => part.inlineData?.mimeType?.startsWith('image/'))
          if (imgPart?.inlineData?.data) {
            return { imageBase64: imgPart.inlineData.data as string, modelUsed: model }
          }
        } catch { /* continue */ }
      }

      return { imageBase64: null }
    }

    async function runEditorialFinisher(base64: string): Promise<string> {
      if (!editorialFinisherEligible) return base64

      extraData.editorial_finisher_attempted = true
      editorialFinisherAttemptCount += 1
      const basePhoto = await normalizeImageForVertex(Buffer.from(base64, 'base64'), 'jpeg')
      const stylingBoard = await normalizeImageForVertex(referenceBuffers[0], 'jpeg')
      const editorialPrompt = buildEditorialFinisherPrompt({
        ratioInstruction,
        poseInstruction: routedPoseInstruction,
        energyInstruction: routedEnergyInstruction,
        userIntent,
        primaryWearableCategory: routedFittingCategory,
        detectedAccessoryTypes: collectAccessoryTypes(selectedAccessoryAnalyses),
        editorialPropCandidates,
      })

      const evaluateEditorialResult = async (candidateBase64: string, stage: string) => {
        const garmentQc = await runWearableQualityCheck(candidateBase64, fittingRoute)
        const accessoryQc = selectedAccessoryAnalyses.length > 0
          ? await assessAccessoryBatchQuality({
            analyses: selectedAccessoryAnalyses,
            generatedBase64: candidateBase64,
            fittingRoute: 'gemini-hold-accessories',
          })
          : null

        if (accessoryQc) {
          extraData.accessory_qc_results = accessoryQc.results
        }

        const approved = garmentQc.approved && (accessoryQc ? accessoryQc.approved : true)
        const weakestDimension = getQcWeakestDimension(garmentQc) ?? accessoryQc?.weakestDimension
        const issues = Array.from(new Set([
          ...garmentQc.issues,
          ...(accessoryQc?.issues ?? []),
        ])).slice(0, 10)

        logFittingQc({
          mode: referenceMode,
          route: fittingRoute,
          stage,
          categories: [...vertexWearableItems.map((item) => item.category), ...selectedAccessoryDetailItems.map((item) => item.category)],
          approved,
          weakestDimension,
          issues,
        })

        return { approved, weakestDimension, issues }
      }

      const firstAttempt = await callGeminiEditorialFinisher(editorialPrompt, basePhoto, stylingBoard)
      if (!firstAttempt.imageBase64) {
        extraData.editorial_qc_status = 'no-image_kept_base'
        return base64
      }
      extraData.editorial_finisher_model = firstAttempt.modelUsed ?? 'unknown'
      const firstQc = await evaluateEditorialResult(firstAttempt.imageBase64, 'editorial-finisher:attempt-1')
      if (firstQc.approved) {
        extraData.editorial_finisher_used = true
        extraData.editorial_props_applied = editorialPropCandidates
        extraData.editorial_qc_status = 'approved'
        return firstAttempt.imageBase64
      }

      const retryAttempt = await callGeminiEditorialFinisher(
        buildEditorialFinisherRetryPrompt(
          editorialPrompt,
          firstQc.issues,
          firstQc.weakestDimension,
        ),
        basePhoto,
        stylingBoard,
      )
      editorialFinisherAttemptCount += 1
      if (!retryAttempt.imageBase64) {
        extraData.editorial_qc_status = 'retry_no_image_kept_base'
        return base64
      }
      if (retryAttempt.modelUsed) {
        extraData.editorial_finisher_model = retryAttempt.modelUsed
      }
      const retryQc = await evaluateEditorialResult(retryAttempt.imageBase64, 'editorial-finisher:attempt-2')
      if (!retryQc.approved) {
        extraData.editorial_qc_status = 'rejected_kept_base'
        return base64
      }

      extraData.editorial_finisher_used = true
      extraData.editorial_props_applied = editorialPropCandidates
      extraData.editorial_qc_status = 'approved'
      return retryAttempt.imageBase64
    }

    if (referenceMode === 'single-look-photo') {
      const singlePhotoSequentialEligible = singlePhotoUsesSegmentedWearables && vertexWearableItems.length > 1
      const canUseSinglePhotoGeminiFallback = !singlePhotoSequentialEligible && !singlePhotoFullLookMandatory
      const singlePhotoAttemptLabel = singlePhotoSequentialEligible
        ? 'auto-split-sequential'
        : 'vertex-single-photo-direct'
      extraData.fitting_generation_strategy = (
        singlePhotoSequentialEligible ? 'single-photo-segmented-sequential' : 'single-photo-whole-look'
      ) satisfies FittingGenerationStrategy
      extraData.vertex_execution_path = singlePhotoSequentialEligible
        ? 'auto-split-sequential'
        : 'vertex-single-photo-direct'
      extraData.auto_recovery_attempted = singlePhotoSequentialEligible
      extraData.auto_split_attempted = singlePhotoSequentialEligible
      extraData.auto_split_reference_count = singlePhotoSequentialEligible ? vertexWearableItems.length : 0
      extraData.auto_split_selected_categories = singlePhotoSequentialEligible
        ? vertexWearableItems.map((item) => item.category)
        : []

      const singlePhotoResult = singlePhotoSequentialEligible
        ? await runVertexTryOnSequence({
          executionMode: 'multi-ref-sequential',
          stage: 'auto-split-sequential',
        })
        : await (async () => {
          trackVertexCall('vertex-single-photo-direct', vertexWearableItems.length)
          return callVertexVirtualTryOn({
            portraitBuffer: portraitVertexImage.buffer,
            portraitMimeType: portraitVertexImage.mimeType,
            items: vertexWearableItems,
            fittingRoute,
            executionMode: 'single-photo-whole-look',
          })
        })()
      extraData.vertex_product_count_requested = singlePhotoResult.productCountRequested
      extraData.vertex_product_count_sent = singlePhotoResult.productCountSent
      extraData.vertex_prediction_count = singlePhotoResult.predictionCount

      if (!singlePhotoResult.imageBase64) {
        candidateAttempts.push(`${singlePhotoAttemptLabel}:no-image`)
        if (!canUseSinglePhotoGeminiFallback) {
          failGuidedFittingWithAudit({
            message: buildSinglePhotoFailureMessage(),
            refundReason: 'guided:compose-single-look-auto-split-empty',
            failureKind: 'guided-fail-after-qc',
            autoSplitFailedStage: 'vertex-empty',
          })
        }
        const geminiFallbackResult = await runSinglePhotoGeminiFallback({
          trigger: 'vertex-empty',
          sourceIssues: ['Vertex returned no image for the single-photo wearable attempt. Preserve the exact client garment with literal fidelity.'],
        })
        if (!geminiFallbackResult) {
          failGuidedFittingWithAudit({
            message: buildSinglePhotoFailureMessage(primaryItem.category),
            refundReason: 'guided:compose-single-look-vertex-empty',
            failureKind: 'guided-fail-after-qc',
            criticalCategory: primaryItem.category,
          })
        }
        extraData.auto_recovery_attempted = true
        extraData.auto_recovery_succeeded = true
        approvedBase64 = geminiFallbackResult
      }

      if (!approvedBase64 && singlePhotoResult.imageBase64) {
        candidateAttempts.push(`${singlePhotoAttemptLabel}:generated`)
        const qc1 = singlePhotoFullLookMandatory
          ? await runMandatoryFullLookQualityCheck(singlePhotoResult.imageBase64, fittingRoute)
          : await runWearableQualityCheck(singlePhotoResult.imageBase64, fittingRoute)
        const qcFailureDetails = getWearableQcFailureDetails(qc1, primaryItem.category)
        logFittingQc({
          mode: referenceMode,
          route: fittingRoute,
          stage: singlePhotoAttemptLabel,
          categories: singlePhotoFullLookMandatory
            ? provadorRelevantItems.map((item) => item.category)
            : vertexWearableItems.map((item) => item.category),
          approved: qc1.approved,
          weakestDimension: qcFailureDetails.weakestDimension,
          issues: qc1.issues,
        })
        if (!qc1.approved) {
          candidateAttempts.push(`${singlePhotoAttemptLabel}:qc-rejected`)
          extraData.retry_reason = qcFailureDetails.retryReason
          extraData.qc_failure_category = qcFailureDetails.category
          console.warn(
            `[studio] vertex single-photo qc rejected | weakest=${qcFailureDetails.weakestDimension ?? 'unknown'} critical_category=${qcFailureDetails.category ?? 'unknown'} issues=${qc1.issues.join(' | ') || 'none'}`,
          )
          if (!canUseSinglePhotoGeminiFallback) {
            failGuidedFittingWithAudit({
              message: buildSinglePhotoFailureMessage(qcFailureDetails.category),
              refundReason: 'guided:compose-single-look-auto-split-qc',
              failureKind: 'guided-fail-after-qc',
              retryReason: qcFailureDetails.retryReason,
              criticalCategory: qcFailureDetails.category,
              autoSplitFailedStage: 'vertex-qc',
            })
          }
          const geminiFallbackResult = await runSinglePhotoGeminiFallback({
            trigger: 'vertex-qc-reject',
            sourceIssues: qc1.issues,
            weakestDimension: qcFailureDetails.weakestDimension,
          })
          if (!geminiFallbackResult) {
            failGuidedFittingWithAudit({
              message: buildSinglePhotoFailureMessage(qcFailureDetails.category),
              refundReason: 'guided:compose-single-look-qc',
              failureKind: 'guided-fail-after-qc',
              retryReason: qcFailureDetails.retryReason,
              criticalCategory: qcFailureDetails.category,
            })
          }
          extraData.auto_recovery_attempted = true
          extraData.auto_recovery_succeeded = true
          approvedBase64 = geminiFallbackResult
        } else {
          candidateAttempts.push(`${singlePhotoAttemptLabel}:approved`)
          if (singlePhotoSequentialEligible) {
            extraData.auto_recovery_succeeded = true
          }
          approvedBase64 = singlePhotoResult.imageBase64
        }
      }
    } else {
      let batchAttempted = false

      if (multiRefBatchEligible) {
        batchAttempted = true
        extraData.auto_recovery_attempted = true
        extraData.fitting_generation_strategy = 'multi-ref-batch' satisfies FittingGenerationStrategy
        extraData.vertex_execution_path = 'multi-ref-batch'

        try {
          trackVertexCall('vertex-batch', vertexWearableItems.length)
          const batchResult = await callVertexVirtualTryOn({
            portraitBuffer: portraitVertexImage.buffer,
            portraitMimeType: portraitVertexImage.mimeType,
            items: vertexWearableItems,
            fittingRoute,
            executionMode: 'multi-ref-batch',
          })
          extraData.vertex_product_count_requested = batchResult.productCountRequested
          extraData.vertex_product_count_sent = batchResult.productCountSent
          extraData.vertex_prediction_count = batchResult.predictionCount
          extraData.vertex_batch_sent_all_items = batchResult.productCountSent === vertexWearableItems.length

          if (batchResult.imageBase64) {
            candidateAttempts.push(`${fittingRoute}:batch:generated`)
            const batchQc = await runWearableQualityCheck(batchResult.imageBase64, fittingRoute)
            logFittingQc({
              mode: referenceMode,
              route: fittingRoute,
              stage: 'vertex-batch',
              categories: vertexWearableItems.map((item) => item.category),
              approved: batchQc.approved,
              weakestDimension: getQcWeakestDimension(batchQc),
              issues: batchQc.issues,
            })
            if (batchQc.approved) {
              candidateAttempts.push(`${fittingRoute}:batch:approved`)
              approvedBase64 = batchResult.imageBase64
            } else {
              candidateAttempts.push(`${fittingRoute}:batch:qc-rejected`)
              extraData.retry_reason = getQcWeakestDimension(batchQc) ?? batchQc.issues[0] ?? 'vertex-batch-reject'
              extraData.vertex_batch_qc_weakest = getQcWeakestDimension(batchQc) ?? ''
              extraData.vertex_batch_qc_issues = batchQc.issues
              console.warn(
                `[studio] vertex batch qc rejected | weakest=${getQcWeakestDimension(batchQc) ?? 'unknown'} issues=${batchQc.issues.join(' | ') || 'none'}`,
              )
            }
          } else {
            candidateAttempts.push(`${fittingRoute}:batch:no-image`)
            console.warn('[studio] vertex batch returned no image, falling back to sequential mode')
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          candidateAttempts.push(`${fittingRoute}:batch:error`)
          extraData.vertex_batch_error = message
          console.warn(`[studio] vertex batch request failed, falling back to sequential mode | reason=${message}`)
        }
      }

      if (!approvedBase64) {
        extraData.fitting_generation_strategy = 'multi-ref-sequential' satisfies FittingGenerationStrategy
        extraData.vertex_execution_path = batchAttempted ? 'multi-ref-sequential-fallback' : 'multi-ref-sequential'
        if (batchAttempted) {
          fallbackBranchUsed = 'vertex-sequential-fallback'
        }
        extraData.vertex_sequence_categories = vertexWearableItems.map((item) => item.category)
        extraData.vertex_sequence_steps = vertexWearableItems.length
        if (batchAttempted) {
          console.warn(
            `[studio] vertex sequential fallback | steps=${vertexWearableItems.length} categories=${vertexWearableItems.map((item) => item.category).join(',')}`,
          )
        } else {
          console.warn(
            `[studio] vertex sequential primary | steps=${vertexWearableItems.length} categories=${vertexWearableItems.map((item) => item.category).join(',')}`,
          )
        }

        const sequentialResult = await runVertexTryOnSequence()
        extraData.vertex_product_count_requested = vertexWearableItems.length
        extraData.vertex_product_count_sent = sequentialResult.productCountSent
        extraData.vertex_prediction_count = sequentialResult.predictionCount

        if (!sequentialResult.imageBase64) {
          candidateAttempts.push(`${fittingRoute}:sequential:no-image`)
          throw new Error('Vertex VTO nao retornou imagem para o Provador no modo sequencial')
        }

        candidateAttempts.push(`${fittingRoute}:sequential:generated`)
        const qc2 = await runWearableQualityCheck(sequentialResult.imageBase64, fittingRoute)
        logFittingQc({
          mode: referenceMode,
          route: fittingRoute,
          stage: batchAttempted ? 'vertex-sequential-fallback' : 'vertex-sequential-primary',
          categories: vertexWearableItems.map((item) => item.category),
          approved: qc2.approved,
          weakestDimension: getQcWeakestDimension(qc2),
          issues: qc2.issues,
        })
        if (!qc2.approved) {
          candidateAttempts.push(`${fittingRoute}:sequential:qc-rejected`)
          extraData.retry_reason = getQcWeakestDimension(qc2) ?? qc2.issues[0] ?? 'vertex-sequential-reject'
          extraData.qc_failure_kind = 'guided-fail-after-qc'
          throw new Error(`Provador rejeitado no modo sequencial: ${qc2.issues.join(', ') || getQcWeakestDimension(qc2) || 'QC reprovado'}`)
        }

        candidateAttempts.push(`${fittingRoute}:sequential:approved`)
        if (batchAttempted) {
          extraData.auto_recovery_succeeded = true
        }
        approvedBase64 = sequentialResult.imageBase64
      }
    }

    if (!approvedBase64) {
      throw new Error('Nenhuma imagem aprovada foi retornada pelo Provador.')
    }
    const skipPostVertexPasses = referenceMode === 'single-look-photo' && singlePhotoGeminiFallbackApproved
    if (skipPostVertexPasses) {
      extraData.accessory_overlay_skipped_reason = 'single-photo-gemini-fallback-approved'
      extraData.editorial_qc_status = 'skipped_after_single_photo_gemini_fallback'
      candidateAttempts.push(`${fittingRoute}:post-processing:skipped-after-gemini-fallback`)
    }
    if (!skipPostVertexPasses && shouldShortCircuitEditorialFinisher) {
      candidateAttempts.push('editorial-finisher:skipped-strong-hybrid-approval')
    }
    if (!skipPostVertexPasses && !shouldShortCircuitEditorialFinisher && editorialFinisherEligible) {
      const editorialBase64 = await runEditorialFinisher(approvedBase64)
      if (editorialBase64 !== approvedBase64) {
        candidateAttempts.push('editorial-finisher:approved')
      } else if (extraData.editorial_finisher_attempted) {
        candidateAttempts.push('editorial-finisher:kept-base')
      }
      approvedBase64 = editorialBase64
    }
    extraData.final_qc_status = 'approved'
    finalizeProvadorAudit()
    resultBuffer = Buffer.from(approvedBase64, 'base64')
  }

  const path = `${params.userId}/compose-${params.assetId}.jpg`
  const { error: uploadErr } = await admin.storage
    .from('studio')
    .upload(path, resultBuffer, { contentType: 'image/jpeg', upsert: true })
  if (uploadErr) throw new Error(`Upload falhou: ${uploadErr.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  if (preparedContinuationItems.length > 0) {
    const continuationUrls = preparedContinuationItems
      .map((item) => {
        const sourceIndex = typeof item.sourceIndex === 'number' ? item.sourceIndex : -1
        return sourceIndex >= 0 ? referenceUrls[sourceIndex] ?? '' : ''
      })
      .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)

    if (continuationUrls.length > 0) {
      extraData.continuation_ready = true
      extraData.remaining_structural_categories = preparedContinuationItems.map((item) => item.category)
      extraData.continuation_reason = preparedContinuationReason || 'structural_continuation'
      extraData.continuation_params = {
        portrait_url: publicUrl,
        product_url: continuationUrls[0],
        product_urls: continuationUrls,
        compose_mode: 'gemini',
        compose_variant: 'fitting',
        position: params.position ?? 'southeast',
        product_scale: params.product_scale ?? 0.35,
        aspect_ratio: params.aspect_ratio ?? '9:16',
        fitting_group: 'wearables',
        fitting_category: preparedContinuationItems[0]?.category ?? params.fitting_category ?? params.vton_category ?? '',
        vton_category: preparedContinuationItems[0]?.category ?? params.vton_category ?? params.fitting_category ?? '',
        fitting_pose_preset: params.fitting_pose_preset ?? 'three-quarter',
        fitting_energy_preset: params.fitting_energy_preset ?? 'confiante',
        costume_prompt: '',
        smart_prompt: params.smart_prompt ?? '',
      }
    }
  }
  return { url: publicUrl, extraData }
}

export async function composeProductScene(params: {
  portrait_url:   string
  product_url:    string
  product_urls?:  string[]
  guided_overlay_references?: unknown[]
  compose_mode?:  string   // 'try-on' (default), 'overlay', 'prompt'
  compose_variant?: string
  position?:      string
  product_scale?: number
  aspect_ratio?:  string
  vton_category?: string
  fitting_category?: string
  fitting_group?: string
  fitting_pose_preset?: string
  fitting_energy_preset?: string
  costume_prompt?: string
  smart_prompt?:  string
  pricing_preflight?: ProvadorPricingPreflight
  assetId:        string
  userId:         string
}): Promise<ComposeSceneResult> {
  const admin  = createAdminClient()
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY nÃ£o configurada')

  let resultBuffer: Buffer
  const extraData: Record<string, unknown> = {}
  const composeVariant = params.compose_variant === 'product' ? 'product' : 'fitting'

  if (composeVariant === 'fitting') {
    return await composeSceneWhiteStudioFitting({
      portrait_url: params.portrait_url,
      product_url: params.product_url,
      product_urls: params.product_urls,
      guided_overlay_references: params.guided_overlay_references,
      aspect_ratio: params.aspect_ratio,
      vton_category: params.vton_category,
      fitting_pose_preset: params.fitting_pose_preset,
      fitting_energy_preset: params.fitting_energy_preset,
      fitting_category: params.fitting_category,
      smart_prompt: params.smart_prompt,
      assetId: params.assetId,
      userId: params.userId,
    })
  }

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
    if (!finalUrl) throw new Error('Flux Prompt nÃ£o retornou imagem vÃ¡lida.')

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
    
    if (!portraitRes.ok || !productRes.ok) throw new Error('Falha ao baixar imagens para composiÃ§Ã£o')

    const [portraitBuf, productBuf] = await Promise.all([
      portraitRes.arrayBuffer().then(b => Buffer.from(b)),
      productRes.arrayBuffer().then(b => Buffer.from(b)),
    ])

    // ---- VALIDAÃ‡ÃƒO DOS BUFFERS ----
    let portraitMeta = await sharp(portraitBuf).metadata().catch(() => null)
    if (!portraitMeta) throw new Error('Imagem da modelo invÃ¡lida ou corrompida')

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

    // ---- COMPOSIÃ‡ÃƒO FINAL (sombra atrÃ¡s + produto na frente) ----
    resultBuffer = await sharp(portraitBuf)
      .composite([
        // Sombra (ligeiramente deslocada para baixo-direita)
        { input: shadowBuf, ...(gravity ? { gravity } : { top: shadowTop, left: shadowLeft }), blend: 'multiply' },
        // Produto (posiÃ§Ã£o exata)
        { input: productResized, ...(gravity ? { gravity } : { top: compositeTop, left: compositeLeft }) }
      ])
      .jpeg({ quality: 95 })
      .toBuffer()

  } else if (params.compose_mode === 'gemini') {
    // ---- FUSÃƒO GEMINI NATIVA â€” Product-Aware Architecture ----
    const apiKey = (process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY)
    if (!apiKey) throw new Error('GOOGLE_API_KEY nÃ£o configurada')

    const [portraitRes, productRes] = await Promise.all([
      fetch(params.portrait_url),
      fetch(params.product_url),
    ])
    if (!portraitRes.ok || !productRes.ok)
      throw new Error('Falha ao baixar imagens para composiÃ§Ã£o Gemini')

    const [portraitBuf, productBuf] = await Promise.all([
      portraitRes.arrayBuffer().then(b => Buffer.from(b)),
      productRes.arrayBuffer().then(b => Buffer.from(b)),
    ])

    const profile = await classifyProduct(productBuf, apiKey)
    console.log(`[studio] product-profile | category=${profile.category} has_text=${profile.has_text_logo} risk=${profile.deformation_risk} complexity=${profile.shape_complexity} variant=${composeVariant}`)
    console.log(`[studio] key_features: ${profile.key_features.join(', ')}`)

    if (composeVariant === 'product' && profile.category === 'wearable') {
      throw new Error('Esse card Modelo + Produto e para produtos de demonstracao na mao. Para roupas ou itens de vestir, use o card Provador.')
    }

    if (composeVariant !== 'product') {
      throw new Error('compose_mode=gemini nao e mais suportado para o Provador. Use o fluxo dedicado de virtual try-on.')
    }

    const posePreset = composeVariant === 'product'
      ? getProductShowcasePosePreset(profile)
      : null
    const fittingCategory = inferFittingCategoryFromReference(
      profile,
      params.fitting_category ?? params.vton_category,
    )
    const fittingCategoryPreset = null
    const fittingPoseInstruction = null
    const fittingEnergyInstruction = null
    const ratioInstruction = getComposeAspectRatioInstruction(params.aspect_ratio)

    if (posePreset) {
      console.log(`[studio] product-showcase preset=${posePreset.name}`)
    }

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

    const normalizedPrompt = composeVariant === 'product'
      ? normalizeProductShowcasePrompt(params.smart_prompt)
      : normalizeFittingPrompt(params.smart_prompt)

    if (normalizedPrompt.removedDirectives.length > 0) {
      console.log(`[studio] ${composeVariant} prompt normalized | removed=${normalizedPrompt.removedDirectives.join(', ')}`)
    }

    const userIntent = composeVariant === 'product'
      ? normalizedPrompt.intent || PRODUCT_SHOWCASE_FALLBACK_INTENT
      : normalizedPrompt.intent || 'No extra refinement. Keep the exact client item fully faithful, clearly visible, and naturally fitted on the model.'

    const finalPrompt = buildProductShowcasePrompt(
      profile,
      posePreset?.instruction ?? PRODUCT_SHOWCASE_FALLBACK_INTENT,
      userIntent,
    )

    const COMPOSE_MODELS = [
      'gemini-2.5-flash-image',
      'gemini-3.1-flash-image-preview',
    ]

    const portraitPng = await normalizeImageToPng(portraitBuf)

    async function callGeminiCompose(
      promptText: string,
      referenceBuffer: Buffer,
      referenceMimeType: string,
    ): Promise<string | null> {
      const body = JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: '[BASE PHOTO] â€” preserve this person exactly:' },
            { inlineData: { mimeType: 'image/jpeg', data: portraitBuf.toString('base64') } },
            { text: '[PRODUCT] â€” place this into the base photo:' },
            { inlineData: { mimeType: referenceMimeType, data: referenceBuffer.toString('base64') } },
            { text: promptText },
          ],
        }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      })
      for (const model of COMPOSE_MODELS) {
        console.log(`[studio] Vertex compose trying: ${model}`)
        try {
          const res = await fetchGoogleGenerateContent({
            model,
            feature: 'compose_product_scene',
            body: JSON.parse(body),
          })
          if (!res.ok) { console.warn(`[studio] ${model} falhou (${res.status})`); continue }
          const json = await res.json()
          const parts = json.candidates?.[0]?.content?.parts ?? []
          const imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))
          if (imgPart?.inlineData?.data) {
            console.log(`[studio] Vertex compose OK | model=${model}`)
            return imgPart.inlineData.data as string
          }
          console.warn(`[studio] ${model} sem imagem | finishReason=${json.candidates?.[0]?.finishReason}`)
        } catch (e: any) {
          console.warn(`[studio] ${model} erro: ${e.message}`)
        }
      }
      return null
    }

    // Gemini para todos os produtos â€” 1 retry com prompt adaptado se QC reprovar
    const initialBase64 = await callGeminiCompose(finalPrompt, finalProductBuf, productMime)
    if (!initialBase64) throw new Error('Todos os modelos Gemini falharam na composiÃ§Ã£o')

    let currentBase64 = initialBase64
    resultBuffer = Buffer.from(currentBase64, 'base64')

    const qc1 = await assessCompositionQuality(params.product_url, currentBase64, profile, {
      variant: 'product',
    })
    console.log(`[compose-qc] route=gemini-product attempt=1 | approved=${qc1.approved} score=${qc1.score}`)
    if (!qc1.approved) {
      console.warn(`[compose-qc] REPROVADO | weakest=${qc1.weakest_dimension} | issues: ${qc1.issues.join(', ')}`)
      const retryBase64 = await callGeminiCompose(
        buildRetryPrompt(finalPrompt, qc1.issues, qc1.weakest_dimension, 'product'),
        finalProductBuf,
        productMime,
      )
      if (retryBase64) {
        const qc2 = await assessCompositionQuality(params.product_url, retryBase64, profile, {
          variant: 'product',
        })
        console.log(`[compose-qc] attempt=2 | approved=${qc2.approved} score=${qc2.score}`)
        if (qc2.approved) {
          currentBase64 = retryBase64
          resultBuffer = Buffer.from(currentBase64, 'base64')
        } else {
          console.warn(`[compose-qc] Retry PIOR que original â€” mantendo attempt=1`)
        }
      }
    } else {
      console.log(`[compose-qc] APROVADO | score=${qc1.score}`)
    }

  } else {
    throw new Error(`compose_mode=${params.compose_mode ?? 'unknown'} nao e suportado para este card. Use gemini, overlay ou prompt em Modelo + Produto.`)

    // ---- LEGACY / INATIVO NESTE CICLO ----
    // O Provador ativo retorna acima via composeSceneWhiteStudioFitting.
    // O trecho abaixo com IDM-VTON permanece apenas como referencia historica e nao atua como fallback.
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
  return { url: publicUrl, extraData }
}

// â”€â”€ Lip Sync â€” Fal AI SyncLabs 2.0 Pro (assÃ­ncrono via webhook) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function startLipsyncGeneration(params: {
  face_url:  string
  audio_url: string
  assetId:   string
  userId:    string
  appUrl:    string
  inputParamsPatch?: Record<string, unknown>
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
  await mergeAssetInputParams(admin, params.assetId, {
    face_url: params.face_url,
    audio_url: params.audio_url,
    prediction_id: request_id,
    provider: 'fal',
    engine: 'sync-lipsync',
    fal_model_path: 'fal-ai/sync-lipsync/v2/pro',
    ...(params.inputParamsPatch ?? {}),
  })
}

// â”€â”€ Animate â€” Fal AI Wan Motion (motion transfer real com vÃ­deo guia) â”€
export async function startAnimateGeneration(params: {
  portrait_image_url: string
  driving_video_url: string
  motion_prompt?: string
  assetId: string
  appUrl: string
  userId: string
}) {
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY nÃ£o configurada no servidor')
  if (!params.portrait_image_url) throw new Error('Imagem/retrato obrigatÃ³rio para imitar movimento')
  if (!params.driving_video_url) throw new Error('VÃ­deo de referÃªncia obrigatÃ³rio para imitar movimento')

  const admin = createAdminClient()
  const webhookUrl = `${params.appUrl}/api/studio/webhook?assetId=${params.assetId}&userId=${params.userId}`

  const configStr = await getStudioPrompt(admin, 'video_wan_motion_config', '{}')
  let config: Record<string, unknown> = {}
  try { config = JSON.parse(configStr) } catch { /* ignore */ }

  const falModelPath = 'fal-ai/wan-motion'
  const prompt = params.motion_prompt?.trim()
    || 'Transfer the body pose, gestures, camera movement, head movement, and facial expression from the driving video to the reference character. Preserve the reference character identity, outfit, proportions, lighting, and visual style. Avoid flicker, warping, extra limbs, distorted hands, face drift, and scene cuts.'

  const payload = {
    video_url: params.driving_video_url,
    image_url: params.portrait_image_url,
    prompt,
    adapt_motion: true,
    enhance_identity: true,
    acceleration: 'regular',
    video_quality: 'high',
    video_write_mode: 'balanced',
    webhook_url: webhookUrl,
    ...config,
  }

  const queueRes = await fetch(`https://queue.fal.run/${falModelPath}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  })

  if (!queueRes.ok) {
    const err = await queueRes.text()
    throw new Error(`Fal AI Wan Motion erro ao enfileirar: ${err}`)
  }

  const { request_id } = await queueRes.json()
  if (!request_id) throw new Error('Fal AI nÃ£o retornou request_id para animate')

  // Salva prediction_id para permitir webhook/sync manual sem custo extra.
  await admin.from('studio_assets')
    .update({
      input_params: {
        prediction_id: request_id,
        provider: 'fal',
        engine: 'wan-motion',
        fal_model_path: falModelPath,
        portrait_image_url: params.portrait_image_url,
        driving_video_url: params.driving_video_url,
        motion_prompt: prompt,
      }
    })
    .eq('id', params.assetId)
}

// â”€â”€ Join â€” Costura de vÃ­deos via FFmpeg (Fase 3) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

export async function startVeo3DirectGoogle(params: {
  source_image_url: string
  motion_prompt:    string
  model_prompt?:    string
  motion_prompt_raw?: string
  motion_prompt_normalized?: string
  removed_directives?: string[]
  video_lock_policy?: string
  scene_change_requested?: boolean
  scene_change_blocked?: boolean
  duration?:        number
  quality?:         string
  assetId:          string
  userId:           string
  prompt_override?: string
  generate_audio?: boolean
  strict_source_fidelity?: boolean
  source_visible_item_manifest?: string[]
  source_text_logo_lock?: boolean
  source_color_lock?: boolean
  inputParamsPatch?: Record<string, unknown>
}) {
  const hasVertex = !!process.env.GOOGLE_VERTEX_KEY && !!process.env.VERTEX_PROJECT_ID
  const hasDirectKey = !!(process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY)
  if (!hasVertex && !hasDirectKey) {
    throw new Error('Vertex AI (GOOGLE_VERTEX_KEY + VERTEX_PROJECT_ID) ou GOOGLE_API_KEY não configurados')
  }

  const admin = createAdminClient()

  // 1. Baixa imagem e converte para base64 (Vertex/Gemini não aceitam URLs externas)
  // Se for um vídeo (continuação), extraímos o frame agora mesmo
  let finalSourceUrl = params.source_image_url
  let imgBuffer: Buffer

  if (finalSourceUrl.toLowerCase().includes('.mp4')) {
    console.log(`[studio] Detectado vÃ­deo como origem para Veo3. Extraindo Ãºltimo frame...`)
    try {
      imgBuffer = await extractVideoFrame(finalSourceUrl)
    } catch (e) {
      console.error(`[studio] Falha ao extrair frame on-the-fly:`, e)
      throw new Error('NÃ£o foi possÃ­vel processar a continuaÃ§Ã£o: falha ao extrair frame do vÃ­deo anterior.')
    }
  } else {
    const imgRes = await fetch(finalSourceUrl)
    if (!imgRes.ok) throw new Error('Falha ao baixar imagem fonte para Veo3 Google')
    imgBuffer = Buffer.from(await imgRes.arrayBuffer())
  }

  const base64Image = imgBuffer.toString('base64')
  const mimeType = 'image/jpeg'
  const defaultMotionPrompt = await getStudioPrompt(admin, 'video_veo_default_prompt', VIDEO_MOTION_FALLBACK)
  const finalMotion = params.prompt_override
    ? params.prompt_override
    : prepareLockedVideoMotionPrompt({
      motionPrompt: params.motion_prompt || defaultMotionPrompt,
      modelPrompt: params.model_prompt,
      sourceAsset: {
        type: 'video_source_frame',
        input_params: {
          source_visible_item_manifest: params.source_visible_item_manifest ?? [],
          preserve_all_visible_source_items: true,
          product_urls: params.strict_source_fidelity ? ['strict'] : [],
          source_text_logo_lock: params.source_text_logo_lock ?? false,
          source_color_lock: params.source_color_lock ?? false,
        },
      },
    }).finalPrompt
  function resolveVeoResolution(model: string) {
    const requested = params.quality === '1080p' ? '1080p' : '720p'
    if (/^veo-3\.0(?:-fast)?-generate(?:-preview|-001)?$/i.test(model) && requested === '1080p') return '720p'
    return requested
  }

  const durationSeconds = 8

  const wantsAudio = params.generate_audio ?? false

  function uniqueModelList(models: Array<string | undefined>) {
    return models
      .map((model) => String(model ?? '').trim())
      .filter(Boolean)
      .filter((model, index, array) => array.indexOf(model) === index)
  }

  const primaryModel = wantsAudio
    ? (process.env.GOOGLE_VEO_AUDIO_MODEL ?? 'veo-3.1-generate-001')
    : (process.env.GOOGLE_VEO_SILENT_MODEL ?? 'veo-3.1-generate-001')

  const audioFallbackModels = wantsAudio
    ? uniqueModelList([
        process.env.GOOGLE_VEO_AUDIO_FALLBACK_MODEL,
        'veo-3.1-fast-generate-001',
        'veo-3.0-generate-001',
        'veo-3.0-fast-generate-001',
      ])
    : []

  async function requestVeoOperation(model: string, generateAudio: boolean) {
    const resolution = resolveVeoResolution(model)
    const parameters: Record<string, unknown> = {
      aspectRatio: '9:16',
      durationSeconds,
      resolution,
    }

    if (generateAudio) {
      parameters.generateAudio = true
    }

    try {
      const res = await fetchGooglePredictLongRunning({
        model,
        feature: 'video_generation',
        body: {
          instances: [{
            prompt: finalMotion,
            image: { bytesBase64Encoded: base64Image, mimeType },
          }],
          parameters,
        },
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        return { ok: false as const, status: res.status, errText }
      }

      const body = await res.json()
      return { ok: true as const, body }
    } catch (error: any) {
      const errText = error instanceof Error ? error.message : String(error)
      const status = (error && typeof error === 'object' && 'status' in error) ? Number(error.status) || 503 : 503
      return { ok: false as const, status, errText }
    }
  }

  let usedModel = primaryModel
  let operationResponse = await requestVeoOperation(primaryModel, wantsAudio)
  let audioDisabledFallbackReason = ''

  if (!operationResponse.ok && wantsAudio) {
    const fallbackReason = /generateAudio.+isn'?t supported by this model/i.test(operationResponse.errText)
      ? 'generateAudio_unsupported'
      : operationResponse.status === 404
        ? 'model_not_found'
        : operationResponse.status === 400 && /not found|unsupported/i.test(operationResponse.errText)
          ? 'invalid_model'
          : ''

    if (fallbackReason) {
      for (const fallbackAudioModel of audioFallbackModels) {
        if (fallbackAudioModel === usedModel) continue
        console.warn(
          `[studio] veo audio fallback | primary_model=${usedModel} fallback_model=${fallbackAudioModel} reason=${fallbackReason}`,
        )
        const fallbackResponse = await requestVeoOperation(fallbackAudioModel, true)
        if (fallbackResponse.ok) {
          usedModel = fallbackAudioModel
          operationResponse = fallbackResponse
          break
        }
        operationResponse = fallbackResponse
        usedModel = fallbackAudioModel
      }
    }

    if (!operationResponse.ok && fallbackReason) {
      console.warn(
        `[studio] veo audio disabled fallback | requested_model=${usedModel} reason=${fallbackReason}`,
      )
      const silentModel = process.env.GOOGLE_VEO_SILENT_MODEL ?? usedModel
      const silentResponse = await requestVeoOperation(silentModel, false)
      if (silentResponse.ok) {
        usedModel = silentModel
        operationResponse = silentResponse
        audioDisabledFallbackReason = fallbackReason
      }
    }
  }

  if (!operationResponse.ok) {
    console.error(`[Google AI Error] ${operationResponse.status}:`, operationResponse.errText)
    throw new Error(`Erro na API do Google (${operationResponse.status}): ${operationResponse.errText.slice(0, 300)}`)
  }

  const body = operationResponse.body
  const operationName = body.name
  const usedResolution = resolveVeoResolution(usedModel)
  if (!operationName) throw new Error('Google nÃ£o retornou o nome da operaÃ§Ã£o de vÃ­deo')

  await mergeAssetInputParams(admin, params.assetId, {
    prediction_id: operationName,
    provider: 'google',
    engine: 'veo',
    source_image_url: params.source_image_url,
    motion_prompt: params.motion_prompt_raw ?? params.motion_prompt,
    motion_prompt_raw: params.motion_prompt_raw ?? params.motion_prompt,
    motion_prompt_normalized: params.motion_prompt_normalized ?? params.motion_prompt,
    video_lock_policy: params.video_lock_policy ?? VIDEO_LOCK_POLICY,
    scene_change_requested: params.scene_change_requested ?? false,
    scene_change_blocked: params.scene_change_blocked ?? false,
    removed_directives: params.removed_directives ?? [],
    quality: usedResolution,
    quality_requested: params.quality,
    generate_audio: audioDisabledFallbackReason ? false : wantsAudio,
    audio_generation_fallback_reason: audioDisabledFallbackReason || undefined,
    source_fidelity_mode: params.strict_source_fidelity ? 'strict' : 'best_effort',
    source_visible_item_manifest: params.source_visible_item_manifest ?? [],
    source_text_logo_lock: params.source_text_logo_lock ?? false,
    source_color_lock: params.source_color_lock ?? false,
    veo_model: usedModel,
    duration: durationSeconds,
    ...(params.inputParamsPatch ?? {}),
  })

  return operationName;
}

// â”€â”€ Image-to-Image (Angles / Poses) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function classifyTalkingVideoGoogleFallbackReason(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (!/Erro na API do Google \((403|429)\)/i.test(message)) return ''
  if (/PERMISSION_DENIED/i.test(message)) return 'google_permission_denied'
  if (/RESOURCE_EXHAUSTED/i.test(message)) return 'google_resource_exhausted'
  if (/quota|quota exceeded/i.test(message)) return 'google_quota_exceeded'
  return 'google_retryable_provider_error'
}

export async function startTalkingVideoMotionGeneration(params: TalkingVideoMotionStartParams) {
  const providerChain: string[] = ['google:veo-direct']
  const basePatch = params.inputParamsPatch ?? {}

  try {
    await startVeo3DirectGoogle({
      ...params,
      inputParamsPatch: {
        ...basePatch,
        motion_provider_chain: providerChain,
        motion_provider_fallback_used: false,
      },
    })
    return { provider: 'google:veo-direct', motionProviderChain: providerChain, usedFallback: false as const }
  } catch (error: unknown) {
    const fallbackReason = classifyTalkingVideoGoogleFallbackReason(error)
    if (!fallbackReason) throw error

    const fallbackProviders: Array<{ label: string; engine?: string }> = [
      { label: 'fal:veo', engine: 'veo' },
      { label: 'fal:kling', engine: 'kling' },
    ]
    let lastFallbackError: unknown = error

    for (const provider of fallbackProviders) {
      providerChain.push(provider.label)
      try {
        await startVideoGeneration({
          source_image_url: params.source_image_url,
          motion_prompt: params.motion_prompt,
          duration: Number(params.duration ?? 8),
          model_prompt: params.model_prompt,
          motion_prompt_raw: params.motion_prompt_raw,
          motion_prompt_normalized: params.motion_prompt_normalized,
          removed_directives: params.removed_directives,
          video_lock_policy: params.video_lock_policy,
          scene_change_requested: params.scene_change_requested,
          scene_change_blocked: params.scene_change_blocked,
          strict_source_fidelity: params.strict_source_fidelity,
          source_visible_item_manifest: params.source_visible_item_manifest,
          source_text_logo_lock: params.source_text_logo_lock,
          source_color_lock: params.source_color_lock,
          engine: provider.engine,
          assetId: params.assetId,
          userId: params.userId,
          appUrl: params.appUrl,
          inputParamsPatch: {
            ...basePatch,
            motion_provider_chain: providerChain,
            motion_provider_fallback_used: true,
            motion_provider_fallback_reason: fallbackReason,
          },
        })
        return { provider: provider.label, motionProviderChain: providerChain, usedFallback: true as const }
      } catch (fallbackError: unknown) {
        lastFallbackError = fallbackError
      }
    }

    throw lastFallbackError
  }
}

export async function finalizeTalkingVideoBaseGeneration(params: {
  admin?: ReturnType<typeof createAdminClient>
  assetId: string
  userId: string
  finalUrl: string
  appUrl: string
  currentInputParams: Record<string, unknown>
}): Promise<TalkingVideoFinalizeResult> {
  const admin = params.admin ?? createAdminClient()
  let currentInputParams = asStudioRecord(params.currentInputParams)
  const talkingMode = typeof currentInputParams.talking_video_mode === 'string' ? currentInputParams.talking_video_mode : 'exact_speech'
  const generatedVoiceUrl = typeof currentInputParams.generated_voice_url === 'string'
    ? currentInputParams.generated_voice_url
    : ''
  const lastFrameUrl = await saveLastFrame(params.finalUrl, params.userId, params.assetId) || params.finalUrl
  const pipelineStage = typeof currentInputParams.pipeline_stage === 'string' ? currentInputParams.pipeline_stage : ''
  const strictSourceFidelity = String(currentInputParams.source_fidelity_mode ?? '') === 'strict'
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY

  if (strictSourceFidelity && apiKey) {
    const sourceFrameUrl = typeof currentInputParams.source_image_url === 'string' && currentInputParams.source_image_url.trim().length > 0
      ? currentInputParams.source_image_url
      : ''
    const fidelityAudit = await auditGeneratedVideoFrameFidelity({
      apiKey,
      sourceImageUrl: sourceFrameUrl,
      generatedFrameUrl: lastFrameUrl,
      visibleItemManifest: Array.isArray(currentInputParams.source_visible_item_manifest)
        ? currentInputParams.source_visible_item_manifest.filter((value): value is string => typeof value === 'string')
        : [],
      requireExactTextLogo: Boolean(currentInputParams.source_text_logo_lock),
      requireExactColor: Boolean(currentInputParams.source_color_lock),
    })
    const fidelityRetryCount = Number(currentInputParams.fidelity_retry_count ?? 0)

    if (!fidelityAudit.approved) {
      if (fidelityRetryCount < 1) {
        const retryPrompt = [
          String(currentInputParams.talking_video_prompt_final ?? currentInputParams.visual_prompt_normalized ?? currentInputParams.visual_prompt ?? ''),
          'CRITICAL FIDELITY RETRY: preserve the source frame literally and keep branding perfectly identical.',
          'Do not alter product text, logo, label, packaging copy, product color, text color, or visible product shape.',
          `Mandatory fixes from the fidelity audit: ${fidelityAudit.blockingIssues.join('; ')}.`,
        ].filter(Boolean).join(' ')

        currentInputParams = {
          ...currentInputParams,
          fidelity_retry_count: fidelityRetryCount + 1,
          fidelity_retry_reason: fidelityAudit.blockingIssues.join('; '),
          fidelity_warning: false,
          fidelity_blocking_issues: fidelityAudit.blockingIssues,
          fidelity_warning_issues: fidelityAudit.warningIssues,
          fidelity_audit_notes: fidelityAudit.notes,
        }

        await admin.from('studio_assets').update({
          status: 'processing',
          error_msg: null,
          input_params: currentInputParams,
        }).eq('id', params.assetId)

        await startTalkingVideoMotionGeneration({
          source_image_url: sourceFrameUrl,
          motion_prompt: String(currentInputParams.visual_prompt_normalized ?? currentInputParams.visual_prompt ?? ''),
          model_prompt: typeof currentInputParams.model_prompt === 'string' ? currentInputParams.model_prompt : undefined,
          motion_prompt_raw: String(currentInputParams.visual_prompt_raw ?? currentInputParams.visual_prompt ?? ''),
          motion_prompt_normalized: String(currentInputParams.visual_prompt_normalized ?? currentInputParams.visual_prompt ?? ''),
          prompt_override: retryPrompt,
          removed_directives: Array.isArray(currentInputParams.removed_directives)
            ? currentInputParams.removed_directives.filter((value): value is string => typeof value === 'string')
            : [],
          video_lock_policy: typeof currentInputParams.video_lock_policy === 'string' ? currentInputParams.video_lock_policy : '',
          scene_change_requested: false,
          scene_change_blocked: false,
          duration: Number(currentInputParams.duration ?? 8),
          quality: String(currentInputParams.quality ?? currentInputParams.quality_requested ?? '720p'),
          assetId: params.assetId,
          userId: params.userId,
          appUrl: params.appUrl,
          generate_audio: false,
          strict_source_fidelity: true,
          source_visible_item_manifest: Array.isArray(currentInputParams.source_visible_item_manifest)
            ? currentInputParams.source_visible_item_manifest.filter((value): value is string => typeof value === 'string')
            : [],
          source_text_logo_lock: Boolean(currentInputParams.source_text_logo_lock),
          source_color_lock: Boolean(currentInputParams.source_color_lock),
          inputParamsPatch: {
            fidelity_retry_count: fidelityRetryCount + 1,
            fidelity_retry_reason: fidelityAudit.blockingIssues.join('; '),
            fidelity_warning: false,
            fidelity_blocking_issues: fidelityAudit.blockingIssues,
            fidelity_warning_issues: fidelityAudit.warningIssues,
            fidelity_audit_notes: fidelityAudit.notes,
            pipeline_stage: 'veo_generating',
          },
        })

        return {
          status: 'processing',
          message: 'Refazendo o video para preservar o produto com fidelidade total...',
        }
      }

      await markStudioAssetFailed({
        admin,
        assetId: params.assetId,
        errorMsg: `Nao conseguimos preservar o produto com fidelidade suficiente: ${fidelityAudit.blockingIssues.join(', ')}`,
        refundReason: 'sync:video-source-fidelity-failed',
        extraInputParams: {
          fidelity_warning: true,
          fidelity_blocking_issues: fidelityAudit.blockingIssues,
          fidelity_warning_issues: fidelityAudit.warningIssues,
          fidelity_audit_notes: fidelityAudit.notes,
        },
        publicErrorCode: 'nao_conseguimos_preservar_a_referencia',
        publicErrorTitle: 'Nao conseguimos preservar a referencia',
        publicErrorMessage: 'Nao conseguimos manter o produto e o branding com fidelidade suficiente neste video. Tente novamente e vamos priorizar a referencia original.',
      })
      return {
        status: 'error',
        error: 'Nao conseguimos preservar a referencia com fidelidade suficiente.',
      }
    }

    currentInputParams = {
      ...currentInputParams,
      fidelity_warning: fidelityAudit.warningIssues.length > 0,
      fidelity_blocking_issues: [],
      fidelity_warning_issues: fidelityAudit.warningIssues,
      fidelity_audit_notes: fidelityAudit.notes,
    }
    await admin.from('studio_assets').update({
      input_params: currentInputParams,
    }).eq('id', params.assetId)
  }

  if (pipelineStage === 'veo_generating' && generatedVoiceUrl) {
    const pipelineAttempts = incrementTalkingPipelineAttempts(currentInputParams.pipeline_attempts, 'lipsyncing')
    await admin.from('studio_assets').update({
      status: 'processing',
      result_url: params.finalUrl,
      last_frame_url: lastFrameUrl || params.finalUrl,
      error_msg: null,
      input_params: {
        ...currentInputParams,
        intermediate_video_url: params.finalUrl,
        pipeline_stage: 'lipsyncing',
        pipeline_attempts: pipelineAttempts,
      },
    }).eq('id', params.assetId)

    await startLipsyncGeneration({
      face_url: params.finalUrl,
      audio_url: generatedVoiceUrl,
      assetId: params.assetId,
      userId: params.userId,
      appUrl: params.appUrl,
      inputParamsPatch: {
        intermediate_video_url: params.finalUrl,
        pipeline_stage: 'lipsyncing',
        pipeline_attempts: pipelineAttempts,
      },
    })

    return {
      status: 'processing',
      message: 'Veo pronto. Iniciando lipsync...',
      resultUrl: params.finalUrl,
    }
  }

  if (talkingMode === 'exact_speech' && pipelineStage === 'veo_generating') {
    await markStudioAssetFailed({
      admin,
      assetId: params.assetId,
      errorMsg: 'Audio interno nao encontrado para iniciar o lipsync do talking video.',
      refundReason: 'sync:talking-video-missing-audio',
    })
    return {
      status: 'error',
      error: 'Audio interno nao encontrado para o talking video.',
    }
  }

  await admin.from('studio_assets').update({
    status: 'done',
    result_url: params.finalUrl,
    last_frame_url: lastFrameUrl || params.finalUrl,
    error_msg: null,
    input_params: {
      ...currentInputParams,
      pipeline_stage: 'completed',
    },
  }).eq('id', params.assetId)

  return {
    status: 'done',
    resultUrl: params.finalUrl,
  }
}

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
  if (!googleApiKey) throw new Error('GOOGLE_API_KEY nÃ£o configurada no servidor')

  // 1. Download base image (Garantindo que seja IMAGEM e nÃ£o VÃDEO)
  if (!params.source_url || !params.source_url.startsWith('http')) {
    throw new Error('URL da imagem fonte invÃ¡lida para o Imagen')
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
    // Busca descriÃ§Ã£o original se vier de um NÃ³ de Modelo ou Compose
    const { data: sourceAsset } = await admin
      .from('studio_assets')
      .select('input_params')
      .eq('result_url', params.source_url)
      .maybeSingle()
    
    if (sourceAsset?.input_params?.model_text) {
      sourceDescription = String(sourceAsset.input_params.model_text)
    }

    const visionRes = await fetchGoogleGenerateContent({
      model: 'gemini-2.5-flash',
      feature: 'angles_gender_detection',
      body: {
        contents: [{
          parts: [
            { text: "Just one word: Is the person in this image Male or Female?" },
            { inlineData: { mimeType, data: base64Image } }
          ]
        }]
      },
    })
    const visionData = await visionRes.json()
    const text = visionData.candidates?.[0]?.content?.parts?.[0]?.text?.toLowerCase() || ''
    if (text.includes('female') || text.includes('woman')) detectedGender = 'woman'
    else if (text.includes('male') || text.includes('man')) detectedGender = 'man'
  } catch (e) {
    console.warn('[studio] Falha na auto-detencao de genero:', e)
  }

  // Se tivermos a descriÃ§Ã£o original, ela vira um reforÃ§o imbatÃ­vel no prompt
  const traits = sourceDescription 
    ? `Exactly this person: ${sourceDescription}. `
    : `A ${detectedGender} model. `

  const prompt = `${traits} Maintain EXACT identity, EXACT same clothes, hair color, and facial features. Switch camera to ${params.angle} view. Full consistency of the ${detectedGender} is mandatory. Photorealistic. ${perspective}. 8k resolution, cinematic lighting.`

  console.log(`[studio] Gerando Angulo [${engine}] para asset ${params.assetId}. URL: ${params.source_url.slice(0, 50)}...`)

  let photoBuffer: Buffer | null = null

  const { data: fallbackSet } = await admin.from('studio_prompts').select('value').eq('key', 'angles_fallback_active').single()
  const allowFallback = fallbackSet?.value === 'true'

  if (engine === 'google') {
    // Gemini 3 Pro Image â†’ Gemini 3.1 Flash Image (fallback)
    const aspectLabel: Record<string, string> = { '9:16': 'vertical 9:16 portrait', '1:1': 'square 1:1', '4:5': 'vertical 4:5 portrait', '16:9': 'horizontal 16:9 landscape', '3:4': 'vertical 3:4 portrait' }
    const ratioInstruction = `Compose the output image in ${aspectLabel[geminiAspectRatio] ?? 'vertical 9:16 portrait'} format. Ensure the full body fits within the frame without cropping.`

    const geminiPrompt = [
      `You are a professional photo director. You receive a photo of a ${detectedGender} and must output a NEW photorealistic photo of the SAME person from a different camera angle.`,
      `CHANGE ONLY: the camera angle to "${params.angle}" view â€” ${perspective}.`,
      `PRESERVE EXACTLY: same face, same facial features, same skin tone, same hair color and style, same outfit and every clothing item with exact colors, patterns and details, same body proportions.`,
      ratioInstruction,
      `Output: photorealistic commercial photo, shot on film, shot on Hasselblad H6D, Zeiss Otus 85mm f/1.4 lens, Kodak Portra 400, film grain, natural depth of field, white or neutral background, no watermarks.`,
    ].join(' ')

    const geminiChain = ['gemini-3-pro-image-preview', 'gemini-3.1-flash-image-preview']
    let geminiSuccess = false

    for (const model of geminiChain) {
      try {
        console.log(`[angles] Tentando ${model} via Vertex angle=${params.angle}`)
        const res = await fetchGoogleGenerateContent({
          model,
          feature: 'angles_generation',
          body: {
            contents: [{ role: 'user', parts: [
              { text: geminiPrompt },
              { inlineData: { mimeType, data: base64Image } },
            ]}],
            generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
          },
        })
        if (!res.ok) throw new Error(`${model}: ${res.status} ${await res.text()}`)
        const data = await res.json()
        const parts = data.candidates?.[0]?.content?.parts ?? []
        const imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))
        if (!imgPart?.inlineData?.data) throw new Error(`${model} sem imagem | reason=${data.candidates?.[0]?.finishReason}`)
        photoBuffer = Buffer.from(imgPart.inlineData.data, 'base64')
        console.log(`[angles] Vertex sucesso: ${model}`)
        geminiSuccess = true
        break
      } catch (e: any) {
        console.warn(`[angles] ${model} falhou: ${e.message}`)
      }
    }

    if (!geminiSuccess) throw new Error('Todos os modelos Vertex Gemini falharam para angles.')
  } else {
    // ---- FLUX DEV (IMAGE-TO-IMAGE) - OPTIMIZED FOR IDENTITY ----
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
        prompt: `${prompt} â€” camera angle change ONLY. Do NOT alter any clothing, outfit, hair color, face, or accessories. Preserve every visual detail from the source image.`,
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
    if (!imageUrl) throw new Error('NÃ£o foi possÃ­vel obter a URL da nova imagem (Flux)')

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
    // Tenta limpar possÃ­veis erros de escape no JSON vindo de ENV
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
    if (!token.token) throw new Error('Token vindo do Google estÃ¡ vazio. Verifique permissÃµes da IA.')
    return token.token
  } catch (e: any) {
    console.error('[studio] ERRO CRÃTICO NO TOKEN VERTEX:', e)
    throw new Error(`Erro AutenticaÃ§Ã£o Vertex: ${e.message}`)
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
  if (!googleApiKey) throw new Error('GOOGLE_API_KEY nÃ£o configurada no servidor')

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

  if (!audioData) throw new Error('Lyria 3 nÃ£o retornou Ã¡udio')

  const path = `${params.userId}/${params.assetId}-audio.mp3`
  const admin = createAdminClient()
  await admin.storage.from('studio').upload(path, audioData, { contentType: 'audio/mpeg', upsert: true })
  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return publicUrl
}

export async function generateMusicGoogle(params: {
  userId: string
  assetId: string
  prompt: string
  source_image_url?: string
}) {
  const vertexKey = process.env.GOOGLE_VERTEX_KEY
  if (!vertexKey) throw new Error('GOOGLE_VERTEX_KEY nao configurada')

  const projectId = process.env.VERTEX_PROJECT_ID || 'project-9e7b4eec-0111-46d8-ae0'
  const location = process.env.VERTEX_LOCATION || 'us-central1'
  const vertexToken = await getVertexAccessToken(vertexKey)
  const response = await fetch(`https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/lyria-002:predict`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${vertexToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{
        prompt: params.prompt,
      }],
      parameters: {
        sample_count: 1,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Vertex Lyria erro (${response.status}): ${await response.text()}`)
  }

  const payload = await response.json()
  const prediction = payload.predictions?.[0]
  const audioContent = prediction?.audioContent
  const mimeType = typeof prediction?.mimeType === 'string' ? prediction.mimeType : 'audio/wav'
  if (!audioContent) throw new Error('Vertex Lyria nao retornou audioContent.')

  const extension = mimeType.includes('wav') ? 'wav' : 'bin'
  const path = `${params.userId}/${params.assetId}-audio.${extension}`
  const admin = createAdminClient()
  const { error } = await admin.storage
    .from('studio')
    .upload(path, Buffer.from(audioContent, 'base64'), { contentType: mimeType, upsert: true })
  if (error) throw new Error(`Upload musica falhou: ${error.message}`)

  const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
  return publicUrl
}

// â”€â”€ UGC Poses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const UGC_POSITIONS = {
  rosto_close: {
    prompt: `Extreme close-up portrait, face filling the frame, looking directly at camera, natural smile, soft studio background. Hands NOT visible.`,
    description: 'Close-up rosto - mÃ¡xima emoÃ§Ã£o'
  },
  rosto_lado: {
    prompt: `Side profile portrait, face turned 90 degrees, looking forward with calm expression, hair visible, clean neutral background. Hands NOT visible.`,
    description: 'Perfil rosto - elegÃ¢ncia'
  },
  meia_pose_cta: {
    prompt: `Medium shot waist-up, one hand extended toward camera with open palm gesture, other hand relaxed at side, smiling at camera, white studio background, professional lighting. Exactly 2 hands total, no extra limbs.`,
    description: 'Meia pose CTA - chamada'
  },
  corpo_inteiro_pe: {
    prompt: `Full body standing shot, confident posture, right hand on hip, left arm hanging naturally at side with hand fully visible, natural smile, plain white minimalist background. Both arms fully visible, anatomically correct.`,
    description: 'Corpo inteiro - confianÃ§a'
  },
  corpo_inteiro_sentada: {
    prompt: `Full body sitting on a simple modern stool, relaxed pose, legs crossed naturally, looking at camera, warm neutral background. Hands resting naturally on lap. No objects on the stool. Exactly 2 hands.`,
    description: 'Corpo inteiro sentada - casual'
  },
  movimento_dinamica: {
    prompt: `Dynamic movement shot, walking confidently forward, hair flowing naturally, arms swinging naturally at sides in walking motion, energetic expression, modern urban background. Exactly 2 arms, 2 hands.`,
    description: 'Movimento dinÃ¢mico - energia'
  },
  plano_americano: {
    prompt: `American plan shot waist-up, arms crossed over chest, natural confident expression, modern glass office background. Exactly 2 arms crossed. No extra hands or limbs.`,
    description: 'Plano americano - profissional'
  },
  detalhe_expressao: {
    prompt: `Three-quarter shot, hands gently touching face or hair in natural casual gesture, genuine expressive smile, soft bokeh background, cinematic natural lighting. Exactly 2 hands, no floating limbs, no invented objects.`,
    description: 'ExpressÃ£o natural - autenticidade'
  }
}

export async function splitLookReferences(params: {
  source_url: string
  smart_prompt?: string
  assetId: string
  userId: string
}): Promise<LookSplitResult> {
  const admin = createAdminClient()
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_API_KEY nao configurada para Separar Look')
  if (!params.source_url?.startsWith('http')) throw new Error('URL da imagem de origem invalida para Separar Look')

  console.log(`[studio] look-split request | source_url=provided note=${params.smart_prompt?.trim() ? 'yes' : 'no'}`)

  const sourceRes = await fetch(params.source_url)
  if (!sourceRes.ok) throw new Error('Nao foi possivel baixar a foto enviada para Separar Look')
  const sourceBuffer = Buffer.from(await sourceRes.arrayBuffer())

  let cleanedBuffer = sourceBuffer
  const falKey = process.env.FAL_KEY
  if (falKey) {
    try {
      const bgRes = await fetch('https://fal.run/fal-ai/bria/background-removal', {
        method: 'POST',
        headers: {
          Authorization: `Key ${falKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_url: params.source_url }),
      })
      if (bgRes.ok) {
        const bgData = await bgRes.json()
        const cleanUrl = bgData.image?.url as string | undefined
        if (cleanUrl) {
          const cleanRes = await fetch(cleanUrl)
          if (cleanRes.ok) {
            cleanedBuffer = Buffer.from(await cleanRes.arrayBuffer())
          }
        }
      }
    } catch (error) {
      console.warn('[studio] look-split background removal fallback | reason=bria-failed', error)
    }
  }

  const segmented = await segmentProductReference(cleanedBuffer, apiKey)
  const requestedCategories = extractLookSplitRequestedCategories(params.smart_prompt)
  const requestedAccessoryCategories = requestedCategories.filter((category) => !isStructuralBodyCategory(category))

  if (segmented.items.length > 3) {
    throw new Error('Encontramos mais de 3 produtos relevantes nessa foto. Para preservar a originalidade de todos, envie uma foto com ate 3 itens ou separe em mais de uma imagem.')
  }

  const selectedLook = selectFittingItemsForLook(segmented.items, 3, {
    preferredCategories: requestedCategories,
    includeAccessoryCategories: requestedAccessoryCategories,
  })
  const selectedItems = selectedLook.items

  if (selectedLook.omittedCount > 0) {
    throw new Error('Encontramos mais de 3 produtos relevantes nessa foto. Para preservar a originalidade de todos, envie uma foto com ate 3 itens ou separe em mais de uma imagem.')
  }

  if (selectedItems.length === 0) {
    throw new Error('Nao conseguimos separar o look com seguranca a partir desta foto. Envie uma imagem mais limpa ou referencias individuais.')
  }

  console.log(`[studio] look-split detected | count=${segmented.items.length} categories=${segmented.items.map((item) => item.category).join(',')}`)
  console.log(`[studio] look-split selected | count=${selectedItems.length} categories=${selectedItems.map((item) => item.category).join(',')} requested=${requestedCategories.join(',') || 'auto'}`)

  const { normalizedBuffer, maskRaw, width, height } = await buildForegroundMaskArtifacts(cleanedBuffer)
  const uploadedReferences: LookSplitReference[] = []

  for (let index = 0; index < selectedItems.length; index += 1) {
    const item = selectedItems[index]
    const transparentCrop = await cropTransparentSegmentedItem(normalizedBuffer, maskRaw, width, height, item.bbox)
    const path = `${params.userId}/${params.assetId}-look-split-${index + 1}.png`
    const { error: uploadError } = await admin.storage
      .from('studio')
      .upload(path, transparentCrop.imageBuffer, { contentType: 'image/png', upsert: true })

    if (uploadError) {
      throw new Error(`Falha ao salvar referencia separada ${index + 1}: ${uploadError.message}`)
    }

    const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
    uploadedReferences.push({
      category: item.category,
      url: publicUrl,
      rank: index + 1,
      zone: getFittingZone(item.category),
      description: item.description,
    })
  }

  if (uploadedReferences.length === 0) {
    throw new Error('Nao conseguimos separar o look com seguranca a partir desta foto. Envie uma imagem mais limpa ou referencias individuais.')
  }

  return {
    url: uploadedReferences[0].url,
    extraData: {
      split_references: uploadedReferences,
      detected_categories: segmented.items.map((item) => item.category),
      selected_categories: uploadedReferences.map((reference) => reference.category),
      selected_item_zones: uploadedReferences.map((reference) => reference.zone),
      omitted_item_count: selectedLook.omittedCount,
      split_reference_count: uploadedReferences.length,
      split_strategy: requestedAccessoryCategories.length > 0 ? 'faithful-segmentation-guided-accessories' : 'faithful-segmentation-garments-first',
      split_note_mode: requestedCategories.length > 0 ? 'guided-selection' : (params.smart_prompt?.trim() ? 'note-without-category-match' : 'none'),
    },
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
  if (!imgRes.ok) throw new Error('Falha ao baixar imagem base para posiÃ§Ãµes UGC')
  
  const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'
  const buffer = Buffer.from(await imgRes.arrayBuffer())
  const base64 = buffer.toString('base64')

  const vertexKey = process.env.GOOGLE_VERTEX_KEY
  if (!vertexKey) throw new Error('GOOGLE_VERTEX_KEY nÃ£o encontrada nas variÃ¡veis de ambiente.')

  // Tenta extrair o Project ID de dentro do JSON da chave se nÃ£o houver ENV especÃ­fica
  let projectId = process.env.VERTEX_PROJECT_ID
  if (!projectId) {
     try {
       const keyData = JSON.parse(vertexKey.startsWith('"') ? JSON.parse(vertexKey) : vertexKey)
       projectId = keyData.project_id
     } catch (e) {
       console.warn('[studio] NÃ£o foi possÃ­vel extrair ProjectID da chave JSON')
     }
  }
  
  // Fallback final inseguro removido por segunranÃ§a. ForÃ§amos o erro se nÃ£o achar.
  if (!projectId) throw new Error('VERTEX_PROJECT_ID nÃ£o configurado e nÃ£o foi possÃ­vel detectar pela chave JSON.')

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
            prompt: `IDENTITY LOCK â€” person[1] is the sole reference. Generate ONE single high-resolution commercial photograph.

RULE 1 â€” FACIAL & BODY IDENTITY (non-negotiable): This is a CLONING task. Reproduce person[1] with 100% fidelity: exact facial bone structure, exact nose shape, exact lip shape, exact eye shape and color, exact eyebrow shape, exact skin tone and texture, exact age appearance, exact hair cut and length, exact hair color. Both eyes symmetrical and correctly aligned. The generated person must be indistinguishable from person[1]. Do NOT make them younger, thinner, prettier or different in any way.

RULE 2 â€” OUTFIT FIDELITY (non-negotiable): The outfit must be pixel-perfect identical to person[1]: exact garment type, exact color, exact fabric texture, exact neckline, exact straps, exact fit. Do NOT add, remove or change any clothing item.

RULE 2B â€” NO INVENTED OBJECTS: Do NOT add any product, object, prop or accessory NOT visible in person[1]. Empty hands stay empty. No bottles, no packages, no devices.

RULE 3 â€” UNIFIED COMPOSITION & ANATOMY (critical): ONE single photograph only. Both arms must be fully visible and anatomically correct â€” no arm disappearing behind body, no merged limbs, no floating hands. Exactly 2 arms, 2 hands, 5 fingers each. Verify arm visibility before finalizing.

RULE 4 â€” DYNAMIC POSE EXECUTION: Execute exactly â€” ${posConfig.prompt}

RULE 5 â€” SCENE & LIGHTING: Follow the scene context described in the pose. Cinematic commercial studio lighting, natural depth of field, soft bokeh.

RULE 6 â€” CAMERA & QUALITY BOOSTERS (critical): Shot on Hasselblad H6D, Zeiss Otus 85mm f/1.4 lens, Kodak Portra 400, film grain, natural depth of field, hyper-realistic, 8k. Shot on film. No external borders, no watermarks, no text overlay.

FINAL CHECK â€” ABSOLUTE PROHIBITIONS: NO bottles, NO cans, NO skincare products, NO supplements, NO packages, NO props, NO objects in hands unless already in person[1]. NO outfit changes â€” clothing must be 100% identical to person[1]. NO jacket, NO coat, NO added accessories not present in person[1].`,
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

// â”€â”€ Cena Livre â€” coloca o modelo em qualquer ambiente descrito â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function generateScene(params: {
  source_url: string
  extra_source_urls?: string[]
  scene_prompt: string
  aspect_ratio?: string
  assetId: string
  userId: string
  mode?: 'generic' | 'talking_video'
  requested_scene_change?: boolean
  requested_wardrobe_change?: boolean
  source_visible_item_manifest?: string[]
  require_exact_text_logo?: boolean
  require_exact_color?: boolean
}) {
  const admin = createAdminClient()
  const googleApiKey = (process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY)
  if (!googleApiKey) throw new Error('GOOGLE_API_KEY nÃ£o configurada no servidor')

  if (!params.source_url?.startsWith('http')) throw new Error('URL da imagem fonte invÃ¡lida')

  // Download da imagem principal + extras (atÃ© 2 extras)
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
  const talkingVideoMode = params.mode === 'talking_video'
  const visibleItemManifest = dedupeNormalizedStrings(params.source_visible_item_manifest ?? []).slice(0, 16)
  const approvedChangeSummary = params.requested_scene_change && params.requested_wardrobe_change
    ? 'Approved changes: background/environment and wardrobe only.'
    : params.requested_scene_change
      ? 'Approved changes: background/environment only.'
      : params.requested_wardrobe_change
        ? 'Approved changes: wardrobe/clothing only.'
        : 'Approved changes: no visual redesign beyond fidelity-preserving cleanup.'
  const visibleItemInstruction = visibleItemManifest.length > 0
    ? `Mandatory visible items to preserve exactly: ${visibleItemManifest.join(', ')}.`
    : ''

  const aspectLabel: Record<string, string> = {
    '9:16': 'vertical 9:16 portrait', '1:1': 'square 1:1', '4:5': 'vertical 4:5 portrait',
    '16:9': 'horizontal 16:9 landscape', '3:4': 'vertical 3:4 portrait',
  }
  const ratioInstruction = `Compose the output in ${aspectLabel[params.aspect_ratio ?? '9:16'] ?? 'vertical 9:16 portrait'} format. Ensure the full person fits in frame.`

  const defaultGeminiPrompt = [
    `You are a professional photo director and visual effects artist.`,
    hasMultiple
      ? `You receive ${extraData.length + 1} reference photos of the same person from different angles. Use ALL of them together to build the most accurate identity possible.`
      : `You receive a photo of a person and must place them EXACTLY into a new scene or environment.`,
    `NEW SCENE: ${params.scene_prompt}.`,
    `PRESERVE EXACTLY: same face, same facial features, same skin tone, same hair color and style, same outfit with exact colors and details, same body proportions.`,
    `The person must look naturally integrated into the new scene â€” realistic lighting matching the environment, natural shadows, correct perspective.`,
    ratioInstruction,
    `Output: photorealistic commercial photo, shot on Hasselblad H6D, Zeiss Otus 85mm f/1.4 lens, Kodak Portra 400, film grain, natural depth of field, no watermarks.`,
  ].join(' ')

  const geminiPrompt = talkingVideoMode
    ? [
        'You are a source-sovereign talking-video prepass compositor.',
        hasMultiple
          ? `You receive ${extraData.length + 1} reference photos of the same person from different angles. Use ALL of them together to preserve identity exactly.`
          : 'You receive a source frame that must remain sovereign.',
        approvedChangeSummary,
        `Change brief: ${params.scene_prompt}.`,
        'Preserve the exact same person, identity, face, hair, skin tone, body proportions, framing, crop, held objects, props, product, packaging, labels, printed text, logos, and overall composition from the source frame.',
        visibleItemInstruction,
        params.require_exact_text_logo ? 'Visible branding, printed text, and logos must remain exactly identical to the source frame.' : '',
        params.require_exact_color ? 'Visible colors must remain exactly identical to the source frame.' : '',
        params.requested_scene_change
          ? 'Only change the background/environment requested in the brief. Do not restage the subject or product.'
          : 'Keep the background and environment exactly the same as the source frame.',
        params.requested_wardrobe_change
          ? 'Only change the wardrobe requested in the brief. Keep accessories, product interaction, and all other visible items unchanged.'
          : 'Keep wardrobe, styling, and accessories exactly the same as the source frame.',
        'Ignore storyboard narration, shot lists, and spoken-text staging. Preserve source fidelity over cinematic reinterpretation.',
        ratioInstruction,
        'Output: photorealistic commercial photo, natural lighting, correct shadows, realistic perspective, no watermarks.',
      ].filter(Boolean).join(' ')
    : defaultGeminiPrompt

  const imageParts = [
    { inlineData: primaryData },
    ...extraData.map(d => ({ inlineData: d })),
  ]

  let photoBuffer: Buffer | null = null
  const geminiChain = ['gemini-3-pro-image-preview', 'gemini-3.1-flash-image-preview']
  let lastGeminiError = ''

  for (const model of geminiChain) {
    try {
      console.log(`[scene] Tentando ${model} via Vertex para asset ${params.assetId} (${imageParts.length} referência(s))`)
      const res = await fetchGoogleGenerateContent({
        model,
        feature: 'scene_generation',
        body: {
          contents: [{ role: 'user', parts: [
            { text: geminiPrompt },
            ...imageParts,
          ]}],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        },
      })
      if (!res.ok) throw new Error(`${model}: ${res.status} ${await res.text()}`)
      const data = await res.json()
      const parts = data.candidates?.[0]?.content?.parts ?? []
      const imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))
      if (!imgPart?.inlineData?.data) throw new Error(`${model} sem imagem | reason=${data.candidates?.[0]?.finishReason}`)
      photoBuffer = Buffer.from(imgPart.inlineData.data, 'base64')
      console.log(`[scene] Vertex sucesso: ${model}`)
      break
    } catch (e: any) {
      lastGeminiError = e.message
      console.warn(`[scene] ${model} falhou: ${e.message}`)
    }
  }

  if (!photoBuffer) {
    const falKey = process.env.FAL_KEY
    if (!falKey) throw new Error(`Todos os modelos Gemini falharam para scene. Ãšltimo erro: ${lastGeminiError}`)

    console.log(`[scene] Gemini bloqueou/falhou; tentando fallback Flux para asset ${params.assetId}`)
    const fluxPrompt = talkingVideoMode
      ? [
          'Create a source-sovereign talking-video prepass frame.',
          approvedChangeSummary,
          `Change brief: ${params.scene_prompt}.`,
          'Preserve the exact same person, identity, pose logic, framing, crop, held objects, product, packaging, labels, logos, printed text, props, and composition from the source frame.',
          visibleItemInstruction,
          params.require_exact_text_logo ? 'Branding, text, and logos must remain identical.' : '',
          params.require_exact_color ? 'Colors must remain identical wherever already visible in the source frame.' : '',
          params.requested_scene_change
            ? 'Change only the environment/background requested in the brief.'
            : 'Keep the environment and background exactly the same.',
          params.requested_wardrobe_change
            ? 'Change only the wardrobe requested in the brief.'
            : 'Keep wardrobe and accessories exactly the same.',
          'Ignore storyboard narration, camera beats, and spoken text. No watermark.',
          ratioInstruction,
          'Natural lighting, correct shadows, realistic perspective.',
        ].filter(Boolean).join(' ')
      : [
          `Transform the uploaded person into a new photorealistic commercial scene.`,
          `Creative direction: ${params.scene_prompt}.`,
          `Preserve the person's face, age, skin tone, hair, outfit colors, body proportions and identity as closely as possible.`,
          ratioInstruction,
          `Natural lighting, correct shadows, realistic perspective, no watermark.`,
        ].join(' ')
    const res = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: params.source_url,
        prompt: fluxPrompt,
        strength: 0.55,
        num_inference_steps: 38,
        guidance_scale: 3.5,
        image_size: params.aspect_ratio === '1:1' ? 'square_hd' : params.aspect_ratio === '16:9' ? 'landscape_16_9' : 'portrait_16_9',
        output_format: 'jpeg',
      }),
    })

    if (!res.ok) throw new Error(`Fallback Flux falhou para scene: ${await res.text()}`)
    const fluxData = await res.json()
    const fluxUrl = fluxData.images?.[0]?.url
    if (!fluxUrl) throw new Error(`Fallback Flux nÃ£o retornou imagem para scene. Ãšltimo Gemini: ${lastGeminiError}`)

    const imageRes = await fetch(fluxUrl)
    if (!imageRes.ok) throw new Error(`Download do fallback Flux falhou: ${imageRes.status}`)
    photoBuffer = Buffer.from(await imageRes.arrayBuffer())
    console.log(`[scene] Fallback Flux sucesso para asset ${params.assetId}`)
  }

  const fileName = `scene-${params.assetId}-${Date.now()}.jpg`
  const filePath = `${params.userId}/${fileName}`
  const { error: uploadError } = await admin.storage
    .from('studio')
    .upload(filePath, photoBuffer, { contentType: 'image/jpeg', upsert: true })
  if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`)

  const { data: urlData } = admin.storage.from('studio').getPublicUrl(filePath)
  return urlData.publicUrl
}

// â”€â”€ Preset Identity Scene â€” usa uma imagem-base do preset + referÃªncia do cliente â”€â”€
export async function generatePresetIdentityScene(params: {
  template_scene_url: string
  identity_reference_urls: string[]
  scene_prompt: string
  aspect_ratio?: string
  assetId: string
  userId: string
  outfit_source?: 'identity' | 'template'
}) {
  const admin = createAdminClient()
  const googleApiKey = (process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY)
  if (!googleApiKey) throw new Error('GOOGLE_API_KEY nÃ£o configurada no servidor')

  if (!params.template_scene_url?.startsWith('http')) {
    throw new Error('URL da cena-base do preset invÃ¡lida')
  }

  const identityRefs = params.identity_reference_urls.filter((url) => url.startsWith('http'))
  if (identityRefs.length === 0) {
    throw new Error('Ã‰ necessÃ¡rio ao menos uma foto de referÃªncia do cliente')
  }

  async function fetchInlineData(url: string) {
    const r = await fetch(url)
    if (!r.ok) throw new Error(`Download falhou: ${r.status}`)
    const mime = r.headers.get('content-type') || 'image/jpeg'
    const data = Buffer.from(await r.arrayBuffer()).toString('base64')
    return { mimeType: mime, data }
  }

  const templateScene = await fetchInlineData(params.template_scene_url)
  const identityData = await Promise.all(
    identityRefs.slice(0, 5).map((url) => fetchInlineData(url).catch(() => null))
  ).then((result) => result.filter(Boolean) as { mimeType: string; data: string }[])

  const aspectLabel: Record<string, string> = {
    '9:16': 'vertical 9:16 portrait', '1:1': 'square 1:1', '4:5': 'vertical 4:5 portrait',
    '16:9': 'horizontal 16:9 landscape', '3:4': 'vertical 3:4 portrait',
  }
  const ratioInstruction = `Compose the output in ${aspectLabel[params.aspect_ratio ?? '9:16'] ?? 'vertical 9:16 portrait'} format. Ensure the full person fits in frame.`
  const useTemplateOutfit = params.outfit_source === 'template'

  const identityLockBlock = [
    'IDENTITY LOCK â€” person[1] Ã© a referÃªncia exclusiva.',
    'RULE 1 â€” FACIAL & BODY IDENTITY: Clonagem 100% fiel â€” estrutura Ã³ssea, nariz, lÃ¡bios, olhos, cor dos olhos, sobrancelhas, tom de pele, idade, cabelo. Nada de deixar mais jovem ou diferente.',
    useTemplateOutfit
      ? 'RULE 2 â€” TEMPLATE OUTFIT LOCK: Use a roupa do personagem principal da cena-base, nÃ£o a roupa da pessoa enviada. Preserve fantasia, uniforme, acessÃ³rios, cores, tecidos, caimento e todos os detalhes visÃ­veis da imagem-base.'
      : 'RULE 2 â€” OUTFIT FIDELITY: Roupa da pessoa enviada pixel-perfect idÃªntica â€” tipo de peÃ§a, cor, textura, decote, alÃ§as, mangas, fit, caimento, estampas, acessÃ³rios e todos os detalhes visÃ­veis. NÃ£o invente fantasia, uniforme, traje de personagem, roupa premium ou roupa nova.',
    useTemplateOutfit
      ? 'RULE 2B â€” NO UPLOADED CLOTHING: NÃ£o copie camiseta, vestido, acessÃ³rios ou qualquer peÃ§a da foto enviada. Somente rosto, cabelo, tom de pele, idade aparente e expressÃ£o vÃªm da pessoa enviada.'
      : 'RULE 2B â€” NO INVENTED OBJECTS: Nenhum produto, objeto, acessÃ³rio ou peÃ§a de roupa que nÃ£o esteja na pessoa original. MÃ£os vazias ficam vazias.',
    'RULE 3 â€” ANATOMY: Foto Ãºnica. Os 2 braÃ§os completamente visÃ­veis e anatomicamente corretos â€” exatamente 2 braÃ§os, 2 mÃ£os, 5 dedos cada.',
    'RULE 4 â€” POSE/POSITION LOCK: Copie a pose, posiÃ§Ã£o corporal, gesto, direÃ§Ã£o do olhar, distÃ¢ncia da cÃ¢mera e Ã¢ngulo do template scene. NÃ£o mude pose, perspectiva, lente ou enquadramento.',
    'RULE 5 â€” LIGHTING: IluminaÃ§Ã£o comercial cinematogrÃ¡fica, profundidade de campo natural, bokeh suave.',
    'RULE 6 â€” CAMERA & QUALITY: Hasselblad H6D, Zeiss Otus 85mm f/1.4, Kodak Portra 400, film grain, 8K, ultra-detailed commercial photography. NEGATIVE: nÃ£o rotacione, nÃ£o aproxime, nÃ£o afaste, nÃ£o mude o Ã¢ngulo, perspectiva, pose, roupa, composiÃ§Ã£o, fundo, lente aparente ou enquadramento da cena-base.',
  ].join(' ')

  const templatePreservationBlock = [
    'TEMPLATE SCENE LOCK: a primeira imagem Ã© a cena-base absoluta.',
    'Preserve com fidelidade mÃ¡xima a composiÃ§Ã£o, enquadramento, proporÃ§Ã£o da cÃ¢mera, distÃ¢ncia focal, Ã¢ngulo, pose, posiÃ§Ã£o corporal, gestos, fundo, profundidade, ambiente, posiÃ§Ã£o dos personagens secundÃ¡rios, objetos, atmosfera e storytelling da cena-base.',
    'Substitua somente a pessoa humana principal da cena-base por person[1].',
    ...(useTemplateOutfit
      ? ['Preserve a roupa do personagem principal da cena-base. A troca Ã© de identidade/rosto, nÃ£o de vestuÃ¡rio.']
      : []),
    'Remova completamente a pessoa original da cena-base.',
    'NÃ£o simplifique a imagem para um retrato isolado.',
    'NÃ£o corte personagens secundÃ¡rios.',
    'NÃ£o troque o fundo por outro ambiente.',
    'NÃ£o mude pose, Ã¢ngulo, perspectiva, lente, zoom, rotaÃ§Ã£o, altura da cÃ¢mera ou posiÃ§Ã£o dos personagens.',
    'NEGATIVE PROMPT: sem nova pose, sem novo figurino, sem nova cÃ¢mera, sem novo fundo, sem retrato de estÃºdio, sem crop diferente, sem zoom diferente, sem mudar distÃ¢ncia focal aparente, sem simplificar a cena.',
    'NÃ£o transforme a saÃ­da em foto solo de estÃºdio, floresta ou fundo neutro se a cena-base for uma selfie urbana com personagens.',
    'Se a cena-base for selfie, mantenha a lÃ³gica de selfie, braÃ§o estendido e perspectiva de cÃ¢mera em primeira pessoa.',
    'A cena final deve parecer a mesma foto-base, porÃ©m com a pessoa principal trocada pela identidade de person[1].',
  ].join(' ')

  const defaultGeminiPrompt = [
    'You are a professional photo director and identity-preserving compositing artist.',
    'The FIRST image is the master scene template. The NEXT images are identity references.',
    `The NEXT ${identityData.length} image(s) are exclusive identity references for the person that must replace the original main subject in the template scene.`,
    templatePreservationBlock,
    'Replace only the main human subject from the template scene with person[1], and remove every trace of the original template person.',
    'Do not change the other characters, props, environment, or overall storytelling of the template scene.',
    useTemplateOutfit
      ? 'Preserve the uploaded person exact face, facial structure, age appearance, skin tone, hair identity and expression energy, but use the template scene main character outfit exactly.'
      : 'Preserve the uploaded person exact face, facial structure, age appearance, skin tone, hair identity, expression energy, body identity, and clothing fidelity.',
    identityLockBlock,
    'Do not generate a new generic portrait.',
    'Do not improvise a new pose unrelated to the template scene.',
    'Do not output a solo subject if the template scene contains multiple characters or a specific cinematic setup.',
    'Quality pass: Hasselblad H6D, Zeiss Otus 85mm f/1.4, Kodak Portra 400, subtle film grain, 8K commercial detail. Negative prompt: do not change camera angle, apparent lens, zoom distance, pose, outfit source, composition, background, secondary characters, framing or perspective.',
    'Make the replacement look naturally integrated and commercially photorealistic.',
    `ADDITIONAL CREATIVE DIRECTION: ${params.scene_prompt}.`,
    ratioInstruction,
    'Output: photorealistic commercial photo, shot on Hasselblad H6D, Zeiss Otus 85mm f/1.4 lens, Kodak Portra 400, film grain, natural depth of field, no watermarks.',
  ].join(' ')

  const geminiPrompt = defaultGeminiPrompt

  const imageParts = [
    { inlineData: templateScene },
    ...identityData.map((item) => ({ inlineData: item })),
  ]

  let photoBuffer: Buffer | null = null
  const geminiChain = ['gemini-3-pro-image-preview', 'gemini-3.1-flash-image-preview']
  let lastGeminiError = ''

  for (const model of geminiChain) {
    try {
      console.log(`[preset-scene] Tentando ${model} via Vertex para asset ${params.assetId} (${imageParts.length} referência(s))`)
      const res = await fetchGoogleGenerateContent({
        model,
        feature: 'preset_scene_generation',
        body: {
          contents: [{ role: 'user', parts: [{ text: geminiPrompt }, ...imageParts] }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
        },
      })
      if (!res.ok) throw new Error(`${model}: ${res.status} ${await res.text()}`)
      const data = await res.json()
      const parts = data.candidates?.[0]?.content?.parts ?? []
      const imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))
      if (!imgPart?.inlineData?.data) throw new Error(`${model} sem imagem | reason=${data.candidates?.[0]?.finishReason}`)
      photoBuffer = Buffer.from(imgPart.inlineData.data, 'base64')
      console.log(`[preset-scene] Vertex sucesso: ${model}`)
      break
    } catch (e: any) {
      lastGeminiError = e.message
      console.warn(`[preset-scene] ${model} falhou: ${e.message}`)
    }
  }

  if (!photoBuffer) {
    const falKey = process.env.FAL_KEY
    if (!falKey) throw new Error(`Todos os modelos Gemini falharam para preset identity scene. Ãšltimo erro: ${lastGeminiError}`)

    console.log(`[preset-scene] Gemini bloqueou/falhou; tentando fallback Flux PuLID para asset ${params.assetId}`)
    const fallbackOutfitInstructions = useTemplateOutfit
      ? [
          `Use the template scene main character outfit exactly: garment type, colors, costume/uniform, fabric, fit, accessories and all visible details.`,
          `Do not copy clothing, shirt, dress, accessories, or any garment from the uploaded identity reference.`,
        ]
      : [
          `Hard lock the reference person's clothing: do not change garment type, colors, fabric, fit, sleeves, neckline, prints, accessories, or visible details. Do not invent costumes, uniforms, character outfits, luxury outfits, or new clothes.`,
        ]

    const res = await fetch('https://fal.run/fal-ai/flux-pulid', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: [
          `Create a photorealistic commercial image using the provided preset scene as a strict composition reference.`,
          `Creative direction: ${params.scene_prompt}.`,
          `Use the reference person as the main subject and preserve face, age, skin tone, hair, body proportions and identity as closely as possible.`,
          ...fallbackOutfitInstructions,
          `Hard lock the preset scene pose and camera: keep the same pose, body position, gesture, camera angle, perspective, lens feeling, framing, zoom distance, environment, background, secondary characters, objects and storytelling.`,
          `Quality pass: Hasselblad H6D, Zeiss Otus 85mm f/1.4, Kodak Portra 400, subtle film grain, 8K commercial detail.`,
          `Negative prompt: do not change camera angle, apparent lens, zoom distance, pose, outfit source, composition, background, secondary characters, framing or perspective.`,
          ratioInstruction,
          `Natural lighting, correct shadows, realistic perspective, no watermark.`,
        ].join(' '),
        reference_images: identityRefs.slice(0, 4).map((url) => ({ image_url: url })),
        image_size: params.aspect_ratio === '1:1' ? 'square_hd' : params.aspect_ratio === '16:9' ? 'landscape_16_9' : 'portrait_16_9',
        num_images: 1,
        enable_safety_checker: true,
      }),
    })

    if (!res.ok) throw new Error(`Fallback Flux PuLID falhou para preset identity scene: ${await res.text()}`)
    const fluxData = await res.json()
    const fluxUrl = fluxData.images?.[0]?.url
    if (!fluxUrl) throw new Error(`Fallback Flux PuLID nÃ£o retornou imagem para preset identity scene. Ãšltimo Gemini: ${lastGeminiError}`)

    const imageRes = await fetch(fluxUrl)
    if (!imageRes.ok) throw new Error(`Download do fallback Flux PuLID falhou: ${imageRes.status}`)
    photoBuffer = Buffer.from(await imageRes.arrayBuffer())
    console.log(`[preset-scene] Fallback Flux PuLID sucesso para asset ${params.assetId}`)
  }

  const fileName = `preset-scene-${params.assetId}-${Date.now()}.jpg`
  const filePath = `${params.userId}/${fileName}`
  const { error: uploadError } = await admin.storage
    .from('studio')
    .upload(filePath, photoBuffer, { contentType: 'image/jpeg', upsert: true })
  if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`)

  const { data: urlData } = admin.storage.from('studio').getPublicUrl(filePath)
  return urlData.publicUrl
}


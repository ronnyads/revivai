import { createAdminClient } from './supabase/admin'

/**
 * Extracts the last frame of a video using Fal AI FFmpeg API.
 * This is robust and compatible with Vercel/Serverless as it moves
 * the heavy lifting to external infrastructure.
 */
export async function extractLastFrame(videoUrl: string): Promise<Buffer> {
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY não configurada no servidor')

  console.log(`[videoUtils] Chamando Fal AI para extrair frame de: ${videoUrl}`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000) // 8s timeout

  try {
    const res = await fetch('https://fal.run/fal-ai/ffmpeg-api/extract-frame', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: videoUrl,
        frame_type: 'last',
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
        const errText = await res.text()
        console.error('[videoUtils] Erro na API da Fal AI:', errText)
        throw new Error(`Fal AI failed to extract frame: ${errText.slice(0, 200)}`)
    }

    const data = await res.json()
    const frameUrl = data.images?.[0]?.url || data.image?.url
    if (!frameUrl) throw new Error('API da Fal AI não retornou URL da imagem')

    const imgRes = await fetch(frameUrl)
    if (!imgRes.ok) throw new Error('Falha ao baixar imagem extraída da Fal AI')
    
    return Buffer.from(await imgRes.arrayBuffer())
  } catch (err: any) {
    clearTimeout(timeoutId)
    throw err
  }
}

/**
 * Extracts last frame using Fal AI and uploads it to Supabase Storage
 */
export async function saveLastFrame(videoUrl: string, userId: string, assetId: string): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const frameBuffer = await extractLastFrame(videoUrl)
    const storagePath = `${userId}/${assetId}-last-frame.jpg`
    
    const { error } = await admin.storage
      .from('studio')
      .upload(storagePath, frameBuffer, { contentType: 'image/jpeg', upsert: true })
      
    if (error) throw error
    
    const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(storagePath)
    return publicUrl
  } catch (err) {
    console.error(`[videoUtils] Erro ao salvar last frame para ${assetId}:`, err)
    return null
  }
}

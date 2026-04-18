import { createAdminClient } from './supabase/admin'
import os from 'os'
import path from 'path'
import fs from 'fs'

/**
 * Downloads a video and extracts its last frame as a Buffer.
 * Useful for "continuation" features in video models.
 */
export async function extractLastFrame(videoUrl: string): Promise<Buffer> {
  const { default: ffmpeg } = await import('fluent-ffmpeg')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegPath = require('ffmpeg-static') as string
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffprobePath = require('ffprobe-static').path as string
  
  ffmpeg.setFfmpegPath(ffmpegPath)
  ffmpeg.setFfprobePath(ffprobePath)

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-frame-'))
  const inputPath = path.join(tmpDir, 'input.mp4')
  const outputPath = path.join(tmpDir, 'last_frame.jpg')

  try {
    const res = await fetch(videoUrl)
    if (!res.ok) throw new Error(`Falha ao baixar vídeo: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(inputPath, buf)

    // Extrai o último frame
    // Usamos -sseof -1 para procurar perto do fim e capturar um frame
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput('99:99:99') // Tenta ir para o fim extremo para forçar o último frame
        .outputOptions(['-vframes', '1', '-q:v', '2'])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: any) => {
          // Se falhou buscando o fim absoluto, tenta extrair o primeiro frame como fallback
          ffmpeg(inputPath)
            .screenshots({
              timestamps: ['100%'],
              filename: 'last_frame.jpg',
              folder: tmpDir,
            })
            .on('end', () => resolve())
            .on('error', (e: any) => reject(e))
        })
        .run()
    })

    if (!fs.existsSync(outputPath)) {
        throw new Error('Falha ao gerar o arquivo de frame')
    }

    return fs.readFileSync(outputPath)
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}

/**
 * Extracts last frame and uploads it to Supabase Storage
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

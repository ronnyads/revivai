import { createAdminClient } from './supabase/admin'
import os from 'os'
import path from 'path'
import fs from 'fs'

/**
 * Downloads a video and extracts its last frame as a Buffer.
 * Uses child_process and raw ffmpeg binary to avoid ffprobe dependency.
 */
export async function extractLastFrame(videoUrl: string): Promise<Buffer> {
  const { execSync } = await import('child_process')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegPath = require('ffmpeg-static') as string

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-frame-'))
  const inputPath = path.join(tmpDir, 'input.mp4')
  const outputPath = path.join(tmpDir, 'last_frame.jpg')

  try {
    const res = await fetch(videoUrl)
    if (!res.ok) throw new Error(`Falha ao baixar vídeo: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(inputPath, buf)

    // Comando FFmpeg robusto para pegar o último frame:
    // -sseof -0.1 (procura perto do fim)
    // -frames:v 1 (pega o primeiro frame após o seek)
    // -update 1 (output como imagem única)
    try {
      execSync(`"${ffmpegPath}" -y -sseof -1 -i "${inputPath}" -frames:v 1 -q:v 2 "${outputPath}"`, { stdio: 'ignore' })
    } catch {
      // Fallback: se o vídeo for muito curto (< 1s), tenta pegar o primeiro frame
      execSync(`"${ffmpegPath}" -y -i "${inputPath}" -frames:v 1 -q:v 2 "${outputPath}"`, { stdio: 'ignore' })
    }

    if (!fs.existsSync(outputPath)) {
        throw new Error('Falha ao gerar o arquivo de frame via FFmpeg CLI')
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

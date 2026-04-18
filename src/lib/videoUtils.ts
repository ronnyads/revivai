import { createAdminClient } from './supabase/admin'
import os from 'os'
import path from 'path'
import fs from 'fs'

/**
 * Downloads a video and extracts its last frame as a Buffer.
 * Uses child_process.execFile for maximum stability in Vercel/Serverless.
 */
export async function extractLastFrame(videoUrl: string): Promise<Buffer> {
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const execFileAsync = promisify(execFile)
  
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  let ffmpegPath = require('ffmpeg-static') as string
  if (typeof ffmpegPath !== 'string' && (ffmpegPath as any).path) {
    ffmpegPath = (ffmpegPath as any).path
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-frame-'))
  const inputPath = path.join(tmpDir, 'input.mp4')
  const outputPath = path.join(tmpDir, 'last_frame.jpg')

  try {
    const res = await fetch(videoUrl)
    if (!res.ok) throw new Error(`Falha ao baixar vídeo: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(inputPath, buf)

    // Comando FFmpeg robusto para pegar o último frame via execFile (passando args em Array)
    try {
      // Tenta seek do final (muito rápido)
      await execFileAsync(ffmpegPath, [
        '-y',
        '-sseof', '-1',
        '-i', inputPath,
        '-update', '1',
        '-frames:v', '1',
        '-q:v', '2',
        outputPath
      ])
    } catch (e) {
      console.warn('[videoUtils] Seek do final falhou, tentando extração simples:', e)
      // Fallback: se o vídeo for muito curto (< 1s), tenta pegar o primeiro frame
      await execFileAsync(ffmpegPath, [
        '-y',
        '-i', inputPath,
        '-frames:v', '1',
        '-q:v', '2',
        outputPath
      ])
    }

    if (!fs.existsSync(outputPath)) {
        throw new Error('arquivo de frame não foi criado pelo ffmpeg')
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

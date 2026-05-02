import { execFile } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createAdminClient } from './supabase/admin'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath = require('ffmpeg-static') as string

function parseFfmpegDuration(stderr: string) {
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
  if (!match) return null

  const hours = Number(match[1] ?? 0)
  const minutes = Number(match[2] ?? 0)
  const seconds = Number(match[3] ?? 0)
  return Number((hours * 3600 + minutes * 60 + seconds).toFixed(2))
}

function execFfmpeg(args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(ffmpegPath, args, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        const details = stderr || stdout || error.message
        reject(new Error(`FFmpeg falhou: ${details.slice(0, 300)}`))
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

async function downloadVideoToTemp(videoUrl: string) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-video-'))
  const inputPath = path.join(tmpDir, 'input-video.mp4')

  try {
    const response = await fetch(videoUrl)
    if (!response.ok) {
      throw new Error(`Falha ao baixar video para analise: ${response.status}`)
    }

    fs.writeFileSync(inputPath, Buffer.from(await response.arrayBuffer()))
    return { tmpDir, inputPath }
  } catch (error) {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
    throw error
  }
}

async function extractFrameFromVideo(videoUrl: string, mode: 'first' | 'last'): Promise<Buffer> {
  const { tmpDir, inputPath } = await downloadVideoToTemp(videoUrl)
  const outputPath = path.join(tmpDir, `${mode}.jpg`)

  try {
    let seekSeconds = 0
    if (mode === 'last') {
      const duration = await measureVideoDurationSecondsFromPath(inputPath)
      seekSeconds = Math.max(duration - 0.15, 0)
    }

    const args = [
      '-y',
      ...(seekSeconds > 0 ? ['-ss', seekSeconds.toFixed(2)] : []),
      '-i', inputPath,
      '-frames:v', '1',
      '-q:v', '2',
      outputPath,
    ]

    await execFfmpeg(args)
    return fs.readFileSync(outputPath)
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}

async function measureVideoDurationSecondsFromPath(inputPath: string): Promise<number> {
  const { stderr } = await execFfmpeg(['-i', inputPath, '-f', 'null', '-'])
  const duration = parseFfmpegDuration(stderr)
  if (!duration || duration <= 0) {
    throw new Error('Nao foi possivel medir a duracao do video de referencia')
  }
  return duration
}

async function extractFrameFromPath(inputPath: string, outputPath: string, seekSeconds?: number) {
  const args = [
    '-y',
    ...(typeof seekSeconds === 'number' && seekSeconds > 0 ? ['-ss', seekSeconds.toFixed(2)] : []),
    '-i', inputPath,
    '-frames:v', '1',
    '-q:v', '2',
    outputPath,
  ]

  await execFfmpeg(args)
  return fs.readFileSync(outputPath)
}

async function saveFrame(
  frameBuffer: Buffer,
  userId: string,
  assetId: string,
  frameLabel: 'first' | 'last',
): Promise<string | null> {
  try {
    const admin = createAdminClient()
    const storagePath = `${userId}/${assetId}-${frameLabel}-frame.jpg`
    const { error } = await admin.storage
      .from('studio')
      .upload(storagePath, frameBuffer, { contentType: 'image/jpeg', upsert: true })

    if (error) throw error

    const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(storagePath)
    return publicUrl
  } catch (error) {
    console.error(`[videoUtils] Erro ao salvar ${frameLabel} frame para ${assetId}:`, error)
    return null
  }
}

export async function measureVideoDurationSeconds(videoUrl: string): Promise<number> {
  const { tmpDir, inputPath } = await downloadVideoToTemp(videoUrl)
  try {
    return await measureVideoDurationSecondsFromPath(inputPath)
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}

export async function extractVideoReferenceInsights(videoUrl: string): Promise<{
  durationSeconds: number
  firstFrameBuffer: Buffer
  lastFrameBuffer: Buffer
}> {
  const { tmpDir, inputPath } = await downloadVideoToTemp(videoUrl)
  const firstOutputPath = path.join(tmpDir, 'first.jpg')
  const lastOutputPath = path.join(tmpDir, 'last.jpg')

  try {
    const durationSeconds = await measureVideoDurationSecondsFromPath(inputPath)
    const firstFrameBuffer = await extractFrameFromPath(inputPath, firstOutputPath)
    const lastFrameBuffer = await extractFrameFromPath(inputPath, lastOutputPath, Math.max(durationSeconds - 0.15, 0))
    return { durationSeconds, firstFrameBuffer, lastFrameBuffer }
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}

export async function extractFirstFrame(videoUrl: string): Promise<Buffer> {
  return extractFrameFromVideo(videoUrl, 'first')
}

export async function extractLastFrame(videoUrl: string): Promise<Buffer> {
  return extractFrameFromVideo(videoUrl, 'last')
}

export async function saveFirstFrame(videoUrl: string, userId: string, assetId: string): Promise<string | null> {
  try {
    const frameBuffer = await extractFirstFrame(videoUrl)
    return await saveFrame(frameBuffer, userId, assetId, 'first')
  } catch (error) {
    console.error(`[videoUtils] Erro ao salvar first frame para ${assetId}:`, error)
    return null
  }
}

export async function saveLastFrame(videoUrl: string, userId: string, assetId: string): Promise<string | null> {
  try {
    const frameBuffer = await extractLastFrame(videoUrl)
    return await saveFrame(frameBuffer, userId, assetId, 'last')
  } catch (error) {
    console.error(`[videoUtils] Erro ao salvar last frame para ${assetId}:`, error)
    return null
  }
}

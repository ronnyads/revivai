export type StudioVideoQuality = '720p' | '1080p'

export const VIDEO_GENERATION_COST: Record<StudioVideoQuality, number> = {
  '720p': 75,
  '1080p': 100,
}

// Custo por duração: 5s é ~33% mais barato
export const VIDEO_GENERATION_COST_BY_DURATION: Record<StudioVideoQuality, Record<5 | 8, number>> = {
  '720p':  { 5: 50, 8: 75  },
  '1080p': { 5: 65, 8: 100 },
}

export function getVideoGenerationCostByDuration(quality: unknown, duration: unknown): number {
  const q = normalizeStudioVideoQuality(quality)
  const d = Number(duration ?? 8) >= 7 ? 8 : 5
  return VIDEO_GENERATION_COST_BY_DURATION[q][d as 5 | 8]
}

export const CREDIT_COST: Record<string, number> = {
  face:    0,   // upload, sem API
  join:    0,   // FFmpeg local
  render:  1,   // FFmpeg merge, quase grátis
  caption: 2,   // Whisper
  upscale: 7,    // 4K — Gemini 3 Pro Image
  upscale_8k: 15, // 8K — Gemini 3 Pro + Clarity 2x
  script:  3,   // GPT-4o
  voice:   8,   // ElevenLabs / Google TTS
  voice_grok: 3, // Grok TTS (xAI) — 14x mais barato que ElevenLabs
  veo_native_audio: 140, // surcharge áudio nativo Veo (60 base + 140 = 200 CR total)
  model:   8,   // Flux Pro + GPT-4o
  image:   8,   // Flux Pro Ultra
  compose: 12,  // IDM-VTON/overlay
  animate: 50,  // Movimento Guiado — Vertex Veo 3.1
  lipsync: 30,  // SyncLabs Pro (ajustado para cobrir custo $0,40)
  video:   15,  // Motor Padrão (Kling/Fal)
  video_veo: 50,  // Motor Premium (Google Veo 3.1)
  video_grok: 10, // Grok Imagine (xAI) — $0,56/8s c/ áudio nativo
  talking_video: 60, // Veo silent 8s ($0,80) + Grok TTS automático
  angles: 12,   // Direção de Cena (Flux i2i / Google Subject)
  music: 10,    // Trilha Sonora (Google Lyria 3)
  ugc_bundle: 60, // 8 variações cinematográficas (Imagen 3.0 Parallel)
  scene: 12,      // Cena Livre — modelo em qualquer ambiente (Gemini)
  look_split: 6,  // Separar Look - divide 1 foto em ate 3 referencias fieis
  voice_convert: 10, // Converter Voz — ElevenLabs Speech-to-Speech
}

export function normalizeStudioVideoQuality(value: unknown): StudioVideoQuality {
  return String(value ?? '').trim() === '1080p' ? '1080p' : '720p'
}

export function getVideoGenerationCost(value: unknown): number {
  return VIDEO_GENERATION_COST[normalizeStudioVideoQuality(value)]
}

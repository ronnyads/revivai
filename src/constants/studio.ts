import { AssetType } from '@/types'

export const CREDIT_COST: Record<string, number> = {
  face:    0,   // upload, sem API
  join:    0,   // FFmpeg local
  render:  1,   // FFmpeg merge, quase grátis
  caption: 2,   // Whisper
  upscale: 3,   // 4K — Gemini 3 Pro Image
  upscale_8k: 8, // 8K — Gemini 3 Pro + Clarity 2x
  script:  3,   // GPT-4o
  voice:   8,   // ElevenLabs
  model:   8,   // Flux Pro + GPT-4o
  image:   8,   // Flux Pro Ultra
  compose: 12,  // IDM-VTON/overlay
  animate: 20,  // live-portrait
  lipsync: 20,  // SyncLabs Pro
  video:   15,  // Motor Padrão (Kling/Fal)
  video_veo: 50,  // Motor Premium (Google Veo 3.1) - Ajustado para 50 para incentivar volume de uso
  angles: 12,   // Direção de Cena (Flux i2i / Google Subject)
  music: 10,    // Trilha Sonora (Google Lyria 3)
  ugc_bundle: 60, // 8 variações cinematográficas (Imagen 3.0 Parallel)
}

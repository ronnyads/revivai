import { GoogleAuth } from 'google-auth-library'

type GoogleCloudMediaContext = {
  accessToken: string
}

type WordInfo = {
  startTime?: string
  endTime?: string
  word?: string
}

function parseGoogleCredentials(raw: string): Record<string, unknown> {
  const normalized = raw.startsWith('"') && raw.endsWith('"')
    ? JSON.parse(raw)
    : raw
  return typeof normalized === 'string' ? JSON.parse(normalized) : normalized
}

async function resolveGoogleCloudMediaContext(feature: string): Promise<GoogleCloudMediaContext> {
  const rawKey = process.env.GOOGLE_VERTEX_KEY
  if (!rawKey) {
    throw new Error(`GOOGLE_VERTEX_KEY nao configurada para ${feature}.`)
  }

  const credentials = parseGoogleCredentials(rawKey)
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  if (!token.token) {
    throw new Error(`Token Google vazio para ${feature}.`)
  }

  return {
    accessToken: token.token,
  }
}

function inferAudioEncoding(mimeType: string): string | undefined {
  const normalized = mimeType.toLowerCase()
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'MP3'
  if (normalized.includes('wav') || normalized.includes('wave')) return 'LINEAR16'
  if (normalized.includes('ogg')) return 'OGG_OPUS'
  if (normalized.includes('webm')) return 'WEBM_OPUS'
  return undefined
}

function inferLanguageConfig(languageCode?: string) {
  const normalized = (languageCode ?? 'pt-BR').trim() || 'pt-BR'
  if (/^pt/i.test(normalized)) return { languageCode: 'pt-BR', femaleVoice: 'pt-BR-Standard-A', maleVoice: 'pt-BR-Standard-B' }
  if (/^es/i.test(normalized)) return { languageCode: 'es-US', femaleVoice: 'es-US-Standard-A', maleVoice: 'es-US-Standard-B' }
  return { languageCode: 'en-US', femaleVoice: 'en-US-Standard-F', maleVoice: 'en-US-Standard-D' }
}

function resolveGoogleVoiceName(voiceId: string | undefined, languageCode?: string): string {
  const config = inferLanguageConfig(languageCode)
  const normalizedVoiceId = String(voiceId ?? '').trim()
  const maleVoiceIds = new Set(['pNInz6obpgDQGcFmaJgB', 'TxGEqnHWrfWFTfGW9XjX'])
  if (maleVoiceIds.has(normalizedVoiceId)) return config.maleVoice
  return config.femaleVoice
}

function parseDurationSeconds(raw?: string): number {
  if (!raw) return 0
  const normalized = raw.endsWith('s') ? raw.slice(0, -1) : raw
  const seconds = Number(normalized)
  return Number.isFinite(seconds) ? seconds : 0
}

function formatSrtTimestamp(seconds: number): string {
  const totalMilliseconds = Math.max(0, Math.round(seconds * 1000))
  const hours = Math.floor(totalMilliseconds / 3_600_000)
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000)
  const secs = Math.floor((totalMilliseconds % 60_000) / 1000)
  const millis = totalMilliseconds % 1000
  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(secs).padStart(2, '0'),
  ].join(':') + `,${String(millis).padStart(3, '0')}`
}

function buildSrtFromWords(words: WordInfo[], transcriptFallback: string): string {
  if (words.length === 0) {
    const trimmed = transcriptFallback.trim()
    if (!trimmed) return ''
    return `1\n00:00:00,000 --> 00:00:04,000\n${trimmed}\n`
  }

  const captions: Array<{ start: number; end: number; text: string }> = []
  let chunkWords: string[] = []
  let chunkStart = 0
  let chunkEnd = 0

  function flushChunk() {
    if (chunkWords.length === 0) return
    captions.push({
      start: chunkStart,
      end: Math.max(chunkEnd, chunkStart + 1.2),
      text: chunkWords.join(' ').trim(),
    })
    chunkWords = []
  }

  for (const word of words) {
    const text = String(word.word ?? '').trim()
    if (!text) continue
    const start = parseDurationSeconds(word.startTime)
    const end = parseDurationSeconds(word.endTime)

    if (chunkWords.length === 0) {
      chunkStart = start
      chunkEnd = end
    }

    chunkWords.push(text)
    chunkEnd = end

    const exceedsWordBudget = chunkWords.length >= 7
    const exceedsCharBudget = chunkWords.join(' ').length >= 42
    const exceedsTimeBudget = (chunkEnd - chunkStart) >= 3.4
    const endsSentence = /[.!?;,]$/.test(text)

    if (exceedsWordBudget || exceedsCharBudget || exceedsTimeBudget || endsSentence) {
      flushChunk()
    }
  }

  flushChunk()

  return captions
    .map((caption, index) => {
      return `${index + 1}\n${formatSrtTimestamp(caption.start)} --> ${formatSrtTimestamp(caption.end)}\n${caption.text}\n`
    })
    .join('\n')
}

export async function synthesizeGoogleSpeech(params: {
  text: string
  voiceId?: string
  languageCode?: string
  speakingRate?: number
}): Promise<Buffer> {
  const context = await resolveGoogleCloudMediaContext('google-tts')
  const voiceName = resolveGoogleVoiceName(params.voiceId, params.languageCode)
  const voiceConfig = inferLanguageConfig(params.languageCode)

  const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${context.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: { text: params.text },
      voice: {
        languageCode: voiceConfig.languageCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: Number.isFinite(params.speakingRate) ? params.speakingRate : 1,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Google Cloud TTS falhou: ${response.status} ${await response.text()}`)
  }

  const data = await response.json()
  const audioContent = typeof data.audioContent === 'string' ? data.audioContent : ''
  if (!audioContent) {
    throw new Error('Google Cloud TTS nao retornou audioContent.')
  }

  return Buffer.from(audioContent, 'base64')
}

export async function transcribeGoogleAudio(params: {
  audioBuffer: Buffer
  mimeType: string
  languageCode?: string
}): Promise<{ transcript: string; srt: string }> {
  const context = await resolveGoogleCloudMediaContext('google-stt')
  const encoding = inferAudioEncoding(params.mimeType)
  const voiceConfig = inferLanguageConfig(params.languageCode)
  const body: Record<string, unknown> = {
    config: {
      languageCode: voiceConfig.languageCode,
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: true,
      model: 'latest_long',
    },
    audio: {
      content: params.audioBuffer.toString('base64'),
    },
  }

  if (encoding) {
    ;(body.config as Record<string, unknown>).encoding = encoding
  }

  const response = await fetch('https://speech.googleapis.com/v1/speech:recognize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${context.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Google Cloud STT falhou: ${response.status} ${await response.text()}`)
  }

  const data = await response.json()
  const results = Array.isArray(data.results) ? data.results : []
  const transcript = results
    .map((result: { alternatives?: Array<{ transcript?: string }> }) => result.alternatives?.[0]?.transcript ?? '')
    .join(' ')
    .trim()
  const words = results.flatMap((result: { alternatives?: Array<{ words?: WordInfo[] }> }) => result.alternatives?.[0]?.words ?? [])
  const srt = buildSrtFromWords(words, transcript)

  return { transcript, srt }
}

export type SharedTalkingVideoMode = 'exact_speech' | 'veo_natural'

import { CREDIT_COST } from '@/constants/studio'

type TalkingVideoIdeaParts = {
  speechText?: string
  expressionDirection?: string
  visualPrompt?: string
}

export type TalkingVideoIdeaParseResult = {
  ideaPrompt: string
  speechText: string
  expressionDirection: string
  visualPrompt: string
  speechDetected: boolean
  emotionDetected: boolean
  sceneDetected: boolean
  speechSource: 'explicit' | 'quoted' | 'label' | 'heuristic' | 'missing'
}

export type TalkingVideoSpeechChunkPlan = {
  fullText: string
  selectedText: string
  remainingText: string
  fullSeconds: number
  selectedSeconds: number
  remainingSeconds: number
  hasRemaining: boolean
}

type IdeaSection = 'neutral' | 'speech' | 'emotion' | 'visual' | 'ignore'

const EMOTION_LABEL_RE = /^(?:tom|emocao|emocional|energia|expressao|performance|sentimento|vibe|clima|mood)\s*:\s*/i
const VISUAL_LABEL_RE = /^(?:cena|visual|direcao visual|camera|movimento|enquadramento|ambiente|cenario|luz|lighting|shot|plano)\s*:\s*/i
const SPEECH_LABEL_RE = /^(?:fala|frase|texto falado|fala exata|o que ela fala|ela fala|voiceover|voice over|locucao|locucao exata|falado)(?:\s*\([^)]{0,80}\))?\s*:\s*/i
const IGNORE_LINE_LABEL_RE = /^(?:texto na tela|texto de tela|on-screen text|onscreen text|caption|legenda|sfx|fx|efeitos sonoros|sound effects?|musica|trilha(?: sonora)?|audio|audio de fundo)\s*:\s*/i
const STORYBOARD_LABEL_RE = /^(?:storyboard|roteiro|take(?:\s+\d+)?|shot list|acao|acao principal|direcao de cena|camera|cena|visual|ambiente|cenario|lighting|plano|conceito)\s*:?\s*/i
const TIME_MARKER_RE = /^(?:seg(?:\.|undos?)?|sec(?:onds?)?|take|shot|corte)\s*[\d:\-\u2013]+\s*:?\s*/i
const IGNORE_SPEECH_HINT_RE = /\b(texto na tela|on-screen text|caption|legenda|sfx|sound effects?|efeitos sonoros|musica|trilha(?: sonora)?|audio de fundo)\b/i
const INLINE_IGNORE_SEGMENT_RE = /(?:^|[.;,-]\s*)(?:texto na tela|texto de tela|on-screen text|onscreen text|caption|legenda|sfx|fx|efeitos sonoros|sound effects?|musica|trilha(?: sonora)?|audio(?: de fundo)?)\s*:?.*$/i
const EMOTION_HINT_RE = /\b(intim[oa]|emocional|humano|acolhedor|acolhedora|sincero|sincera|casual|cinematico|cinematografico|natural|dramatico|leve|calmo|calma|confiante|doce|sensivel|soft|warm|friendly|testimonial|depoimento)\b/i
const VISUAL_HINT_RE = /\b(camera|cinematic|cinematografico|cinematica|golden hour|close-up|close up|medium shot|plano|enquadramento|luz|lighting|vento|parque|rua|ambiente|cenario|fundo|selfie|tiktok|movimento)\b/i
const DIRECTION_HINT_RE = /\b(camera|luz|plano|shot|golden hour|cenario|ambiente|movimento|olhando para camera|olhando pra camera|vento|close|medium|cinemat)\b/i
const QUOTED_SEGMENT_RE = /["\u201C\u201D\u00AB\u00BB]([^"\u201C\u201D\u00AB\u00BB]{3,320})["\u201C\u201D\u00AB\u00BB]/g

function stripDecorators(value: string) {
  return value
    .replace(/[`*_]/g, ' ')
    .replace(/^\[\s*[x ]?\s*\]\s*/, '')
    .replace(/^[#>*\-\s]+/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeTalkingWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function countTalkingMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0
}

export function estimateTalkingSpeechDurationSeconds(params: {
  text: string
  speed?: number
}) {
  const normalized = normalizeTalkingWhitespace(params.text)
  if (!normalized) return 0

  const words = normalized.split(/\s+/).filter(Boolean)
  const chars = Array.from(normalized).length
  const punctuationCount = countTalkingMatches(normalized, /[.,;:!?]/g)
  const numberGroupCount = countTalkingMatches(normalized, /\b\d[\d.,/%-]*\b/g)
  const acronymCount = countTalkingMatches(normalized, /\b[A-Z]{2,}\b/g)
  const emojiCount = countTalkingMatches(normalized, /[\u{1F300}-\u{1FAFF}]/gu)
  const effectiveSpeed = Math.max(0.75, Number(params.speed ?? 1))
  const byWords = words.length / (2.45 * effectiveSpeed)
  const byChars = chars / (13.8 * effectiveSpeed)
  const punctuationPenalty = punctuationCount * 0.09
  const numberPenalty = numberGroupCount * 0.2
  const acronymPenalty = acronymCount * 0.24
  const emojiPenalty = emojiCount * 0.12

  return Number((Math.max(byWords, byChars) + punctuationPenalty + numberPenalty + acronymPenalty + emojiPenalty + 0.28).toFixed(2))
}

function splitSentenceLikeUnits(text: string) {
  const normalized = normalizeTalkingWhitespace(text)
  if (!normalized) return []

  const matches = normalized.match(/[^.!?\u2026]+[.!?\u2026]?/g) ?? []
  const units = matches
    .map((value) => normalizeTalkingWhitespace(value))
    .filter(Boolean)

  return units.length > 0 ? units : [normalized]
}

function joinSpeechUnits(units: string[]) {
  return normalizeTalkingWhitespace(units.join(' '))
}

function buildWordChunk(words: string[], speed: number, targetSeconds: number, maxSeconds: number) {
  const selectedWords: string[] = []

  for (const word of words) {
    const candidate = joinSpeechUnits([...selectedWords, word])
    const candidateSeconds = estimateTalkingSpeechDurationSeconds({ text: candidate, speed })

    if (selectedWords.length === 0 || candidateSeconds <= targetSeconds) {
      selectedWords.push(word)
      continue
    }

    break
  }

  if (selectedWords.length === 0 && words.length > 0) {
    selectedWords.push(words[0])
  }

  let selectedText = joinSpeechUnits(selectedWords)
  let selectedSeconds = estimateTalkingSpeechDurationSeconds({ text: selectedText, speed })

  while (selectedWords.length > 1 && selectedSeconds > maxSeconds) {
    selectedWords.pop()
    selectedText = joinSpeechUnits(selectedWords)
    selectedSeconds = estimateTalkingSpeechDurationSeconds({ text: selectedText, speed })
  }

  return {
    selectedText,
    remainingText: joinSpeechUnits(words.slice(selectedWords.length)),
  }
}

export function planTalkingVideoSpeechChunk(params: {
  text: string
  speed?: number
  targetSeconds?: number
  maxSeconds?: number
}): TalkingVideoSpeechChunkPlan {
  const fullText = normalizeTalkingWhitespace(params.text)
  const speed = Number(params.speed ?? 1)
  const targetSeconds = Math.max(4.5, Number(params.targetSeconds ?? 7.35))
  const maxSeconds = Math.max(targetSeconds, Number(params.maxSeconds ?? 7.95))

  if (!fullText) {
    return {
      fullText: '',
      selectedText: '',
      remainingText: '',
      fullSeconds: 0,
      selectedSeconds: 0,
      remainingSeconds: 0,
      hasRemaining: false,
    }
  }

  const fullSeconds = estimateTalkingSpeechDurationSeconds({ text: fullText, speed })
  if (fullSeconds <= maxSeconds) {
    return {
      fullText,
      selectedText: fullText,
      remainingText: '',
      fullSeconds,
      selectedSeconds: fullSeconds,
      remainingSeconds: 0,
      hasRemaining: false,
    }
  }

  const units = splitSentenceLikeUnits(fullText)
  const selectedUnits: string[] = []

  for (const unit of units) {
    const candidate = joinSpeechUnits([...selectedUnits, unit])
    const candidateSeconds = estimateTalkingSpeechDurationSeconds({ text: candidate, speed })

    if (selectedUnits.length === 0) {
      if (candidateSeconds <= maxSeconds) {
        selectedUnits.push(unit)
        if (candidateSeconds <= targetSeconds) {
          continue
        }
      }
      break
    }

    if (candidateSeconds <= targetSeconds) {
      selectedUnits.push(unit)
      continue
    }

    break
  }

  let selectedText = joinSpeechUnits(selectedUnits)
  let remainingText = joinSpeechUnits(units.slice(selectedUnits.length))
  let selectedSeconds = estimateTalkingSpeechDurationSeconds({ text: selectedText, speed })

  if (!selectedText || selectedSeconds > maxSeconds) {
    const words = fullText.split(/\s+/).filter(Boolean)
    const fallback = buildWordChunk(words, speed, targetSeconds, maxSeconds)
    selectedText = fallback.selectedText
    remainingText = fallback.remainingText
    selectedSeconds = estimateTalkingSpeechDurationSeconds({ text: selectedText, speed })
  }

  const remainingSeconds = estimateTalkingSpeechDurationSeconds({ text: remainingText, speed })

  return {
    fullText,
    selectedText,
    remainingText,
    fullSeconds,
    selectedSeconds,
    remainingSeconds,
    hasRemaining: remainingText.length > 0,
  }
}

function extractQuotedSegments(value: string) {
  return Array.from(value.matchAll(QUOTED_SEGMENT_RE))
    .map((match) => normalizeTalkingWhitespace(match[1] ?? ''))
    .filter(Boolean)
}

function stripQuotedSegments(value: string) {
  return normalizeTalkingWhitespace(value.replace(QUOTED_SEGMENT_RE, ' '))
}

function stripLeadingTimeMarker(value: string) {
  return normalizeTalkingWhitespace(value.replace(TIME_MARKER_RE, ''))
}

function sanitizeDirectionLine(value: string) {
  return stripLeadingTimeMarker(stripQuotedSegments(stripDecorators(value))).replace(INLINE_IGNORE_SEGMENT_RE, '').trim()
}

function pushUniqueLine(target: string[], value: string) {
  const normalized = normalizeTalkingWhitespace(value)
  if (!normalized || target.includes(normalized)) return
  target.push(normalized)
}

function isLikelySpokenUtterance(value: string) {
  const normalized = normalizeTalkingWhitespace(value)
  if (!normalized) return false

  const words = normalized.split(/\s+/).filter(Boolean)
  if (words.length >= 2) return true
  if (/[.!?…]/.test(normalized)) return true
  if (normalized.length >= 18) return true

  return false
}

function inferSectionHeader(line: string): IdeaSection {
  const normalized = normalizeTalkingWhitespace(stripDecorators(line)).replace(/:\s*$/, '')
  if (!normalized) return 'neutral'
  if (/^(?:fala|frase|texto falado|fala exata|o que ela fala|ela fala|voiceover|voice over|locucao|locucao exata|falado)$/i.test(normalized)) {
    return 'speech'
  }
  if (/^(?:tom|emocao|emocional|energia|expressao|performance|sentimento|vibe|clima|mood)$/i.test(normalized)) {
    return 'emotion'
  }
  if (/^(?:storyboard|roteiro|visual|cena|camera|direcao visual|ambiente|cenario|luz|lighting|shot|plano|take(?:\s+\d+)?|conceito)$/i.test(normalized)) {
    return 'visual'
  }
  if (/^(?:texto na tela|texto de tela|on-screen text|onscreen text|caption|legenda|sfx|fx|efeitos sonoros|sound effects?|musica|trilha(?: sonora)?|audio|audio de fundo)$/i.test(normalized)) {
    return 'ignore'
  }
  return 'neutral'
}

function parseIdeaLines(rawIdea: string) {
  const lines = rawIdea
    .split(/\r?\n/)
    .map((line) => stripDecorators(line))
    .filter(Boolean)

  const speechLines: string[] = []
  const emotionLines: string[] = []
  const visualLines: string[] = []
  const otherLines: string[] = []
  const quotedSpeechCandidates: string[] = []
  let currentSection: IdeaSection = 'neutral'

  for (const line of lines) {
    const quotedSegments = extractQuotedSegments(line)

    if (SPEECH_LABEL_RE.test(line)) {
      currentSection = 'speech'
      const content = normalizeTalkingWhitespace(line.replace(SPEECH_LABEL_RE, ''))
      if (quotedSegments.length > 0) quotedSegments.forEach((segment) => pushUniqueLine(speechLines, segment))
      else pushUniqueLine(speechLines, content)
      continue
    }

    if (EMOTION_LABEL_RE.test(line)) {
      currentSection = 'emotion'
      pushUniqueLine(emotionLines, sanitizeDirectionLine(line.replace(EMOTION_LABEL_RE, '')))
      continue
    }

    if (VISUAL_LABEL_RE.test(line) || STORYBOARD_LABEL_RE.test(line) || TIME_MARKER_RE.test(line)) {
      currentSection = 'visual'
      const withoutVisualLabel = VISUAL_LABEL_RE.test(line) ? line.replace(VISUAL_LABEL_RE, '') : line
      const withoutStoryboardLabel = STORYBOARD_LABEL_RE.test(withoutVisualLabel)
        ? withoutVisualLabel.replace(STORYBOARD_LABEL_RE, '')
        : withoutVisualLabel
      pushUniqueLine(visualLines, sanitizeDirectionLine(withoutStoryboardLabel))
      if (!IGNORE_LINE_LABEL_RE.test(line) && !IGNORE_SPEECH_HINT_RE.test(line)) {
        quotedSegments
          .filter((segment) => isLikelySpokenUtterance(segment))
          .forEach((segment) => pushUniqueLine(quotedSpeechCandidates, segment))
      }
      continue
    }

    if (IGNORE_LINE_LABEL_RE.test(line)) {
      currentSection = 'ignore'
      continue
    }

    const inferredSection = inferSectionHeader(line)
    if (inferredSection !== 'neutral') {
      currentSection = inferredSection
      continue
    }

    if (currentSection === 'ignore') {
      continue
    }

    if (currentSection === 'speech') {
      if (quotedSegments.length > 0) quotedSegments.forEach((segment) => pushUniqueLine(speechLines, segment))
      else pushUniqueLine(speechLines, line)
      continue
    }

    if (currentSection === 'emotion') {
      pushUniqueLine(emotionLines, sanitizeDirectionLine(line))
      continue
    }

    if (currentSection === 'visual') {
      pushUniqueLine(visualLines, sanitizeDirectionLine(line))
      if (!IGNORE_SPEECH_HINT_RE.test(line)) {
        quotedSegments
          .filter((segment) => isLikelySpokenUtterance(segment))
          .forEach((segment) => pushUniqueLine(quotedSpeechCandidates, segment))
      }
      continue
    }

    if (!IGNORE_LINE_LABEL_RE.test(line) && !IGNORE_SPEECH_HINT_RE.test(line)) {
      quotedSegments
        .filter((segment) => isLikelySpokenUtterance(segment))
        .forEach((segment) => pushUniqueLine(quotedSpeechCandidates, segment))
    }

    pushUniqueLine(otherLines, sanitizeDirectionLine(line))
  }

  return { speechLines, emotionLines, visualLines, otherLines, quotedSpeechCandidates }
}

function joinUnique(lines: string[]) {
  return lines
    .map((line) => normalizeTalkingWhitespace(line))
    .filter(Boolean)
    .filter((line, index, array) => array.indexOf(line) === index)
    .join(', ')
}

export function buildTalkingVideoIdeaFromParts(parts: TalkingVideoIdeaParts) {
  const blocks: string[] = []
  const speechText = normalizeTalkingWhitespace(parts.speechText ?? '')
  const expressionDirection = normalizeTalkingWhitespace(parts.expressionDirection ?? '')
  const visualPrompt = normalizeTalkingWhitespace(parts.visualPrompt ?? '')

  if (speechText) {
    blocks.push(`"${speechText}"`)
  }
  if (expressionDirection) {
    blocks.push(expressionDirection)
  }
  if (visualPrompt) {
    blocks.push(visualPrompt)
  }

  return blocks.join('\n\n')
}

export function parseTalkingVideoIdeaInput(params: {
  mode: SharedTalkingVideoMode
  ideaPrompt?: string
  speechText?: string
  expressionDirection?: string
  visualPrompt?: string
}) {
  const explicitSpeechText = normalizeTalkingWhitespace(params.speechText ?? '')
  const explicitExpression = normalizeTalkingWhitespace(params.expressionDirection ?? '')
  const explicitVisual = normalizeTalkingWhitespace(params.visualPrompt ?? '')
  const rawIdea = String(params.ideaPrompt ?? '').trim()
  const fallbackIdea = buildTalkingVideoIdeaFromParts({
    speechText: explicitSpeechText,
    expressionDirection: explicitExpression,
    visualPrompt: explicitVisual,
  })
  const ideaPrompt = rawIdea || fallbackIdea

  let speechText = explicitSpeechText
  let expressionDirection = explicitExpression
  let visualPrompt = explicitVisual
  let speechSource: TalkingVideoIdeaParseResult['speechSource'] = speechText ? 'explicit' : 'missing'

  if (ideaPrompt) {
    const parsedLines = parseIdeaLines(ideaPrompt)

    if (!speechText) {
      if (parsedLines.speechLines.length > 0) {
        speechText = normalizeTalkingWhitespace(parsedLines.speechLines.join(' '))
        speechSource = 'label'
      } else if (parsedLines.quotedSpeechCandidates.length > 0) {
        speechText = normalizeTalkingWhitespace(parsedLines.quotedSpeechCandidates.join(' '))
        speechSource = 'quoted'
      }
    }

    if (!expressionDirection) {
      const emotionCandidates = [
        ...parsedLines.emotionLines,
        ...parsedLines.otherLines.filter((line) => EMOTION_HINT_RE.test(line) && !VISUAL_HINT_RE.test(line)),
      ]
      expressionDirection = joinUnique(emotionCandidates)
    }

    if (!visualPrompt) {
      const filteredOthers = parsedLines.otherLines.filter((line) => normalizeTalkingWhitespace(line) !== speechText)
      const visualCandidates = [
        ...parsedLines.visualLines,
        ...filteredOthers.filter((line) => !EMOTION_HINT_RE.test(line) || VISUAL_HINT_RE.test(line) || DIRECTION_HINT_RE.test(line)),
      ]
      visualPrompt = joinUnique(visualCandidates)
    }
  }

  return {
    ideaPrompt,
    speechText,
    expressionDirection,
    visualPrompt,
    speechDetected: speechText.length > 0,
    emotionDetected: expressionDirection.length > 0,
    sceneDetected: visualPrompt.length > 0,
    speechSource,
  } satisfies TalkingVideoIdeaParseResult
}

export function calculateTalkingVideoCredits(params: {
  mode: SharedTalkingVideoMode
  quality?: string
  speechDetected: boolean
}) {
  const baseVideoCost = CREDIT_COST.talking_video ?? CREDIT_COST.video_veo ?? 50
  const qualitySurcharge = params.quality === '1080p' ? (CREDIT_COST.video_veo ?? 50) : 0
  const requiresVoicePipeline = params.mode === 'exact_speech' || params.speechDetected

  return baseVideoCost
    + qualitySurcharge
    + (requiresVoicePipeline ? (CREDIT_COST.voice ?? 8) + (CREDIT_COST.lipsync ?? 20) : 0)
}

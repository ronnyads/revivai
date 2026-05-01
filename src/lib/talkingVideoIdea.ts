export type SharedTalkingVideoMode = 'exact_speech' | 'veo_natural'

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

const EMOTION_LABEL_RE = /^(?:tom|emocao|emocional|energia|expressao|performance|sentimento|vibe|clima|mood)\s*:\s*/i
const VISUAL_LABEL_RE = /^(?:cena|visual|direcao visual|camera|movimento|enquadramento|ambiente|cenario|luz|lighting|shot|plano)\s*:\s*/i
const SPEECH_LABEL_RE = /^(?:fala|frase|texto falado|fala exata|o que ela fala|ela fala)\s*:\s*/i
const EMOTION_HINT_RE = /\b(intim[oa]|emocional|humano|acolhedor|acolhedora|sincero|sincera|casual|cinematico|cinematografico|natural|dramatico|dramatico|leve|calmo|calma|confiante|doce|sensivel|soft|warm|friendly|testimonial|depoimento)\b/i
const VISUAL_HINT_RE = /\b(camera|cinematic|cinematografico|cinematica|golden hour|close-up|close up|medium shot|plano|enquadramento|luz|lighting|vento|parque|rua|ambiente|cenario|fundo|selfie|tiktok|movimento)\b/i
const DIRECTION_HINT_RE = /\b(camera|luz|plano|shot|golden hour|cenario|ambiente|movimento|olhando para camera|olhando pra camera|vento|close|medium|cinemat)\b/i

function stripDecorators(value: string) {
  return value
    .replace(/^[#>*\-\s]+/, '')
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

function parseQuotedSpeech(ideaPrompt: string) {
  const quoteMatches = Array.from(ideaPrompt.matchAll(/["“”«»]([^"“”«»]{3,320})["“”«»]/g))
    .map((match) => normalizeTalkingWhitespace(match[1] ?? ''))
    .filter(Boolean)

  if (quoteMatches.length === 0) {
    return { speechText: '', visualIdea: ideaPrompt }
  }

  const speechText = quoteMatches.join(' ')
  const visualIdea = normalizeTalkingWhitespace(
    ideaPrompt.replace(/["“”«»][^"“”«»]{3,320}["“”«»]/g, ' '),
  )

  return { speechText, visualIdea }
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

  for (const line of lines) {
    if (SPEECH_LABEL_RE.test(line)) {
      speechLines.push(normalizeTalkingWhitespace(line.replace(SPEECH_LABEL_RE, '')))
      continue
    }
    if (EMOTION_LABEL_RE.test(line)) {
      emotionLines.push(normalizeTalkingWhitespace(line.replace(EMOTION_LABEL_RE, '')))
      continue
    }
    if (VISUAL_LABEL_RE.test(line)) {
      visualLines.push(normalizeTalkingWhitespace(line.replace(VISUAL_LABEL_RE, '')))
      continue
    }
    otherLines.push(line)
  }

  return { speechLines, emotionLines, visualLines, otherLines }
}

function looksLikeDialogue(line: string) {
  const normalized = normalizeTalkingWhitespace(line)
  if (!normalized) return false
  if (DIRECTION_HINT_RE.test(normalized)) return false
  if (normalized.length > 220) return false
  if (/\b(eu|voce|voces|me|te|mim|pra|para|gente|chat|pensando|preciso|quero|tava|anda)\b/i.test(normalized)) {
    return true
  }
  return /[.!?…]$/.test(normalized)
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
    const quoted = parseQuotedSpeech(ideaPrompt)
    const parsedLines = parseIdeaLines(quoted.visualIdea)

    if (!speechText) {
      if (parsedLines.speechLines.length > 0) {
        speechText = normalizeTalkingWhitespace(parsedLines.speechLines.join(' '))
        speechSource = 'label'
      } else if (quoted.speechText) {
        speechText = quoted.speechText
        speechSource = 'quoted'
      } else if (params.mode === 'exact_speech') {
        const candidate = parsedLines.otherLines.find(looksLikeDialogue) ?? ''
        if (candidate) {
          speechText = normalizeTalkingWhitespace(candidate)
          speechSource = 'heuristic'
          parsedLines.otherLines.splice(parsedLines.otherLines.indexOf(candidate), 1)
        }
      }
    }

    if (!expressionDirection) {
      const emotionCandidates = [
        ...parsedLines.emotionLines,
        ...parsedLines.otherLines.filter((line) => EMOTION_HINT_RE.test(line) && !looksLikeDialogue(line)),
      ]
      expressionDirection = joinUnique(emotionCandidates)
    }

    if (!visualPrompt) {
      const filteredOthers = parsedLines.otherLines.filter((line) => normalizeTalkingWhitespace(line) !== speechText)
      const visualCandidates = [
        ...parsedLines.visualLines,
        ...filteredOthers.filter((line) => !EMOTION_HINT_RE.test(line) || VISUAL_HINT_RE.test(line)),
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

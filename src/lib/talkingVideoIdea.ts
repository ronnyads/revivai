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

export type TalkingVideoSpeechChunkPlan = {
  fullText: string
  selectedText: string
  remainingText: string
  fullSeconds: number
  selectedSeconds: number
  remainingSeconds: number
  hasRemaining: boolean
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

function splitSentenceLikeUnits(text: string) {
  const normalized = normalizeTalkingWhitespace(text)
  if (!normalized) return []

  const matches = normalized.match(/[^.!?…]+[.!?…]?/g) ?? []
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

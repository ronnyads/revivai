import { GoogleGenerativeAI } from '@google/generative-ai'

const DEFAULT_RETRY_PROMPT = `Restore this photograph with minimal intervention. Focus only on removing visible damage marks, dust, and scratches. Do NOT change faces, expressions, composition, or overall appearance. Preserve everything as close to the original as possible.`

// Cadeia de fallback — tenta em ordem até um funcionar
const FALLBACK_CHAIN = [
  'gemini-2.0-flash-exp-image-generation',
  'gemini-2.5-flash-image',
  'gemini-3-pro-image-preview',
]

async function tryRestoreWithModel(
  model: string,
  imageBuffer: Buffer,
  prompt: string,
  persona?: string | null,
): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GOOGLE_API_KEY não configurada')

  const genAI = new GoogleGenerativeAI(apiKey)
  const genModel = genAI.getGenerativeModel({
    model,
    ...(persona ? { systemInstruction: persona } : {}),
  })

  const base64 = imageBuffer.toString('base64')

  const result = await genModel.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        { inlineData: { mimeType: 'image/jpeg', data: base64 } },
      ],
    }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
    } as any,
  })

  const parts = result.response.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))

  if (!imagePart?.inlineData?.data) {
    const finishReason = result.response.candidates?.[0]?.finishReason
    const partTypes = parts.map((p: any) => Object.keys(p))
    throw new Error(`Sem imagem | finishReason=${finishReason} | parts=${JSON.stringify(partTypes)}`)
  }

  return Buffer.from(imagePart.inlineData.data, 'base64')
}

export async function restoreWithGemini(
  imageBuffer: Buffer,
  prompt: string,
  model: string,
  retry = false,
  persona?: string | null,
  retryPrompt?: string | null,
): Promise<Buffer> {
  const activePrompt = retry ? (retryPrompt || DEFAULT_RETRY_PROMPT) : prompt

  // Constrói cadeia: modelo escolhido primeiro, depois os fallbacks (sem duplicar)
  const chain = [model, ...FALLBACK_CHAIN.filter(m => m !== model)]

  let lastError: Error = new Error('Nenhum modelo tentado')

  for (let i = 0; i < chain.length; i++) {
    const currentModel = chain[i]
    console.log(`[gemini] Tentativa ${i + 1}/${chain.length} model=${currentModel} retry=${retry}`)
    try {
      const result = await tryRestoreWithModel(currentModel, imageBuffer, activePrompt, persona)
      console.log(`[gemini] Sucesso com model=${currentModel}`)
      return result
    } catch (err: any) {
      console.warn(`[gemini] model=${currentModel} falhou: ${err.message}`)
      lastError = err
    }
  }

  throw new Error(`Todos os modelos falharam. Último erro: ${lastError.message}`)
}

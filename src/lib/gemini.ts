import { GoogleGenerativeAI } from '@google/generative-ai'

const RETRY_PROMPT = `Restore this photograph with minimal intervention. Focus only on removing visible damage marks, dust, and scratches. Do NOT change faces, expressions, composition, or overall appearance. Preserve everything as close to the original as possible.`

export async function restoreWithGemini(
  imageBuffer: Buffer,
  prompt: string,
  model: string,
  retry = false,
): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GOOGLE_API_KEY não configurada')

  const genAI = new GoogleGenerativeAI(apiKey)
  const genModel = genAI.getGenerativeModel({ model })

  const base64 = imageBuffer.toString('base64')
  const activePrompt = retry ? RETRY_PROMPT : prompt

  const result = await genModel.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { text: activePrompt },
        { inlineData: { mimeType: 'image/jpeg', data: base64 } },
      ],
    }],
    generationConfig: {
      responseModalities: ['IMAGE'],
    } as any,
  })

  const parts = result.response.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))

  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini não retornou imagem — verifique GOOGLE_API_KEY e modelo')
  }

  return Buffer.from(imagePart.inlineData.data, 'base64')
}

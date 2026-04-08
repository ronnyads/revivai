import { GoogleGenerativeAI } from '@google/generative-ai'

const RESTORATION_PROMPT = `A high-resolution, meticulously restored vintage photograph. The primary goal is the exact preservation of the original identities, expressions, and features of the individuals without loss of originality. Meticulously remove all physical damage, deep white cracks, stains, dust, and watermarks. Seamlessly rebuild the missing or heavily damaged details, such as eyes, teeth, and hair texture, strictly based on the surviving contours and natural facial structure. Avoid over-smoothing; the restored skin must have realistic, high-fidelity texture, not a fake or plastic finish. Preserve the authentic vintage lighting, shadows, and the original color tone (whether sépia or black and white). The resulting image must look like a perfectly preserved, high-quality vintage print.`

const RETRY_PROMPT = `Restore this vintage photograph with minimal intervention. Focus only on removing visible damage marks, dust, and scratches. Do NOT change faces, expressions, composition, or overall appearance. Preserve everything as close to the original as possible. The result must look like the same photo, just cleaned.`

export async function restoreWithGemini(imageBuffer: Buffer, retry = false): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GOOGLE_API_KEY não configurada')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' })

  const base64 = imageBuffer.toString('base64')
  const prompt = retry ? RETRY_PROMPT : RESTORATION_PROMPT

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
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

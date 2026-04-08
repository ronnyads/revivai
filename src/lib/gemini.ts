import { GoogleGenerativeAI } from '@google/generative-ai'

const RESTORATION_PROMPT = `You are an expert photo restoration specialist. Restore this damaged vintage photograph.

RESTORE:
- Remove ALL physical damage: white cracks, tears, scratches, stains, dust spots, watermarks
- Seamlessly reconstruct missing or heavily damaged areas using surrounding context and natural facial structure
- Fill in damaged regions naturally — hair, skin, background, clothing

PRESERVE (critical — never change these):
- The exact identity, facial features, and expression of every person
- Authentic vintage lighting, shadows, and depth
- Original color tone exactly as-is: sepia, black and white, or faded color — do NOT add or remove color
- Natural, realistic skin texture — NO smoothing, NO plastic or AI-generated look

OUTPUT: A perfectly preserved, high-quality vintage print with all damage removed and original identity intact.`

export async function restoreWithGemini(imageBuffer: Buffer): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GOOGLE_API_KEY não configurada')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' })

  const base64 = imageBuffer.toString('base64')

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        { text: RESTORATION_PROMPT },
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

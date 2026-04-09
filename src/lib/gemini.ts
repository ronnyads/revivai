const DEFAULT_RETRY_PROMPT = `Restore this photograph with minimal intervention. Focus only on removing visible damage marks, dust, and scratches. Do NOT change faces, expressions, composition, or overall appearance. Preserve everything as close to the original as possible.`

export async function restoreWithGemini(
  imageBuffer: Buffer,
  prompt: string,
  model: string,
  retry = false,
  persona?: string | null,
  retryPrompt?: string | null,
): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GOOGLE_API_KEY não configurada')

  const base64 = imageBuffer.toString('base64')
  const activePrompt = retry ? (retryPrompt || DEFAULT_RETRY_PROMPT) : prompt

  // Use direct REST call to v1alpha — the SDK default (v1beta) does not support
  // responseModalities: IMAGE for these models.
  const url = `https://generativelanguage.googleapis.com/v1alpha/models/${model}:generateContent?key=${apiKey}`

  const body: Record<string, unknown> = {
    contents: [{
      role: 'user',
      parts: [
        { text: activePrompt },
        { inline_data: { mime_type: 'image/jpeg', data: base64 } },
      ],
    }],
    generationConfig: {
      responseModalities: ['IMAGE'],
    },
  }

  if (persona) {
    body.system_instruction = { parts: [{ text: persona }] }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API ${res.status}: ${errText}`)
  }

  const data = await res.json()
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'))

  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini não retornou imagem — verifique GOOGLE_API_KEY e modelo')
  }

  return Buffer.from(imagePart.inlineData.data, 'base64')
}

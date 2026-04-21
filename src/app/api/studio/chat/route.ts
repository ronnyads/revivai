import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPTS: Record<string, string> = {
  ugc: 'Você é um especialista em criativos UGC de alta conversão para e-commerce. Ajude a criar hooks, roteiros, legendas e ideias de anúncios para redes sociais. Seja direto, criativo e sempre responda em português.',
  video: 'Você é um especialista em vídeos virais para TikTok, Reels e YouTube Shorts. Ajude com conceitos visuais, storyboards e roteiros de vídeo. Seja inspirador, visual e sempre responda em português.',
}

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_API = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent`


export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const { projectId, agentType = 'ugc', message, history = [] } = body
  console.log('[chat] received:', { agentType, messageLen: message?.length, historyLen: history?.length })
  if (!message?.trim()) return NextResponse.json({ error: 'Empty message', received: body }, { status: 400 })

  await supabase.from('studio_chat_messages').insert({
    user_id: user.id,
    project_id: projectId || null,
    agent_type: agentType,
    role: 'user',
    content: message,
  })

  const geminiHistory = history.map((m: { role: string; content: string }) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const geminiBody = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPTS[agentType] ?? SYSTEM_PROMPTS.ugc }] },
    contents: [
      ...geminiHistory,
      { role: 'user', parts: [{ text: message }] },
    ],
    generationConfig: { temperature: 0.9, maxOutputTokens: 1024 },
  }

  console.log('[chat] key present:', !!process.env.GEMINI_API_KEY, 'model:', GEMINI_MODEL)

  const geminiRes = await fetch(`${GEMINI_API}?key=${process.env.GEMINI_API_KEY}&alt=sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiBody),
  })

  if (!geminiRes.ok || !geminiRes.body) {
    const err = await geminiRes.text()
    console.error('[chat] Gemini error:', geminiRes.status, err)
    return NextResponse.json({ error: err, status: geminiRes.status }, { status: 500 })
  }

  let fullResponse = ''

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const reader = geminiRes.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const json = line.slice(6).trim()
            if (!json || json === '[DONE]') continue
            try {
              const parsed = JSON.parse(json)
              const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
              if (text) {
                fullResponse += text
                controller.enqueue(encoder.encode(text))
              }
            } catch {}
          }
        }
      } finally {
        controller.close()
        if (fullResponse) {
          await supabase.from('studio_chat_messages').insert({
            user_id: user.id,
            project_id: projectId || null,
            agent_type: agentType,
            role: 'assistant',
            content: fullResponse,
          })
        }
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

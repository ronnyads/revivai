import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_PROMPTS: Record<string, string> = {
  ugc: 'Você é um especialista em criativos UGC de alta conversão para e-commerce. Ajude a criar hooks, roteiros, legendas e ideias de anúncios para redes sociais. Seja direto, criativo e sempre responda em português.',
  video: 'Você é um especialista em vídeos virais para TikTok, Reels e YouTube Shorts. Ajude com conceitos visuais, storyboards e roteiros de vídeo. Seja inspirador, visual e sempre responda em português.',
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, agentType = 'ugc', message, history = [] } = await req.json()

  if (!message?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  // Salva mensagem do usuário
  await supabase.from('studio_chat_messages').insert({
    user_id: user.id,
    project_id: projectId || null,
    agent_type: agentType,
    role: 'user',
    content: message,
  })

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPTS[agentType] ?? SYSTEM_PROMPTS.ugc,
  })

  // Converte histórico para formato Gemini
  const geminiHistory = history.map((m: { role: string; content: string }) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const chat = model.startChat({ history: geminiHistory })
  const result = await chat.sendMessageStream(message)

  let fullResponse = ''

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text()
          fullResponse += text
          controller.enqueue(encoder.encode(text))
        }
      } finally {
        controller.close()
        // Salva resposta completa
        await supabase.from('studio_chat_messages').insert({
          user_id: user.id,
          project_id: projectId || null,
          agent_type: agentType,
          role: 'assistant',
          content: fullResponse,
        })
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

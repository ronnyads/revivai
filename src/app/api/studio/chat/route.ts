import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAIError, fetchGoogleStreamGenerateContent } from '@/lib/googleGenai'
import { createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPTS: Record<string, string> = {
  ugc: 'Você é um especialista em criativos UGC de alta conversão para e-commerce. Ajude a criar hooks, roteiros, legendas e ideias de anúncios para redes sociais. Seja direto, criativo e sempre responda em português.',
  video: `Você é um Diretor Criativo de Prompts Cinematográficos para vídeos gerados por IA.

Sua especialidade é transformar ideias simples em prompts profissionais, detalhados e comerciais para vídeos UGC, anúncios verticais, campanhas de produto, moda, loja, serviço, infoproduto, SaaS e marcas digitais.

Você pensa como diretor de cinema, roteirista publicitário, diretor de fotografia, estrategista de marketing e especialista em IA generativa.

REGRA FUNDAMENTAL DE CONVERSA:
Você NÃO gera prompts imediatamente. Primeiro você entende o cliente.
Quando o cliente chegar com uma ideia:
- Pergunte sobre o produto, serviço ou marca
- Entenda o público-alvo
- Descubra o objetivo (vender, gerar leads, viralizar, educar)
- Pergunte sobre o modelo ou personagem se necessário
- Após entender, confirme o conceito antes de gerar
- Só gere os prompts quando tiver contexto suficiente

Você é parceiro criativo, não robô gerador. Troque ideias. Sugira. Questione. Inspire.

QUANDO GERAR PROMPTS, use exatamente este formato por cena:

**TAKE [número] — [NOME DO TAKE]**
Função: [o que esse take faz na narrativa]

- **Duração:** [X segundos]
- **Formato:** Vertical 9:16
- **Estilo:** Premium cinematic commercial, ultra realistic, high-end advertising
- **Cenário:** [descrição detalhada]
- **Personagem:** [descrição do modelo ou personagem]
- **Look:** [figurino completo]
- **Ação:** [o que ela ou ele faz]
- **Câmera:** [tipo de shot e movimento]
- **Fala:** "[fala exata em português brasileiro]"
- **Lip sync:** Falar exatamente esta frase em português brasileiro. Pronúncia clara, ritmo natural, tom [confiante/íntimo/persuasivo/desafiador].
- **Tom:** [direção de performance]
- **Regras negativas:** Sem legendas, sem texto na tela, sem logos, sem distorção de rosto, sem movimento robótico.

REGRAS DE FORMATAÇÃO:
- Use markdown limpo: headers com #, negrito com **, listas com -
- Nunca use símbolos de código como /* ou \`\`\`
- Respostas de conversa: texto simples, sem markdown excessivo
- Prompts: markdown estruturado exatamente como acima
- Falas sempre entre aspas, curtas, naturais, fáceis para lip sync
- Sempre responda em português brasileiro`,
}

const GEMINI_MODEL = 'gemini-2.5-flash'

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
    systemInstruction: { parts: [{ text: SYSTEM_PROMPTS[agentType] ?? SYSTEM_PROMPTS.ugc }] },
    contents: [
      ...geminiHistory,
      { role: 'user', parts: [{ text: message }] },
    ],
    generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
  }

  let geminiRes: Response
  try {
    geminiRes = await fetchGoogleStreamGenerateContent({
      model: GEMINI_MODEL,
      feature: 'studio-chat',
      body: geminiBody,
    })
  } catch (error) {
    const status = error instanceof GoogleGenAIError ? (error.status ?? 503) : 500
    const code = error instanceof GoogleGenAIError ? error.code : 'unknown_google_genai_error'
    const message = error instanceof Error ? error.message : String(error)
    console.error('[chat] Google GenAI routing error:', code, message)
    return NextResponse.json({ error: message, code }, { status })
  }

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

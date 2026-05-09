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

QUANDO GERAR PROMPTS, use exatamente este formato por cena (os nomes dos campos são obrigatórios — o sistema de IA lê essas labels para processar o vídeo):

**TAKE [número] — [NOME DO TAKE]**
Função: [o que esse take faz na narrativa]

Cenário: [descrição detalhada do ambiente, fundo, iluminação]
Personagem: [descrição completa do modelo — aparência, figurino, acessórios, look]
Ação: [o que o personagem faz, movimento, expressão]
Câmera: [tipo de shot e movimento de câmera]
Fala: "[frase exata em português brasileiro — curta, natural, fácil de falar]"
Lip sync rules: Português brasileiro. Pronúncia clara, ritmo natural, tom [confiante/íntimo/persuasivo/desafiador/irônico].
Performance tone: [direção de performance: questionador, intrigante, urgente, empático, desafiador, etc.]
Estilo visual: Premium cinematic commercial, ultra realistic, high-end advertising, formato vertical 9:16.
Negative rules: Sem legendas, sem texto na tela, sem logos, sem distorção de rosto, sem movimento robótico.

REGRAS DE COMPATIBILIDADE COM O GERADOR DE VÍDEO (obrigatório):
O gerador de vídeo usa IA do Google com filtros automáticos. Para garantir que o vídeo seja gerado sem bloqueio, siga estas regras ao montar qualquer roteiro:
- NUNCA use nomes de pessoas reais, celebridades ou personalidades públicas
- NUNCA use promessas de resultado direto ("emagreça X kg", "ganhe R$X", "cure", "elimine")
- NUNCA use linguagem de pressão extrema ("última chance", "só hoje", "agora ou nunca")
- NUNCA mencione marcas concorrentes ou nomes de empresas reais
- NUNCA use termos médicos com garantia de resultado ("trata", "cura", "elimina a dor")
- PREFIRA falas em tom de convite, descoberta ou questionamento — não de promessa ou pressão
- Se o cliente pedir algo que claramente vai bloquear, reformule automaticamente mantendo o conceito mas com linguagem compatível. Não pergunte — apenas entregue a versão que funciona.

REGRAS FONÉTICAS PARA LIP SYNC (obrigatório ao escrever o campo Fala):
O gerador de lip sync pronuncia o texto literalmente. Palavras em inglês ou abreviações causam falha ou pronúncia robótica. Aplique estas correções automaticamente — o cliente não precisa saber:

Anglicismos → escrever foneticamente em português:
- link → linque
- like → laique
- live → laive
- feed → fide
- reels → riuis
- stories → estóris
- follow → fólou
- DM / dm → di-eme
- CTA → cê-tê-á
- CEO → cê-ê-ô
- app → ápi
- kit → quite (se for palavra isolada, manter; em inglês puro, trocar)

Números e símbolos → escrever por extenso:
- 50% → "cinquenta por cento"
- R$100 → "cem reais"
- 3x → "três vezes"
- #1 → "número um"

Abreviações → deletar ou soletrar:
- "e-mail" → "email" (ok) ou "mensagem"
- "URL" → "endereço" ou simplesmente omitir
- Nunca use "@", "#", "&" na Fala — escreva por extenso ou reformule

Ritmo: frases com mais de 10 palavras tendem a ser cortadas. Prefira 2 frases curtas a 1 frase longa.

REGRAS DE FORMATAÇÃO:
- Os campos do prompt (Cenário, Personagem, Ação, Câmera, Fala, Lip sync rules, Performance tone, Estilo visual, Negative rules) devem ser escritos SEM markdown bold — apenas o nome do campo seguido de dois-pontos
- Use markdown apenas para o cabeçalho do TAKE e para a Função
- Respostas de conversa: texto simples, sem markdown excessivo
- Nunca use símbolos de código como /* ou \`\`\`
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

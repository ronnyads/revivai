'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  projectId: string
  userId: string
}

export default function StudioChatPanel({ projectId, userId }: Props) {
  const [agent, setAgent] = useState<'ugc' | 'video'>('ugc')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadHistory(agent)
  }, [agent, projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadHistory(agentType: 'ugc' | 'video') {
    setLoading(true)
    try {
      const res = await fetch(`/api/studio/chat/history?projectId=${projectId}&agentType=${agentType}`)
      const data = await res.json()
      setMessages(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)

    // Placeholder para streaming
    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await fetch('/api/studio/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          agentType: agent,
          message: text,
          history: messages.slice(-20), // últimas 20 mensagens como contexto
        }),
      })

      if (!res.ok || !res.body) throw new Error('Erro na resposta')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: accumulated }
          return updated
        })
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: 'Erro ao conectar com a IA. Tente novamente.' }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="w-96 shrink-0 flex flex-col border-l border-zinc-200 bg-white h-full">
      {/* Agent tabs */}
      <div className="shrink-0 px-4 pt-4 pb-0">
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
          <button
            onClick={() => setAgent('ugc')}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${agent === 'ugc' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            🎬 UGC Creatives
          </button>
          <button
            onClick={() => setAgent('video')}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-all ${agent === 'video' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            🎥 Ideias de Vídeo
          </button>
        </div>
        <p className="text-[10px] text-zinc-400 mt-2 px-1">
          {agent === 'ugc' ? 'Hooks, roteiros e copy de alta conversão' : 'Conceitos, storyboards e roteiros de vídeo'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={20} className="animate-spin text-zinc-300" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="text-3xl">{agent === 'ugc' ? '🎬' : '🎥'}</div>
            <p className="text-sm font-medium text-zinc-700">
              {agent === 'ugc' ? 'Agente UGC Creatives' : 'Agente Ideias de Vídeo'}
            </p>
            <p className="text-xs text-zinc-400 max-w-[200px]">
              {agent === 'ugc'
                ? 'Pergunte sobre hooks, roteiros, copy ou ideias de anúncios.'
                : 'Pergunte sobre conceitos visuais, storyboards ou roteiros de vídeo.'}
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs mr-2 mt-0.5 shrink-0">
                  {agent === 'ugc' ? '🎬' : '🎥'}
                </div>
              )}
              <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-zinc-100 text-zinc-800 rounded-bl-sm'
              }`}>
                {msg.content || (
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 p-4 border-t border-zinc-100">
        <div className="flex items-end gap-2 bg-zinc-50 border border-zinc-200 rounded-2xl px-3 py-2 focus-within:border-indigo-400 focus-within:bg-white transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={agent === 'ugc' ? 'Crie um hook para produto de beleza...' : 'Ideias de vídeo para TikTok...'}
            rows={1}
            disabled={streaming}
            className="flex-1 bg-transparent text-sm text-zinc-800 placeholder-zinc-400 resize-none focus:outline-none max-h-32 disabled:opacity-50"
            style={{ minHeight: '20px' }}
          />
          <button
            onClick={sendMessage}
            disabled={streaming || !input.trim()}
            className="w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {streaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p className="text-[10px] text-zinc-400 mt-1.5 text-center">Enter para enviar · Shift+Enter para nova linha</p>
      </div>
    </div>
  )
}

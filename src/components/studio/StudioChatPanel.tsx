'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Clapperboard, Lightbulb, Loader2, PanelRightClose, Send, Sparkles } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  projectId: string
  userId: string
  onClose: () => void
}

const AGENT_META = {
  ugc: {
    label: 'UGC Creatives',
    prompt: 'Crie 5 hooks premium para um produto de beleza com forte apelo visual...',
    emptyTitle: 'Direcao criativa',
    emptyCopy: 'Hooks, scripts e copy premium.',
    Icon: Clapperboard,
  },
  video: {
    label: 'Ideias de Video',
    prompt: 'Monte um storyboard de 20 segundos para um Reels com ritmo premium...',
    emptyTitle: 'Conceitos visuais',
    emptyCopy: 'Storyboards, takes e narrativa viral.',
    Icon: Lightbulb,
  },
} as const

export default function StudioChatPanel({ projectId, userId, onClose }: Props) {
  const [agent, setAgent] = useState<'ugc' | 'video'>('ugc')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const agentMeta = AGENT_META[agent]

  const loadHistory = useCallback(async (agentType: 'ugc' | 'video') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/studio/chat/history?projectId=${projectId}&agentType=${agentType}`)
      const data = await res.json()
      setMessages(Array.isArray(data) ? data : [])
    } catch {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadHistory(agent)
  }, [agent, loadHistory])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: messages.length > 0 ? 'smooth' : 'auto' })
  }, [messages])

  useEffect(() => {
    if (!textareaRef.current) return
    textareaRef.current.style.height = '0px'
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
  }, [input])

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: Message = { role: 'user', content: text }
    const assistantMsg: Message = { role: 'assistant', content: '' }
    const history = messages.filter((message) => message.content.trim()).slice(-20)

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInput('')
    setStreaming(true)

    try {
      const res = await fetch('/api/studio/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          agentType: agent,
          message: text,
          history,
        }),
      })

      if (!res.ok || !res.body) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody?.error ?? `Erro ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: accumulated }
          return updated
        })
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'falha desconhecida'
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Erro: ${errorMessage}`,
        }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage()
    }
  }

  return (
    <aside className="relative h-full w-[392px] min-w-[360px] max-w-[42vw] shrink-0 overflow-hidden border-l border-white/8 bg-[#06080A]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(84,214,246,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />

      <div className="relative flex h-full flex-col">
        <div className="shrink-0 border-b border-white/8 bg-[#07090B]/95 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#54D6F6]/18 bg-[#0C171A] px-3 py-1 font-label text-[10px] uppercase tracking-[0.24em] text-[#54D6F6]">
                <Sparkles size={12} />
                Creative Copilot
              </div>
              <h3 className="mt-3 font-display text-base font-semibold tracking-tight text-white">
                Chat do board
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              title="Fechar painel de chat"
              aria-label="Fechar painel de chat"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-white/8 bg-white/[0.03] text-white/55 transition-all hover:border-[#54D6F6]/30 hover:text-[#54D6F6]"
            >
              <PanelRightClose size={16} />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 font-label text-[9px] uppercase tracking-[0.18em] text-white/38">
              {userId ? 'Memoria ativa' : 'Modo temporario'}
            </span>
            <span className="rounded-full border border-[#54D6F6]/12 bg-[#0C171A] px-2.5 py-1 font-label text-[9px] uppercase tracking-[0.18em] text-[#54D6F6]">
              Streaming
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {(Object.entries(AGENT_META) as Array<[typeof agent, (typeof AGENT_META)[typeof agent]]>).map(([key, meta]) => {
              const TabIcon = meta.Icon
              const isActive = agent === key

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAgent(key)}
                  className={`rounded-[18px] border px-3 py-2.5 text-left transition-all ${
                    isActive
                      ? 'border-[#54D6F6]/25 bg-[#0C171A] shadow-[0_18px_40px_rgba(84,214,246,0.08)]'
                      : 'border-white/8 bg-white/[0.03] hover:border-[#54D6F6]/18 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-[12px] border ${
                      isActive
                        ? 'border-[#54D6F6]/30 bg-[#54D6F6]/10 text-[#54D6F6]'
                        : 'border-white/8 bg-black/30 text-white/50'
                    }`}>
                      <TabIcon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className={`font-label text-[10px] uppercase tracking-[0.22em] ${isActive ? 'text-[#54D6F6]' : 'text-white/30'}`}>
                        Agente
                      </p>
                      <p className={`mt-1 text-sm font-semibold leading-none ${isActive ? 'text-white' : 'text-white/72'}`}>
                        {meta.label}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[#06080A] to-transparent" />
          <div className="relative flex h-full flex-col gap-4 overflow-y-auto px-5 py-5">
            {loading ? (
              <div className="flex h-full flex-col justify-center gap-3">
                {[0, 1, 2].map((index) => (
                  <div
                    key={index}
                    className={`rounded-[24px] border border-white/8 bg-white/[0.03] p-4 ${index === 1 ? 'ml-8' : 'mr-8'}`}
                  >
                    <div className="h-2 w-20 rounded-full bg-white/8" />
                    <div className="mt-4 h-2 w-full rounded-full bg-white/6" />
                    <div className="mt-2 h-2 w-4/5 rounded-full bg-white/6" />
                    <div className="mt-2 h-2 w-2/3 rounded-full bg-white/6" />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-[#54D6F6]/18 bg-[#0C171A] text-[#54D6F6] shadow-[0_24px_60px_rgba(84,214,246,0.12)]">
                  <agentMeta.Icon size={24} />
                </div>
                <p className="mt-5 font-label text-[10px] uppercase tracking-[0.28em] text-[#54D6F6]">
                  {agentMeta.label}
                </p>
                <h4 className="mt-2 max-w-[220px] font-display text-[32px] font-semibold leading-[1.05] tracking-tight text-white">
                  {agentMeta.emptyTitle}
                </h4>
                <p className="mt-3 max-w-[240px] text-sm leading-relaxed text-white/38">
                  {agentMeta.emptyCopy}
                </p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isAssistant = message.role === 'assistant'
                const MessageIcon = agentMeta.Icon
                const isStreamingMessage = streaming && isAssistant && index === messages.length - 1

                return (
                  <div key={`${message.role}-${index}`} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                    <div className={`flex max-w-[90%] gap-3 ${isAssistant ? 'items-start' : 'items-end flex-row-reverse'}`}>
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border ${
                        isAssistant
                          ? 'border-[#54D6F6]/18 bg-[#0C171A] text-[#54D6F6]'
                          : 'border-[#54D6F6]/28 bg-[#54D6F6]/10 text-[#54D6F6]'
                      }`}>
                        <MessageIcon size={15} />
                      </div>

                      <div
                        className={`rounded-[24px] border px-4 py-3 ${
                          isAssistant
                            ? 'border-white/8 bg-white/[0.04] text-[#D7E4E8] shadow-[0_18px_50px_rgba(0,0,0,0.22)]'
                            : 'border-[#54D6F6]/28 bg-cyan-gradient text-[#04212A] shadow-[0_22px_55px_rgba(84,214,246,0.18)]'
                        }`}
                      >
                        <div className={`mb-2 flex items-center gap-2 font-label text-[9px] uppercase tracking-[0.22em] ${
                          isAssistant ? 'text-[#54D6F6]' : 'text-[#083641]/80'
                        }`}>
                          <span>{isAssistant ? agentMeta.label : 'Voce'}</span>
                        </div>

                        <div className="whitespace-pre-wrap text-sm leading-7">
                          {message.content || (
                            <span className="inline-flex items-center gap-1">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current/50" />
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current/40 [animation-delay:120ms]" />
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current/30 [animation-delay:240ms]" />
                            </span>
                          )}
                          {isStreamingMessage && (
                            <span className="ml-1 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-[#54D6F6]" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-white/8 bg-[#06080A]/95 px-5 py-4 backdrop-blur-xl">
          <div className="rounded-[26px] border border-white/8 bg-white/[0.03] px-4 py-3 transition-all focus-within:border-[#54D6F6]/30 focus-within:bg-[#0C171A]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={agentMeta.prompt}
              rows={1}
              disabled={streaming}
              className="max-h-40 min-h-[26px] w-full resize-none bg-transparent text-sm leading-6 text-[#D7E4E8] placeholder:text-white/28 focus:outline-none disabled:opacity-50"
            />

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="font-label text-[9px] uppercase tracking-[0.2em] text-white/28">
                Enter envia
              </p>

              <button
                type="button"
                onClick={sendMessage}
                disabled={streaming || !input.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] bg-cyan-gradient text-[#04212A] shadow-[0_18px_40px_rgba(84,214,246,0.16)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {streaming ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

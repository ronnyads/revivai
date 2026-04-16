'use client'

import { useState, useEffect } from 'react'
import { Link2, Film, Trash2, ArrowUp, ArrowDown, Plus } from 'lucide-react'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function JoinGenerator({ initial, onGenerate }: Props) {
  const [urls, setUrls] = useState<string[]>(() => {
    const raw = initial.video_urls
    if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
    return []
  })
  const [manualUrl, setManualUrl] = useState('')

  // Atualiza quando chega novo vídeo conectado via canvas
  useEffect(() => {
    const raw = initial.video_urls
    if (Array.isArray(raw)) {
      setUrls(raw.map(String).filter(Boolean))
    }
  }, [JSON.stringify(initial.video_urls)])

  function addManual() {
    const trimmed = manualUrl.trim()
    if (!trimmed) return
    setUrls(prev => [...prev, trimmed])
    setManualUrl('')
  }

  function remove(i: number) {
    setUrls(prev => prev.filter((_, idx) => idx !== i))
  }

  function moveUp(i: number) {
    if (i === 0) return
    setUrls(prev => { const a = [...prev]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a })
  }

  function moveDown(i: number) {
    setUrls(prev => {
      if (i >= prev.length - 1) return prev
      const a = [...prev]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a
    })
  }

  const totalDuration = urls.length * 5 // estimativa de 5s por clip

  return (
    <div className="flex flex-col gap-3">
      {/* Info */}
      <div className="bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl text-xs text-rose-300">
        Conecte vídeos neste card (em ordem) para criar um <strong>MP4 Master</strong> de até 60s.
        Reordene com as setas se necessário.
      </div>

      {/* Lista de vídeos */}
      {urls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2 border border-dashed border-zinc-700 rounded-xl">
          <Link2 size={20} className="text-zinc-600" />
          <p className="text-xs text-zinc-500">Nenhum vídeo conectado ainda</p>
          <p className="text-[10px] text-zinc-600">Puxe as linhas dos Cards de Vídeo até este nó</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {urls.map((url, i) => (
            <div key={i} className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2">
              <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] flex items-center justify-center font-bold shrink-0">
                {i + 1}
              </span>
              <Film size={12} className="text-zinc-500 shrink-0" />
              <span className="text-[10px] text-zinc-400 truncate flex-1">
                {url.split('/').pop()?.slice(0, 40) ?? 'vídeo ' + (i + 1)}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => moveUp(i)} className="text-zinc-600 hover:text-white p-0.5 transition-colors" title="Mover para cima">
                  <ArrowUp size={11} />
                </button>
                <button onClick={() => moveDown(i)} className="text-zinc-600 hover:text-white p-0.5 transition-colors" title="Mover para baixo">
                  <ArrowDown size={11} />
                </button>
                <button onClick={() => remove(i)} className="text-zinc-600 hover:text-red-400 p-0.5 transition-colors ml-1" title="Remover">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Adicionar URL manual */}
      <div className="flex gap-2">
        <input
          value={manualUrl}
          onChange={e => setManualUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addManual()}
          placeholder="Cole URL de vídeo manualmente..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-accent"
        />
        <button
          onClick={addManual}
          disabled={!manualUrl.trim()}
          className="text-accent border border-accent/30 hover:bg-accent/10 px-3 py-2 rounded-xl transition-all disabled:opacity-30"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Resumo */}
      {urls.length > 0 && (
        <div className="flex items-center justify-between text-[10px] text-zinc-600 border border-zinc-800 rounded-xl px-3 py-2">
          <span>{urls.length} vídeo{urls.length > 1 ? 's' : ''} na fila</span>
          <span>~{totalDuration}s estimados de conteúdo</span>
        </div>
      )}

      <button
        onClick={() => onGenerate({ video_urls: urls })}
        disabled={urls.length < 2}
        className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 w-full"
      >
        <Film size={15} /> Costuras e exportar MP4 Master
      </button>
      {urls.length < 2 && (
        <p className="text-[10px] text-zinc-600 text-center">Conecte pelo menos 2 vídeos para habilitar</p>
      )}
    </div>
  )
}

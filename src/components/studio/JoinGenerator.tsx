'use client'

import { useState, useEffect } from 'react'
import { Link2, Film, Trash2, ArrowUp, ArrowDown, Plus, Sparkles } from 'lucide-react'

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
      {/* Cabeçalho de Explicação */}
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-rose-500/20 rounded-xl mt-0.5">
          <Link2 size={18} className="text-rose-400" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">Sequenciador & Costura Master</h4>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            Una múltiplos clipes em um único vídeo linear. O sistema processa as transições para um <b>resultado sem emendas</b>.
          </p>
        </div>
      </div>

      {/* Lista de vídeos */}
      {urls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3 border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/40">
          <div className="p-3 bg-zinc-800 rounded-full text-zinc-600">
            <Film size={24} />
          </div>
          <div className="text-center">
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Linha do Tempo Vazia</p>
            <p className="text-[10px] text-zinc-600 mt-1 px-4">Conecte os Cards de Vídeo aqui para definir a ordem</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
          {urls.map((url, i) => (
            <div key={i} className="group flex items-center gap-3 bg-zinc-900 border border-zinc-800 hover:border-rose-500/30 rounded-xl px-3 py-2.5 transition-all">
              <span className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-400 text-[10px] flex items-center justify-center font-black shrink-0 border border-rose-500/20">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-zinc-300 font-medium truncate">
                  {url.split('/').pop()?.slice(0, 40) ?? 'Clip de Vídeo ' + (i + 1)}
                </p>
                <p className="text-[8px] text-zinc-600 uppercase font-bold tracking-tighter mt-0.5">MP4 • 5 Segundos</p>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                <button onClick={() => moveUp(i)} className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition-all">
                  <ArrowUp size={12} strokeWidth={3} />
                </button>
                <button onClick={() => moveDown(i)} className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded-lg transition-all">
                  <ArrowDown size={12} strokeWidth={3} />
                </button>
                <button onClick={() => remove(i)} className="text-zinc-500 hover:text-rose-500 p-1 hover:bg-rose-500/10 rounded-lg transition-all ml-1">
                  <Trash2 size={12} strokeWidth={3} />
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
          placeholder="URL manual do clip..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-[11px] text-white placeholder-zinc-700 focus:outline-none focus:border-rose-500/40 shadow-inner"
        />
        <button
          onClick={addManual}
          disabled={!manualUrl.trim()}
          className="bg-zinc-900 border border-zinc-800 hover:border-rose-500/50 text-rose-500 px-4 py-3 rounded-xl transition-all disabled:opacity-20 flex items-center justify-center"
        >
          <Plus size={16} strokeWidth={3} />
        </button>
      </div>

      {/* Resumo Dinâmico */}
      {urls.length > 0 && (
        <div className="flex items-center justify-between text-[9px] text-zinc-500 font-bold uppercase tracking-widest bg-zinc-900/40 border border-zinc-800/60 rounded-xl px-4 py-2.5">
          <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {urls.length} segmentos</span>
          <span className="text-rose-400">Total aprox: {totalDuration}s</span>
        </div>
      )}

      <button
        onClick={() => onGenerate({ video_urls: urls })}
        disabled={urls.length < 2}
        className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-[13px] font-bold py-4 rounded-2xl transition-all disabled:opacity-40 w-full mt-2 shadow-[0_10px_30px_-10px_rgba(225,29,72,0.4)] active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Film size={18} className="group-hover:rotate-6 transition-transform" /> 
        CONQUISTAR MP4 MASTER — 0 CRÉDITOS
      </button>

      {urls.length < 2 && (
        <p className="text-[9px] text-zinc-600 text-center italic">Conecte pelo menos 2 clips para habilitar a costura master</p>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Layers, ShieldCheck, Image as ImageIcon, Sparkles } from 'lucide-react'
import ImageUpload from './ImageUpload'
import { CREDIT_COST } from '@/constants/studio'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const POSITIONS = [
  { value: 'southeast', label: 'Direita baixo' },
  { value: 'south',     label: 'Centro baixo'  },
  { value: 'southwest', label: 'Esquerda baixo' },
  { value: 'east',      label: 'Lado direito'  },
  { value: 'west',      label: 'Lado esquerdo' },
  { value: 'center',    label: 'Centro'        },
]

const TRYON_CATEGORIES = [
  { value: 'tops',       label: 'Peça de Cima (Camisas, Jaquetas)' },
  { value: 'bottoms',    label: 'Peça de Baixo (Calças, Saias)' },
  { value: 'one-pieces', label: 'Corpo Inteiro (Ternos, Conjuntos, Vestidos)' },
]

export default function ComposeCard({ initial, onGenerate }: Props) {
  const [portraitUrl, setPortraitUrl] = useState(String(initial.portrait_url ?? ''))
  const [productUrl,  setProductUrl]  = useState(String(initial.product_url  ?? ''))
  const [mode,        setMode]        = useState(String(initial.compose_mode ?? 'try-on'))
  
  // Overlay params
  const [position,    setPosition]    = useState(String(initial.position     ?? 'southeast'))
  const [scale,       setScale]       = useState(Number(initial.product_scale ?? 0.35))
  
  // TryOn params
  const [category,    setCategory]    = useState(String(initial.vton_category ?? 'tops'))
  const [costumePrompt, setCostumePrompt] = useState(String(initial.costume_prompt ?? ''))

  // Sincroniza portrait_url quando a conexão do canvas injeta via props
  useEffect(() => {
    const val = String(initial.portrait_url ?? '')
    if (val) setPortraitUrl(val)
  }, [initial.portrait_url])

  const hasPortrait = !!portraitUrl.trim()
  const hasProduct  = !!productUrl.trim()
  const isConnected = !!portraitUrl && !!initial.portrait_url
  const cost = CREDIT_COST['compose']

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho de Explicação */}
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-orange-500/20 rounded-xl mt-0.5">
          <Layers size={18} className="text-orange-400" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">Moda & Composição Virtual</h4>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            Troque roupas de modelos ou insira produtos em cenas. Perfeito para <b>Virtual Try-On</b> e fotos de catálogo dinâmicas.
          </p>
        </div>
      </div>

      {/* Modo de Fusão */}
      <div className="space-y-2">
        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1">Tecnologia de Fusão</label>
        <div className="relative">
          <select
            value={mode}
            onChange={e => setMode(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-[13px] text-white focus:outline-none focus:border-orange-500/50 appearance-none cursor-pointer transition-all font-medium"
          >
            <option value="try-on">Virtual Try-On (Veste a roupa na foto)</option>
            <option value="prompt">Vestir Personagem (Através de descrição)</option>
            <option value="overlay">Colar Produto (Objetos na cena)</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
             <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </div>

      {/* Status cena/modelo */}
      <div className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
        hasPortrait
          ? 'bg-orange-500/5 border-orange-500/30'
          : 'bg-zinc-900 border-zinc-800'
      }`}>
        <div className={`p-2 rounded-lg ${hasPortrait ? 'bg-orange-500/20 text-orange-400' : 'bg-zinc-800 text-zinc-600'}`}>
          <ImageIcon size={14} />
        </div>
        <div className="flex-1">
           <span className="block text-[10px] text-zinc-500 uppercase font-black tracking-widest">Cena / Modelo Fonte</span>
           <span className={`block text-[11px] font-bold mt-0.5 ${hasPortrait ? 'text-white' : 'text-zinc-700 italic'}`}>
             {isConnected ? '✓ Modelo do Studio Conectada' : hasPortrait ? '✓ Foto Personalizada Ativa' : 'Aguardando Foto Base...'}
           </span>
        </div>
      </div>

      {/* Upload da cena */}
      {!hasPortrait && (
        <ImageUpload
          value={portraitUrl}
          onChange={setPortraitUrl}
          label="Foto da Modelo (Base)"
          accept="image/*"
          preview
        />
      )}

      {/* Produto/Roupa do cliente */}
      {mode !== 'prompt' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
               {mode === 'try-on' ? 'Peça de Roupa' : 'Foto do Produto'}
            </label>
            <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold uppercase tracking-tighter bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <ShieldCheck size={10} strokeWidth={3} /> Preservação Fiel
            </div>
          </div>
          <ImageUpload
            value={productUrl}
            onChange={setProductUrl}
            label=""
            accept="image/*"
            preview
          />
        </div>
      )}

      {/* Preview side-by-side premium */}
      {hasPortrait && hasProduct && mode !== 'prompt' && (
        <div className="grid grid-cols-2 gap-3 bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800 animate-in fade-in zoom-in-95 duration-500">
          <div className="space-y-1.5">
            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest text-center">Base</p>
            <div className="aspect-square rounded-xl overflow-hidden border border-zinc-800 shadow-xl ring-2 ring-black/40">
               <img src={portraitUrl} alt="Cena" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="space-y-1.5 text-center">
            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">{mode === 'try-on' ? 'Veste' : 'Insere'}</p>
            <div className="aspect-square rounded-xl overflow-hidden border border-zinc-800 shadow-xl ring-2 ring-black/40">
               <img src={productUrl} alt="Produto" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      )}

      {/* Opções específicas por modo */}
      {mode === 'overlay' && (
        <div className="grid grid-cols-2 gap-3 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800">
          <div className="space-y-2">
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 block">Posição</label>
            <select
              value={position}
              onChange={e => setPosition(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-[11px] text-white focus:outline-none focus:border-orange-500/50 appearance-none transition-all"
            >
              {POSITIONS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Tamanho</label>
              <span className="text-[10px] text-orange-400 font-bold">{Math.round(scale * 100)}%</span>
            </div>
            <input
              type="range" min="20" max="55" step="1"
              value={Math.round(scale * 100)}
              onChange={e => setScale(Number(e.target.value) / 100)}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500 mt-2"
            />
          </div>
        </div>
      )}

      {mode === 'try-on' && (
        <div className="space-y-2 bg-orange-500/5 border border-orange-500/10 p-3 rounded-xl">
          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1">Tipo de Peça (Categorização)</label>
          <div className="relative mt-1">
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-[12px] text-white focus:outline-none focus:border-orange-500/50 appearance-none cursor-pointer transition-all font-medium"
            >
              {TRYON_CATEGORIES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
               <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      )}

      {mode === 'prompt' && (
        <div className="space-y-2.5">
          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1">O que a modelo deve vestir?</label>
          <textarea
            value={costumePrompt}
            onChange={e => setCostumePrompt(e.target.value)}
            placeholder="Descreva a roupa dos sonhos: 'Vestindo um blazer de seda branco aberto, por baixo um top preto minimalista, calças de linho e relógio dourado luxuoso'..."
            rows={4}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-[13px] text-white placeholder-zinc-700 focus:outline-none focus:border-orange-500/50 transition-all leading-relaxed shadow-inner resize-none"
          />
          <p className="text-[9px] text-zinc-600 italic leading-relaxed px-1">
            💡 <b>Dica:</b> No modo Prompt, a IA cria a roupa do zero baseada na sua descrição textual.
          </p>
        </div>
      )}

      <button
        onClick={() => onGenerate({ 
          portrait_url: portraitUrl, 
          product_url: mode === 'prompt' ? '' : productUrl, 
          compose_mode: mode, 
          position, 
          product_scale: scale, 
          vton_category: category,
          costume_prompt: costumePrompt
        })}
        disabled={!hasPortrait || (mode !== 'prompt' && !hasProduct) || (mode === 'prompt' && !costumePrompt.trim())}
        className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-[13px] font-bold py-4 rounded-2xl transition-all disabled:opacity-40 w-full mt-2 shadow-[0_10px_30px_-10px_rgba(234,88,12,0.5)] active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Sparkles size={18} className="group-hover:rotate-12 transition-transform" /> 
        INICIAR COMPOSIÇÃO MÁGICA — {cost} CRÉDITOS
      </button>
    </div>
  )
}

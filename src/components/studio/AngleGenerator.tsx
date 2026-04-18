'use client'

import { useState, useEffect } from 'react'
import { Camera, Image as ImageIcon, Map, Maximize, User, Scan, ArrowRight, Sparkles, Layers } from 'lucide-react'
import { StudioAsset } from '@/types'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const ANGLES = [
  { id: 'frontal',  label: 'Frontal',   icon: <User size={14} />,   desc: 'Visão direta do rosto e corpo' },
  { id: 'profile',  label: 'Perfil',    icon: <Scan size={14} />,   desc: 'Visão lateral 90 graus' },
  { id: 'closeup',  label: 'Close-up',  icon: <Maximize size={14} />, desc: 'Foco total no rosto' },
  { id: 'wide',     label: 'Distante',  icon: <Map size={14} />,  desc: 'Mostra o corpo inteiro' },
  { id: 'back',     label: 'Costas',    icon: <ArrowRight size={14} />, desc: 'Visão traseira do modelo' },
]

export default function AngleGenerator({ initial, onGenerate }: Props) {
  const [selectedAngle, setSelectedAngle] = useState(initial.angle as string || 'frontal')
  const [aspectRatio, setAspectRatio] = useState(initial.aspect_ratio as string || '9:16')
  const [engine, setEngine] = useState((initial.engine as string) || 'flux')
  const [activeConfig, setActiveConfig] = useState({ anglesGoogle: true, anglesFlux: true })

  // Busca configurações do Admin
  useEffect(() => {
    fetch('/api/studio/config')
      .then(r => r.json())
      .then(config => {
        setActiveConfig(config)
        // Respeita o que o admin configurou
        if (config.anglesGoogle && !config.anglesFlux) setEngine('google')
        if (!config.anglesGoogle && config.anglesFlux) setEngine('flux')
        // Se ambos ativos: usuário escolhe na UI, não forçamos nada
      })
      .catch(() => {})
  }, [])

  const showEngineBlock = activeConfig.anglesGoogle && activeConfig.anglesFlux

  const sourceUrl = initial.source_url as string
  const resultUrl = initial.url as string // O resultado final fica aqui

  // Se já tiver uma imagem gerada, mostra o resultado final
  if (resultUrl) {
    return (
      <div className="flex flex-col gap-4">
        <div className="relative group">
          <div className="absolute -top-2 -left-2 z-10 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-emerald-400/50 flex items-center gap-1">
            <Sparkles size={10} /> NOVA PERSPECTIVA
          </div>
          <div className={`${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'} w-full rounded-2xl overflow-hidden border-2 border-emerald-500/30 bg-zinc-900 shadow-2xl transition-all`}>
            <img src={resultUrl} alt="Result" className="w-full h-full object-cover" />
          </div>
        </div>
        
        <a 
          href={resultUrl} 
          download 
          target="_blank"
          className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 transition-all"
        >
          <Maximize size={14} /> ABRIR EM TELA CHEIA
        </a>
        
        <button
          onClick={() => onGenerate({ source_url: sourceUrl, angle: selectedAngle, engine, aspect_ratio: aspectRatio })}
          className="text-[10px] text-zinc-500 hover:text-emerald-400 font-bold transition-colors uppercase tracking-widest text-center"
        >
          🔄 Gerar outra variação
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Input Preview */}
      <div className="relative group">
        <div className="absolute -top-2 -left-2 z-10 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-emerald-400/50 flex items-center gap-1">
          <ImageIcon size={10} /> IMAGEM FONTE
        </div>
        
        {sourceUrl ? (
          <div className={`${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'} w-full rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/50 shadow-inner group-hover:border-emerald-500/30 transition-all`}>
            <img src={sourceUrl} alt="Source" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
              <span className="text-[10px] text-zinc-400 font-medium">Pronta para novo ângulo</span>
            </div>
          </div>
        ) : (
          <div className={`${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'} w-full rounded-2xl border-2 border-dashed border-white/5 bg-white/5 flex flex-col items-center justify-center gap-3 p-6 text-center`}>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-zinc-600">
              <Camera size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-zinc-400">Sem fonte conectada</p>
              <p className="text-[10px] text-zinc-600">Arraste a saída de uma Modelo para este card</p>
            </div>
          </div>
        )}
      </div>
 
      {/* Aspect Ratio Selector */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 px-1">
          <Maximize size={12} className="text-emerald-500" /> Proporção (Aspect Ratio)
        </label>
        <div className="flex bg-zinc-900 border border-white/5 p-1 rounded-xl gap-1">
          {[
            { id: '9:16', label: '9:16 Reels' },
            { id: '1:1',  label: '1:1 Post' },
            { id: '4:5',  label: '4:5 Feed' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setAspectRatio(opt.id)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                aspectRatio === opt.id ? 'bg-zinc-800 text-white border border-white/10 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Angle Selector */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 px-1">
          <Scan size={12} className="text-emerald-500" /> Selecione a Nova Perspectiva
        </label>
        
        <div className="grid grid-cols-1 gap-2">
          {ANGLES.map((ang) => (
            <button
              key={ang.id}
              onClick={() => setSelectedAngle(ang.id)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 text-left group ${
                selectedAngle === ang.id 
                  ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/20' 
                  : 'bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/10'
              }`}
            >
              <div className={`p-2 rounded-lg transition-colors ${
                 selectedAngle === ang.id ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500 group-hover:text-zinc-300'
              }`}>
                {ang.icon}
              </div>
              <div className="flex flex-col">
                <span className={`text-xs font-bold ${selectedAngle === ang.id ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                  {ang.label}
                </span>
                <span className="text-[9px] text-zinc-600 font-medium leading-none mt-1">
                  {ang.desc}
                </span>
              </div>
              {selectedAngle === ang.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Engine Selector */}
      {showEngineBlock && (
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 px-1">
          <Sparkles size={12} className="text-zinc-500" /> Motor de IA
        </label>
        <div className="flex gap-2">
          {activeConfig.anglesFlux && (
          <button
            onClick={() => setEngine('flux')}
            className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
              engine === 'flux'
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                : 'bg-white/2 border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            }`}
          >
            <Layers size={14} />
            <span className="text-[10px] font-bold">FLUX Ultra</span>
          </button>
          )}

          {activeConfig.anglesGoogle && (
          <button
            onClick={() => setEngine('google')}
            className={`flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
              engine === 'google'
                ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                : 'bg-white/2 border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
            }`}
          >
            <Camera size={14} />
            <span className="text-[10px] font-bold">Imagen 4.0</span>
          </button>
          )}
        </div>
      </div>
      )}

      {/* Action Button */}
      <button
        disabled={!sourceUrl}
        onClick={() => onGenerate({ source_url: sourceUrl, angle: selectedAngle, engine, aspect_ratio: aspectRatio })}
        className={`relative mt-2 w-full py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all overflow-hidden group/btn ${
          !sourceUrl
            ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95'
        }`}
      >
        <Sparkles size={14} />
        GERAR NOVA PERSPECTIVA
        
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
      </button>
      
      <p className="text-[9px] text-zinc-600 text-center font-medium">
        Preserva identidade, roupas e cenário em 100%
      </p>
    </div>
  )
}

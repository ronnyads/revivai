'use client'

import { useState } from 'react'
import { Music, ImageIcon, Play, Pause, Sparkles, Volume2, Headphones, Radio, Mic2 } from 'lucide-react'
import { StudioAsset } from '@/types'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const STYLES = [
  { id: 'lofi',      label: 'Lofi Relax',   icon: <Headphones size={14} />, desc: 'Batida calma, ideal para vlogs e UGC soft' },
  { id: 'cinematic', label: 'Épico/Cine',   icon: <Sparkles size={14} />,   desc: 'Trilha dramática e impactante' },
  { id: 'tech',      label: 'Tech/Modern',  icon: <Radio size={14} />,      desc: 'Sintetizadores modernos e energia alta' },
  { id: 'upbeat',    label: 'Happy Pop',    icon: <Volume2 size={14} />,    desc: 'Vibe positiva e motivadora' },
  { id: 'nature',    label: 'Nature/Acoustic', icon: <Mic2 size={14} />,   desc: 'Instrumentos reais e orgânicos' },
]

export default function MusicGenerator({ initial, onGenerate }: Props) {
  const [selectedStyle, setSelectedStyle] = useState('lofi')
  const [isPlaying, setIsPlaying] = useState(false)
  
  const sourceImageUrl = initial.source_image_url as string
  const resultUrl = initial.url as string

  // Handlers para o player
  const togglePlay = () => {
    const audio = document.getElementById(`audio-${initial.id}`) as HTMLAudioElement
    if (audio) {
      if (isPlaying) audio.pause()
      else audio.play()
      setIsPlaying(!isPlaying)
    }
  }

  const handleGenerate = () => {
    const styleObj = STYLES.find(s => s.id === selectedStyle)
    const prompt = `Create a 30-second ${styleObj?.label} background track. ${styleObj?.desc}. Professional 44.1kHz stereo, instrumental only.`
    onGenerate({ 
      prompt, 
      source_image_url: sourceImageUrl,
      style: selectedStyle 
    })
  }

  // Se já tiver uma música gerada, mostra o Player
  if (resultUrl) {
    return (
      <div className="flex flex-col gap-4">
        <div className="relative group">
          <div className="absolute -top-2 -left-2 z-10 bg-blue-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-blue-400/50 flex items-center gap-1">
            <Music size={10} /> TRILHA GERADA
          </div>
          
          <div className="aspect-video w-full rounded-2xl bg-zinc-900 border-2 border-blue-500/30 flex flex-col items-center justify-center gap-4 relative overflow-hidden shadow-2xl">
            {/* Onda sonora visual (Fake animation) */}
            <div className="flex items-end gap-1 h-12">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1 bg-blue-400 rounded-full transition-all duration-300 ${isPlaying ? 'animate-music-bar' : 'h-2'}`}
                  style={{ 
                    animationDelay: `${i * 0.1}s`,
                    height: isPlaying ? undefined : `${4 + Math.random() * 8}px`
                  }}
                />
              ))}
            </div>

            <button 
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-blue-500 hover:bg-blue-400 text-white flex items-center justify-center shadow-xl transition-all active:scale-90"
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
            </button>

            <audio 
              id={`audio-${initial.id}`} 
              src={resultUrl} 
              onEnded={() => setIsPlaying(false)}
              className="hidden" 
            />

            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-[10px] text-blue-300 font-bold text-center tracking-widest uppercase truncate">
                {STYLES.find(s => s.id === (initial.style as string))?.label || 'Custom Track'} • 30s
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          className="text-[10px] text-zinc-500 hover:text-blue-400 font-bold transition-colors uppercase tracking-widest text-center"
        >
          🔄 Gerar outra variação
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Inspiration Source */}
      {sourceImageUrl && (
        <div className="relative group">
          <div className="absolute -top-1 -right-1 z-10 bg-emerald-500 p-1 rounded-full shadow-lg">
            <ImageIcon size={8} className="text-white" />
          </div>
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
            <img src={sourceImageUrl} alt="Source" className="w-10 h-10 rounded-lg object-cover grayscale opacity-50" />
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-emerald-500 uppercase">Input Visual Detectado</span>
              <span className="text-[10px] text-zinc-500 leading-tight">O Lyria irá compor baseado nesta imagem</span>
            </div>
          </div>
        </div>
      )}

      {/* Style Selector */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 px-1">
          <Volume2 size={12} className="text-blue-500" /> Escolha o Mood da Trilha
        </label>
        
        <div className="grid grid-cols-1 gap-2">
          {STYLES.map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStyle(st.id)}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 text-left group ${
                selectedStyle === st.id 
                  ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/20' 
                  : 'bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/10'
              }`}
            >
              <div className={`p-2 rounded-lg transition-colors ${
                selectedStyle === st.id ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-500 group-hover:text-zinc-300'
              }`}>
                {st.icon}
              </div>
              <div className="flex flex-col">
                <span className={`text-xs font-bold ${selectedStyle === st.id ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                  {st.label}
                </span>
                <span className="text-[9px] text-zinc-600 font-medium leading-none mt-1">
                  {st.desc}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleGenerate}
        className="relative mt-2 w-full py-4 rounded-2xl bg-blue-500 text-white hover:bg-blue-400 font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-95 transition-all group/btn overflow-hidden"
      >
        <Sparkles size={14} />
        COMPOR TRILHA SONORA
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
      </button>
      
      <p className="text-[9px] text-zinc-600 text-center font-medium">
        Powered by Google Lyria 3 • 44.1kHz Stereo
      </p>
    </div>
  )
}

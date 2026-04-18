'use client'

import { useState, useEffect } from 'react'
import { Sparkles, User, Info, Film } from 'lucide-react'
import WebcamRecorder from './WebcamRecorder'
import ImageUpload from './ImageUpload'
import { CREDIT_COST } from '@/constants/studio'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function AnimateGenerator({ initial, onGenerate }: Props) {
  const [portraitUrl, setPortraitUrl] = useState(String(initial.portrait_image_url ?? ''))
  const [drivingUrl,  setDrivingUrl]  = useState(String(initial.driving_video_url  ?? ''))

  // Sincroniza portrait quando a conexão do canvas injeta o valor via props
  useEffect(() => {
    const val = String(initial.portrait_image_url ?? '')
    if (val) setPortraitUrl(val)
  }, [initial.portrait_image_url])

  // Sincroniza driving_video apenas se ainda não tem um vídeo gravado
  useEffect(() => {
    const val = String(initial.driving_video_url ?? '')
    if (val && !drivingUrl) setDrivingUrl(val)
  }, [initial.driving_video_url]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasPortrait = !!portraitUrl.trim()
  const hasDriving  = !!drivingUrl.trim()
  const isConnected = !!portraitUrl && !!initial.portrait_image_url
  const cost = CREDIT_COST['animate']

  return (
    <div className="flex flex-col gap-3">
      {/* Cabeçalho de Explicação */}
      <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-fuchsia-500/20 rounded-xl mt-0.5">
          <Film size={18} className="text-fuchsia-400" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">Mapeamento Genético de Movimento</h4>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            Transfira seus movimentos para o modelo através de <b>Deep Learning</b>. Grave-se falando e a IA replicará cada micro-expressão.
          </p>
        </div>
      </div>

      {/* Status: portrait */}
      <div className={`flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest px-3 py-2 rounded-xl border transition-all ${
        hasPortrait
          ? 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30'
          : 'text-zinc-500 bg-zinc-800/50 border-zinc-700/50'
      }`}>
        <User size={11} strokeWidth={3} />
        {isConnected ? 'Modelo conectado' : hasPortrait ? 'Retrato definido' : 'Aguardando retrato...'}
      </div>

      {/* Manual portrait input (if not connected) */}
      {!hasPortrait && (
        <ImageUpload
          value={portraitUrl}
          onChange={setPortraitUrl}
          label="Foto da Persona"
          accept="image/*"
          preview
        />
      )}

      {/* Preview side-by-side */}
      {hasPortrait && hasDriving && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex-1 flex flex-col gap-1.5">
            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest text-center">Persona</p>
            <div className="aspect-square rounded-2xl overflow-hidden border border-white/5 ring-4 ring-black/20">
              <img src={portraitUrl} alt="Persona" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest text-center">Guia</p>
            <div className="aspect-square rounded-2xl overflow-hidden border border-white/5 ring-4 ring-black/20">
              <video src={drivingUrl} className="w-full h-full object-cover" playsInline muted />
            </div>
          </div>
        </div>
      )}

      {/* Webcam recorder */}
      <WebcamRecorder value={drivingUrl} onChange={setDrivingUrl} />

      {/* Info box */}
      <div className="flex items-start gap-2 bg-fuchsia-500/5 border border-fuchsia-500/10 rounded-xl p-3">
        <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 mt-1.5 animate-pulse shrink-0" />
        <p className="text-[10px] text-zinc-500 leading-relaxed italic">
          O motor <span className="text-fuchsia-400 font-bold">LivePortrait 2.1</span> gera resultados em tempo real para sincronia perfeita de olhos e boca.
        </p>
      </div>

      <button
        onClick={() => onGenerate({ portrait_image_url: portraitUrl, driving_video_url: drivingUrl })}
        disabled={!hasPortrait || !hasDriving}
        className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white text-[13px] font-bold py-4 rounded-2xl transition-all disabled:opacity-40 w-full mt-2 shadow-[0_10px_30px_-10px_rgba(219,39,119,0.5)] active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Sparkles size={18} className="group-hover:rotate-12 transition-transform" /> 
        ANIMAR PERSONA NEURAL — {cost} CRÉDITOS
      </button>
    </div>
  )
}

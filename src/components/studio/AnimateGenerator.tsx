'use client'

import { useState, useEffect } from 'react'
import { Sparkles, User, Info } from 'lucide-react'
import WebcamRecorder from './WebcamRecorder'
import ImageUpload from './ImageUpload'

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

  return (
    <div className="flex flex-col gap-3">
      {/* Status: portrait */}
      <div className={`flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-xl border ${
        hasPortrait
          ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
          : 'text-zinc-500 bg-zinc-800/50 border-zinc-700/50'
      }`}>
        <User size={11} />
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
        <div className="flex gap-2">
          <div className="flex-1 flex flex-col gap-1">
            <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Persona</p>
            <img src={portraitUrl} alt="Persona" className="w-full rounded-xl object-cover aspect-square" />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <p className="text-[9px] text-zinc-500 uppercase tracking-wide">Seu vídeo</p>
            <video src={drivingUrl} className="w-full rounded-xl object-cover aspect-square" playsInline muted />
          </div>
        </div>
      )}

      {/* Webcam recorder */}
      <WebcamRecorder value={drivingUrl} onChange={setDrivingUrl} />

      {/* Info box */}
      <div className="flex items-start gap-2 bg-fuchsia-500/5 border border-fuchsia-500/20 rounded-xl p-2.5">
        <Info size={11} className="text-fuchsia-400 mt-0.5 shrink-0" />
        <p className="text-[10px] text-zinc-400 leading-relaxed">
          <span className="text-fuchsia-300 font-medium">LivePortrait</span> anima a persona com seus movimentos e voz. Leva ~1 min.
        </p>
      </div>

      <button
        onClick={() => onGenerate({ portrait_image_url: portraitUrl, driving_video_url: drivingUrl })}
        disabled={!hasPortrait || !hasDriving}
        className="flex items-center justify-center gap-2 bg-fuchsia-700 hover:bg-fuchsia-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 w-full"
      >
        <Sparkles size={15} /> Animar Modelo — 3 créditos
      </button>
    </div>
  )
}

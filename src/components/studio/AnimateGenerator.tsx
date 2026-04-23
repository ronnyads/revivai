'use client'

import { useState } from 'react'
import { Film, Sparkles, User } from 'lucide-react'
import { CREDIT_COST } from '@/constants/studio'
import ImageUpload from './ImageUpload'
import WebcamRecorder from './WebcamRecorder'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const DEFAULT_MOTION_PROMPT =
  'Copie o jeito de se mover do video de referencia, mantendo o mesmo rosto, roupa e estilo da imagem.'

export default function AnimateGenerator({ initial, onGenerate }: Props) {
  const connectedPortraitUrl = String(initial.portrait_image_url ?? '')
  const connectedDrivingUrl = String(initial.driving_video_url ?? '')
  const [uploadedPortraitUrl, setUploadedPortraitUrl] = useState('')
  const [recordedDrivingUrl, setRecordedDrivingUrl] = useState('')
  const [motionPrompt, setMotionPrompt] = useState(String(initial.motion_prompt ?? DEFAULT_MOTION_PROMPT))

  const portraitUrl = uploadedPortraitUrl || connectedPortraitUrl
  const drivingUrl = recordedDrivingUrl || connectedDrivingUrl
  const hasPortrait = !!portraitUrl.trim()
  const hasDriving = !!drivingUrl.trim()
  const isConnected = !!connectedPortraitUrl
  const cost = CREDIT_COST.animate

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3 rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-4">
        <div className="mt-0.5 rounded-xl bg-fuchsia-500/20 p-2">
          <Film size={18} className="text-fuchsia-400" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold leading-tight text-white">Imitar Movimento</h4>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
            Envie uma foto da pessoa e um video de exemplo. A IA usa esse video para copiar o jeito de mexer,
            as expressoes e o ritmo do corpo.
          </p>
        </div>
      </div>

      <div
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
          hasPortrait
            ? 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400'
            : 'border-zinc-700/50 bg-zinc-800/50 text-zinc-500'
        }`}
      >
        <User size={11} strokeWidth={3} />
        {isConnected ? 'Modelo conectado' : hasPortrait ? 'Retrato definido' : 'Aguardando retrato...'}
      </div>

      <div className="rounded-xl border border-fuchsia-500/10 bg-fuchsia-500/5 px-3 py-2 text-[11px] leading-relaxed text-zinc-400">
        <span className="font-semibold text-fuchsia-300">Duracao do video:</span> segue o video de referencia.
        Se gravar pela webcam aqui no card, o limite e de <span className="font-semibold text-white">30 segundos</span>.
      </div>

      {!hasPortrait && (
        <ImageUpload
          value={uploadedPortraitUrl}
          onChange={setUploadedPortraitUrl}
          label="Foto da pessoa"
          accept="image/*"
          preview
        />
      )}

      {hasPortrait && hasDriving && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex flex-1 flex-col gap-1.5">
            <p className="text-center text-[9px] font-black uppercase tracking-widest text-zinc-500">Pessoa</p>
            <div className="aspect-square overflow-hidden rounded-2xl border border-white/5 ring-4 ring-black/20">
              <img src={portraitUrl} alt="Pessoa" className="h-full w-full object-cover" />
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <p className="text-center text-[9px] font-black uppercase tracking-widest text-zinc-500">Movimento</p>
            <div className="aspect-square overflow-hidden rounded-2xl border border-white/5 ring-4 ring-black/20">
              <video src={drivingUrl} className="h-full w-full object-cover" playsInline muted />
            </div>
          </div>
        </div>
      )}

      <WebcamRecorder value={drivingUrl} onChange={setRecordedDrivingUrl} />

      <label className="flex flex-col gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Instrucao do movimento</span>
        <textarea
          value={motionPrompt}
          onChange={(event) => setMotionPrompt(event.target.value)}
          rows={3}
          className="resize-none rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-3 text-xs leading-relaxed text-zinc-200 outline-none transition-colors placeholder:text-zinc-700 focus:border-fuchsia-500/50"
          placeholder="Exemplo: copie o jeito de andar, olhar e mexer os bracos do video."
        />
      </label>

      <div className="flex items-start gap-2 rounded-xl border border-fuchsia-500/10 bg-fuchsia-500/5 p-3">
        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-fuchsia-500" />
        <p className="text-[10px] leading-relaxed text-zinc-500">
          Use este modo quando quiser copiar um movimento real. Se quiser inventar uma cena nova, use o card
          de video.
        </p>
      </div>

      <button
        onClick={() =>
          onGenerate({
            portrait_image_url: portraitUrl,
            driving_video_url: drivingUrl,
            motion_prompt: motionPrompt,
          })
        }
        disabled={!hasPortrait || !hasDriving}
        className="group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-fuchsia-600 to-rose-600 py-4 text-[13px] font-bold text-white shadow-[0_10px_30px_-10px_rgba(219,39,119,0.5)] transition-all hover:from-fuchsia-500 hover:to-rose-500 active:scale-[0.98] disabled:opacity-40"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
        <Sparkles size={18} className="transition-transform group-hover:rotate-12" />
        IMITAR MOVIMENTO - {cost} CREDITOS
      </button>
    </div>
  )
}

'use client'

import { useState, useRef } from 'react'
import { Wand2, Upload, X } from 'lucide-react'
import { CREDIT_COST } from '@/constants/studio'

const MAX_AUDIO_BYTES = 10 * 1024 * 1024 // 10 MB (limite do Next.js bodySizeLimit)
import VoiceLibraryPicker from './VoiceLibraryPicker'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function VoiceConvertGenerator({ initial, onGenerate }: Props) {
  const [targetVoiceId, setTargetVoiceId] = useState(
    String(initial.target_voice_id ?? 'EXAVITQu4vr4xnSDxMaL'),
  )
  const [uploadedUrl, setUploadedUrl] = useState(String(initial.uploaded_audio_url ?? ''))
  const [uploading, setUploading] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const connectedAudioUrl = String(initial.audio_url ?? '')
  const effectiveAudioUrl = connectedAudioUrl || uploadedUrl
  const cost = CREDIT_COST['voice_convert']

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (file.size > MAX_AUDIO_BYTES) {
      setUploadName(`Arquivo muito grande (máx 10 MB)`)
      return
    }

    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('bucket', 'studio')
      form.append('folder', 'voice-convert-inputs')
      const res = await fetch('/api/studio/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Upload falhou')
      const { url } = await res.json() as { url: string }
      setUploadedUrl(url)
      setUploadName(file.name)
    } catch {
      // silently fail — user can retry
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-violet-500/20 rounded-xl mt-0.5">
          <Wand2 size={18} className="text-violet-400" />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">Conversão de Voz</h4>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            Transforma um áudio existente em outra voz. Conecte um card ou suba um arquivo.
          </p>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mb-1.5 block">
          Áudio de Origem
        </label>

        {connectedAudioUrl ? (
          <div className="bg-zinc-900 border border-emerald-500/40 rounded-2xl px-4 py-3 text-[12px] text-emerald-400 font-medium">
            Áudio conectado via card
          </div>
        ) : uploadedUrl ? (
          <div className="flex items-center justify-between bg-zinc-900 border border-violet-500/40 rounded-2xl px-4 py-3">
            <span className="text-[12px] text-violet-300 font-medium truncate max-w-[80%]">
              {uploadName || 'Áudio enviado'}
            </span>
            <button
              onClick={() => { setUploadedUrl(''); setUploadName('') }}
              className="text-zinc-500 hover:text-red-400 transition-colors ml-2 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="text-[11px] text-zinc-500 bg-zinc-900 border border-zinc-700/60 rounded-2xl px-4 py-3">
              Conecte um card de Voz ao input deste card
            </div>
            <label className={`flex items-center gap-3 bg-zinc-900 border border-zinc-700 hover:border-violet-500/50 rounded-2xl px-4 py-3 cursor-pointer transition-all ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
              <Upload size={15} className="text-violet-400 shrink-0" />
              <span className="text-[12px] text-zinc-400">
                {uploading ? 'Enviando...' : 'ou suba um arquivo de áudio'}
              </span>
              <input
                ref={inputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>
        )}
      </div>

      <div>
        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-1 mb-1.5 block">
          Voz Destino
        </label>
        <VoiceLibraryPicker
          value={targetVoiceId}
          onChange={setTargetVoiceId}
          accentClass="violet"
          showCloneUpload={false}
        />
      </div>

      <button
        onClick={() => onGenerate({ target_voice_id: targetVoiceId, audio_url: effectiveAudioUrl, uploaded_audio_url: uploadedUrl })}
        disabled={!effectiveAudioUrl}
        className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-[13px] font-bold px-4 py-4 rounded-2xl transition-all disabled:opacity-40 w-full mt-2 shadow-[0_10px_30px_-10px_rgba(139,92,246,0.5)] active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <Wand2 size={18} className="group-hover:scale-110 transition-transform" />
        CONVERTER VOZ — {cost} CRÉDITOS
      </button>
    </div>
  )
}

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, Square, CheckCircle, RotateCcw, Loader2, Upload, X } from 'lucide-react'

type Phase = 'idle' | 'preview' | 'countdown' | 'recording' | 'recorded' | 'uploading'

interface Props {
  value: string
  onChange: (url: string) => void
}

const MAX_SECONDS = 30

export default function WebcamRecorder({ value, onChange }: Props) {
  const [phase,       setPhase]       = useState<Phase>('idle')
  const [countdown,   setCountdown]   = useState(3)
  const [elapsed,     setElapsed]     = useState(0)
  const [recordedUrl, setRecordedUrl] = useState('')
  const [error,       setError]       = useState('')

  const videoRef    = useRef<HTMLVideoElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef   = useRef<Blob[]>([])
  const blobRef     = useRef<Blob | null>(null)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      stopStream()
      if (timerRef.current) clearInterval(timerRef.current)
      if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  useEffect(() => {
    if ((phase === 'preview' || phase === 'countdown' || phase === 'recording') && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.muted = true
    }
  }, [phase])

  async function openCamera() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      setPhase('preview')
    } catch {
      setError('Câmera não encontrada ou acesso negado.')
    }
  }

  function startCountdown() {
    setCountdown(3)
    setPhase('countdown')
    let c = 3
    const id = setInterval(() => {
      c -= 1
      setCountdown(c)
      if (c === 0) { clearInterval(id); startRecording() }
    }, 1000)
  }

  function startRecording() {
    if (!streamRef.current) return
    chunksRef.current = []
    setElapsed(0)
    setPhase('recording')

    const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' })
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      blobRef.current = blob
      const url = URL.createObjectURL(blob)
      setRecordedUrl(url)
      setPhase('recorded')
    }

    recorder.start(100)

    let secs = 0
    timerRef.current = setInterval(() => {
      secs += 1
      setElapsed(secs)
      if (secs >= MAX_SECONDS) stopRecording()
    }, 1000)
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    recorderRef.current?.stop()
    stopStream()
  }

  function reRecord() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    setRecordedUrl('')
    blobRef.current = null
    setElapsed(0)
    openCamera()
  }

  const uploadVideo = useCallback(async () => {
    if (!blobRef.current) return
    setPhase('uploading')
    setError('')
    try {
      const form = new FormData()
      form.append('file', blobRef.current, `webcam-${Date.now()}.webm`)
      const res  = await fetch('/api/studio/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (data.url) { onChange(data.url) }
      else { throw new Error(data.error ?? 'Erro no upload') }
    } catch (e: any) {
      setError(e.message ?? 'Erro ao enviar vídeo')
      setPhase('recorded')
    }
  }, [onChange])

  function cancel() {
    stopStream()
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    setRecordedUrl('')
    setPhase('idle')
    setError('')
  }

  const pct = Math.min((elapsed / MAX_SECONDS) * 100, 100)
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  // Already has a recorded URL
  if (value) {
    return (
      <div className="flex flex-col gap-2">
        <video src={value} controls className="w-full rounded-xl max-h-40" playsInline />
        <button
          onClick={() => { onChange(''); setPhase('idle') }}
          className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 hover:text-red-400 border border-zinc-700 py-1.5 rounded-xl transition-colors"
        >
          <X size={11} /> Regravar
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] text-zinc-500 uppercase tracking-wide">Seu vídeo (driving)</label>

      {/* ── IDLE ── */}
      {phase === 'idle' && (
        <div className="flex flex-col gap-2">
          {/* Webcam */}
          <button
            onClick={openCamera}
            className="w-full flex flex-col items-center gap-2 border-2 border-dashed border-fuchsia-500/40 hover:border-fuchsia-500/70 bg-fuchsia-500/5 rounded-xl py-5 transition-colors group"
          >
            <Camera size={24} className="text-fuchsia-400 group-hover:scale-110 transition-transform" />
            <p className="text-xs text-zinc-300 font-medium">Gravar na Webcam</p>
            <p className="text-[10px] text-zinc-500">Grave até 30s do seu rosto usando a câmera</p>
          </button>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-zinc-800" />
            <span className="flex-shrink-0 mx-2 text-[10px] text-zinc-600 uppercase tracking-widest">ou upload</span>
            <div className="flex-grow border-t border-zinc-800" />
          </div>

          {/* File upload */}
          <label className="w-full flex flex-col items-center gap-2 border-2 border-dashed border-zinc-700/60 hover:border-zinc-500 bg-zinc-800/30 rounded-xl py-4 transition-colors group cursor-pointer">
            <Upload size={20} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            <p className="text-xs text-zinc-400 font-medium text-center">Enviar Vídeo do PC / Galeria</p>
            <p className="text-[10px] text-zinc-500 text-center">
              MP4, MOV, WebM — <span className="text-zinc-400 font-medium">máx. 100 MB</span>
            </p>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 100 * 1024 * 1024) {
                  setError('Arquivo muito grande. Máximo: 100 MB')
                  return
                }
                setPhase('uploading')
                try {
                  // 1. Pede URL assinada (não passa o arquivo pelo Vercel)
                  const signRes = await fetch('/api/studio/upload/sign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: file.name, contentType: file.type }),
                  })
                  const signData = await signRes.json()
                  if (!signData.signedUrl) throw new Error(signData.error ?? 'Erro ao obter URL')

                  // 2. Upload direto para o Supabase (bypassa Vercel)
                  const putRes = await fetch(signData.signedUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': file.type },
                    body: file,
                  })
                  if (!putRes.ok) throw new Error(`Upload falhou: ${putRes.status}`)

                  onChange(signData.publicUrl)
                } catch (err: any) {
                  setError(err.message ?? 'Erro ao enviar')
                  setPhase('idle')
                }
              }}
            />
          </label>
        </div>
      )}

      {/* ── PREVIEW / COUNTDOWN / RECORDING ── */}
      {(phase === 'preview' || phase === 'countdown' || phase === 'recording') && (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {phase === 'countdown' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <span className="text-7xl font-bold text-white animate-ping" style={{ animationDuration: '0.8s' }}>
                {countdown}
              </span>
            </div>
          )}
          {phase === 'recording' && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] text-white font-medium">REC {fmt(elapsed)}</span>
            </div>
          )}
        </div>
      )}

      {phase === 'recording' && (
        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${pct}%` }} />
        </div>
      )}

      {phase === 'preview' && (
        <div className="flex gap-2">
          <button onClick={cancel} className="flex-1 text-[11px] text-zinc-500 border border-zinc-700 py-2 rounded-xl transition-colors hover:text-zinc-300">
            Cancelar
          </button>
          <button
            onClick={startCountdown}
            className="flex-1 flex items-center justify-center gap-1.5 text-[11px] text-white bg-fuchsia-700 hover:bg-fuchsia-600 py-2 rounded-xl transition-colors font-medium"
          >
            <Camera size={12} /> Gravar
          </button>
        </div>
      )}

      {phase === 'recording' && (
        <button
          onClick={stopRecording}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] text-white bg-red-700 hover:bg-red-600 py-2 rounded-xl transition-colors font-medium"
        >
          <Square size={11} /> Parar gravação
        </button>
      )}

      {/* ── RECORDED ── */}
      {phase === 'recorded' && recordedUrl && (
        <div className="flex flex-col gap-2">
          <video src={recordedUrl} controls className="w-full rounded-xl max-h-40" playsInline />
          <div className="flex gap-2">
            <button
              onClick={reRecord}
              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 border border-zinc-700 py-2 rounded-xl hover:text-white transition-colors"
            >
              <RotateCcw size={11} /> Regravar
            </button>
            <button
              onClick={uploadVideo}
              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] text-white bg-fuchsia-700 hover:bg-fuchsia-600 py-2 rounded-xl transition-colors font-medium"
            >
              <CheckCircle size={11} /> Usar este vídeo
            </button>
          </div>
        </div>
      )}

      {/* ── UPLOADING ── */}
      {phase === 'uploading' && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 size={16} className="animate-spin text-fuchsia-400" />
          <span className="text-xs text-zinc-400">Enviando vídeo...</span>
        </div>
      )}

      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  )
}

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, Square, CheckCircle, RotateCcw, Loader2, Upload, X } from 'lucide-react'

type Phase = 'idle' | 'preview' | 'countdown' | 'recording' | 'recorded' | 'uploading'

interface Props {
  value: string
  onChange: (url: string) => void
}

const MAX_SECONDS = 60

      {/* ── IDLE ── */}
      {phase === 'idle' && (
        <div className="flex flex-col gap-2">
          {/* Webcam mode */}
          <button
            onClick={openCamera}
            className="w-full flex flex-col items-center gap-2 border-2 border-dashed border-fuchsia-500/40 hover:border-fuchsia-500/70 bg-fuchsia-500/5 rounded-xl py-5 transition-colors group"
          >
            <Camera size={24} className="text-fuchsia-400 group-hover:scale-110 transition-transform" />
            <p className="text-xs text-zinc-300 font-medium">Gravar na Webcam</p>
            <p className="text-[10px] text-zinc-500">Grave até 60s do seu rosto usando a câmera</p>
          </button>
          
          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-zinc-800"></div>
            <span className="flex-shrink-0 mx-2 text-[10px] text-zinc-600 uppercase tracking-widest">ou upload</span>
            <div className="flex-grow border-t border-zinc-800"></div>
          </div>

          {/* Upload mode */}
          <label className="w-full flex flex-col items-center gap-2 border-2 border-dashed border-zinc-700/60 hover:border-zinc-500 bg-zinc-800/30 rounded-xl py-4 transition-colors group cursor-pointer">
            <Upload size={20} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            <p className="text-xs text-zinc-400 font-medium text-center">Enviar Vídeo do PC / Galeria</p>
            <p className="text-[10px] text-zinc-500 text-center">MP4, MOV, WebM — <span className="text-zinc-400 font-medium">máx. 100 MB</span></p>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const MAX_MB = 100
                if (file.size > MAX_MB * 1024 * 1024) {
                  setError(`Arquivo muito grande. Máximo: ${MAX_MB} MB`)
                  return
                }
                setPhase('uploading')
                const form = new FormData()
                form.append('file', file)
                const res = await fetch('/api/studio/upload', { method: 'POST', body: form })
                const data = await res.json()
                if (data.url) onChange(data.url)
                else { setError(data.error ?? 'Erro ao enviar'); setPhase('idle') }
              }}
            />
          </label>
        </div>
      )}

      {/* ── PREVIEW ── */}
      {(phase === 'preview' || phase === 'countdown' || phase === 'recording') && (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />

          {/* Countdown overlay */}
          {phase === 'countdown' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <span className="text-7xl font-bold text-white animate-ping" style={{ animationDuration: '0.8s' }}>
                {countdown}
              </span>
            </div>
          )}

          {/* Recording indicator */}
          {phase === 'recording' && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] text-white font-medium">REC {fmt(elapsed)}</span>
            </div>
          )}
        </div>
      )}

      {/* Progress bar (recording) */}
      {phase === 'recording' && (
        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Controls */}
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

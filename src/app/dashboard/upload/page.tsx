'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UploadZone from '@/components/ui/UploadZone'
import BeforeAfterSlider from '@/components/ui/BeforeAfterSlider'
import { ArrowLeft, Sparkles, AlertCircle, ChevronDown } from 'lucide-react'

type Step  = 'upload' | 'diagnosing' | 'restoring' | 'done' | 'error'
type Hint  = 'auto' | 'colorize' | 'face' | 'inpaint'

const HINTS: { id: Hint; icon: string; label: string; desc: string }[] = [
  { id: 'auto',     icon: '✦', label: 'Automático',         desc: 'IA detecta o tipo de dano sozinha' },
  { id: 'colorize', icon: '🎨', label: 'Colorizar',          desc: 'Foto em preto e branco' },
  { id: 'face',     icon: '👤', label: 'Restaurar rosto',    desc: 'Rostos borrados ou danificados' },
  { id: 'inpaint',  icon: '✂️', label: 'Remover danos',      desc: 'Rasgos, manchas ou riscos' },
]

export default function UploadPage() {
  const router     = useRouter()
  const [step, setStep]           = useState<Step>('upload')
  const [file, setFile]           = useState<File | null>(null)
  const [hint, setHint]           = useState<Hint>('inpaint')
  const [showHints, setShowHints] = useState(false)
  const [diagnosis, setDiagnosis] = useState<{ label: string; description: string; icon: string; confidence: number; model: string } | null>(null)
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number; isGrayscale: boolean } | null>(null)
  const [originalUrl, setOriginalUrl] = useState('')
  const [restoredUrl, setRestoredUrl] = useState('')
  const [photoId, setPhotoId]     = useState('')
  const [error, setError]         = useState('')
  const [progress, setProgress]   = useState(0)

  const [pipeline, setPipeline]   = useState<string[]>([])
  const selectedHint = HINTS.find(h => h.id === hint)!

  const handleRestore = async () => {
    if (!file) return
    setStep('diagnosing'); setProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (hint !== 'auto') formData.append('hint', hint)

      const uploadRes = await fetch('/api/restore', { method: 'POST', body: formData })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        if (uploadRes.status === 402) { router.push('/#pricing'); return }
        throw new Error(err.error || 'Erro no upload')
      }

      const { photoId: pid, predictionId: predId, originalUrl: oUrl, diagnosis: diag, imageInfo: info, pipeline: pl } = await uploadRes.json()
      setPhotoId(pid); setOriginalUrl(oUrl); setDiagnosis(diag); setImageInfo(info)
      if (pl) setPipeline(pl)
      setProgress(35); setStep('restoring')

      // Poll every 3s — tracks chained predictions automatically
      let attempts = 0
      let currentPredId = predId
      const pollId = setInterval(async () => {
        attempts++
        setProgress(Math.min(35 + attempts * 4, 90))
        try {
          const params = new URLSearchParams()
          params.append('photoId', pid)
          if (currentPredId) params.append('predictionId', currentPredId)

          const r = await fetch(`/api/restore?${params.toString()}`)
          const data = await r.json()
          const { status, restored_url, newPredictionId, diagnosis: phaseDiag } = data

          // If backend chained to a new prediction (Stage 2), update our tracker
          if (newPredictionId && newPredictionId !== currentPredId) {
            currentPredId = newPredictionId
            // Update diagnosis label to phase 2
            if (phaseDiag) setDiagnosis((prev: any) => prev ? { ...prev, description: phaseDiag } : prev)
            console.log('[pipeline] Chained to Stage 2:', newPredictionId)
          }

          // Update phase description if backend sends it
          if (phaseDiag && !newPredictionId) {
            setDiagnosis((prev: any) => prev ? { ...prev, description: phaseDiag } : prev)
          }

          if (status === 'done' && restored_url) {
            clearInterval(pollId)
            setRestoredUrl(restored_url); setProgress(100); setStep('done')
          } else if (status === 'error') {
            clearInterval(pollId)
            setError(`A IA encontrou um erro: ${restored_url || 'Falha ao processar.'}`)
            setStep('error')
          }
        } catch (e: any) {
          // Don't kill poll on transient network error — try again next tick
          console.warn('[poll] transient error:', e.message)
        }
      }, 3000)
    } catch (e: any) {
      setError(e.message || 'Erro inesperado. Tente novamente.')
      setStep('error')
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <main className="max-w-2xl mx-auto px-6 py-10 md:py-14">
        <h1 className="font-display text-5xl font-normal tracking-tight mb-1">Nova restauração</h1>
        <p className="text-muted text-sm mb-10">Upload sua foto e a IA cuida do resto.</p>

        {/* UPLOAD STEP */}
        {step === 'upload' && (
          <>
            {/* Hint selector */}
            <div className="mb-4 relative">
              <button
                onClick={() => setShowHints(!showHints)}
                className="w-full flex items-center justify-between bg-white border border-[#E8E8E8] rounded-xl px-5 py-3.5 text-sm hover:border-accent transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span>{selectedHint.icon}</span>
                  <span className="font-medium">{selectedHint.label}</span>
                  <span className="text-muted">— {selectedHint.desc}</span>
                </span>
                <ChevronDown size={16} className={`text-muted transition-transform ${showHints ? 'rotate-180' : ''}`} />
              </button>
              {showHints && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E8E8E8] rounded-xl shadow-xl z-20 overflow-hidden">
                  {HINTS.map(h => (
                    <button
                      key={h.id}
                      onClick={() => { setHint(h.id); setShowHints(false) }}
                      className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-surface transition-colors text-left ${hint === h.id ? 'bg-accent-light text-accent' : ''}`}
                    >
                      <span>{h.icon}</span>
                      <span className="font-medium">{h.label}</span>
                      <span className="text-muted ml-1">— {h.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <UploadZone onFile={f => setFile(f)} />

            {file && (
              <button
                onClick={handleRestore}
                className="mt-5 w-full flex items-center justify-center gap-2 bg-accent text-white py-4 rounded-xl text-base font-medium hover:bg-accent-dark transition-all hover:-translate-y-0.5 shadow-lg shadow-accent/20"
              >
                <Sparkles size={18} /> Restaurar com IA →
              </button>
            )}
          </>
        )}

        {/* DIAGNOSING */}
        {step === 'diagnosing' && (
          <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center text-accent mx-auto mb-6 animate-pulse">
              <Sparkles size={24} />
            </div>
            <h2 className="font-display text-3xl font-normal mb-2">Analisando imagem...</h2>
            <p className="text-muted text-sm mb-8">Detectando resolução, cores e tipo de dano.</p>
            <div className="w-full bg-[#E8E8E8] rounded-full h-1.5">
              <div className="bg-accent h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* RESTORING */}
        {step === 'restoring' && diagnosis && (
          <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center">
            <div className="inline-flex items-center gap-2 bg-accent-light border border-accent/30 text-accent rounded-full px-4 py-1.5 text-xs font-medium mb-6">
              <span>{diagnosis.icon}</span> {diagnosis.label}
              <span className="bg-accent text-white text-[10px] px-2 py-0.5 rounded-full ml-1">{diagnosis.confidence}%</span>
            </div>
            {imageInfo && (
              <p className="text-xs text-muted mb-2 font-mono">
                {imageInfo.width}×{imageInfo.height}px {imageInfo.isGrayscale ? '· Preto e branco' : '· Colorida'}
              </p>
            )}
            <h2 className="font-display text-3xl font-normal mb-2">Restaurando sua memória...</h2>
            <p className="text-muted text-sm mb-6">{diagnosis.description || 'Processando com IA em 3 etapas...'}</p>

            {/* 3-stage visual indicator */}
            {pipeline.length > 0 && (
              <div className="flex items-center justify-center gap-3 mb-6">
                {['🎨 Colorização', '📐 Upscale 4x', '👤 Restauração'].slice(0, pipeline.length).map((label, i) => {
                  const currentStage = Math.floor(((progress - 35) / 55) * pipeline.length)
                  const isDone = i < currentStage
                  const isActive = i === currentStage
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all ${
                        isDone ? 'bg-green-100 text-green-700 font-medium' :
                        isActive ? 'bg-accent-light text-accent font-medium animate-pulse' :
                        'bg-[#F5F5F5] text-muted'
                      }`}>
                        {isDone ? '✓' : isActive ? '⟳' : '○'} {label}
                      </div>
                      {i < pipeline.length - 1 && <span className="text-[#E8E8E8]">→</span>}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="w-full bg-[#E8E8E8] rounded-full h-1.5 mb-3">
              <div className="bg-accent h-1.5 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-muted mb-1">{progress}% concluído</p>
            <p className="text-[11px] text-muted font-mono opacity-50">{diagnosis.model}</p>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && originalUrl && restoredUrl && (
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6">
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium mb-5">
                <span className="w-2 h-2 rounded-full bg-green-500" /> Restauração concluída!
              </div>
              <BeforeAfterSlider before={originalUrl} after={restoredUrl} />
            </div>
            <div className="flex gap-3">
              <a href={restoredUrl} download target="_blank" rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-ink text-white py-3.5 rounded-xl text-sm font-medium hover:bg-accent transition-colors">
                ↓ Baixar foto restaurada
              </a>
              <button
                onClick={() => { setStep('upload'); setFile(null); setRestoredUrl(''); setOriginalUrl('') }}
                className="flex-1 border border-[#E8E8E8] text-ink py-3.5 rounded-xl text-sm font-medium hover:border-accent hover:text-accent transition-colors">
                Restaurar outra
              </button>
            </div>
          </div>
        )}

        {/* ERROR */}
        {step === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-10 text-center">
            <AlertCircle size={32} className="text-red-500 mx-auto mb-4" />
            <h2 className="font-display text-2xl font-normal mb-2 text-red-700">Algo deu errado</h2>
            <p className="text-red-500 text-sm mb-6">{error}</p>
            <button
              onClick={() => { setStep('upload'); setFile(null) }}
              className="bg-ink text-white px-8 py-3 rounded-lg text-sm font-medium hover:bg-accent transition-colors">
              Tentar novamente
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UploadZone from '@/components/ui/UploadZone'
import BeforeAfterSlider from '@/components/ui/BeforeAfterSlider'
import { ArrowLeft, Sparkles, AlertCircle, ChevronDown } from 'lucide-react'

type Step  = 'upload' | 'diagnosing' | 'restoring' | 'done' | 'error'
type Mode  = { id: string; name: string; description: string; icon: string; model: string; example_before_url: string | null; example_after_url: string | null }

export default function UploadPage() {
  const router     = useRouter()
  const [step, setStep]           = useState<Step>('upload')
  const [file, setFile]           = useState<File | null>(null)
  const [diagnosis, setDiagnosis] = useState<{ label: string; description: string; icon: string; confidence: number; model: string } | null>(null)
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number; isGrayscale: boolean } | null>(null)
  const [originalUrl, setOriginalUrl] = useState('')
  const [restoredUrl, setRestoredUrl] = useState('')
  const [photoId, setPhotoId]     = useState('')
  const [error, setError]         = useState('')
  const [progress, setProgress]   = useState(0)

  const [modes, setModes]           = useState<Mode[]>([])
  const [selectedMode, setSelectedMode] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/restoration-modes')
      .then(r => r.json())
      .then(({ modes }) => {
        if (modes?.length) { setModes(modes); setSelectedMode(modes[0].id) }
      })
      .catch(() => {})
  }, [])

  const [pipeline, setPipeline]   = useState<string[]>([])
  const [colorizationSuggested, setColorizationSuggested] = useState(false)
  const [colorizationUrl, setColorizationUrl]             = useState<string | null>(null)
  const [colorizing, setColorizing]                       = useState(false)

  const handleColorize = async () => {
    if (!photoId || colorizing) return
    setColorizing(true)
    try {
      const res = await fetch('/api/colorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId }),
      })
      if (!res.ok) {
        const err = await res.json()
        if (res.status === 402) { router.push('/#pricing'); return }
        throw new Error(err.error || 'Erro na colorização')
      }
      const { colorization_url } = await res.json()
      setColorizationUrl(colorization_url)
      setColorizationSuggested(false)
    } catch (e: any) {
      alert(e.message || 'Erro ao colorizar. Tente novamente.')
    } finally {
      setColorizing(false)
    }
  }

  const handleRestore = async () => {
    if (!file) return
    setStep('diagnosing'); setProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (selectedMode) formData.append('modeId', selectedMode)

      const uploadRes = await fetch('/api/restore', { method: 'POST', body: formData })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        if (uploadRes.status === 402) { router.push('/#pricing'); return }
        throw new Error(err.error || 'Erro no upload')
      }

      const responseData = await uploadRes.json()
      const { photoId: pid, predictionId: predId, originalUrl: oUrl, diagnosis: diag, imageInfo: info, pipeline: pl, restoredUrl: directUrl, colorization_suggested: colSugg } = responseData
      setPhotoId(pid); setOriginalUrl(oUrl); setDiagnosis(diag); setImageInfo(info)
      if (pl) setPipeline(pl)

      // Gemini returns the result directly — no polling needed
      if (directUrl) {
        setRestoredUrl(directUrl)
        setProgress(100)
        setStep('done')
        if (colSugg) setColorizationSuggested(true)
        return
      }

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

          if (status === 'done' && restored_url && !restored_url.startsWith('PIPE:')) {
            clearInterval(pollId)
            setRestoredUrl(restored_url)
            setProgress(100)
            setStep('done')
            if (data.colorization_suggested) setColorizationSuggested(true)
            if (data.colorization_url) setColorizationUrl(data.colorization_url)
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
      <main className="max-w-4xl mx-auto px-6 py-10 md:py-14">
        <h1 className="font-display text-5xl font-normal tracking-tight mb-1">Nova restauração</h1>
        <p className="text-muted text-sm mb-10">Escolha o modo certo para sua foto e a IA faz o resto.</p>

        {/* UPLOAD STEP */}
        {step === 'upload' && (
          <>
            {/* Mode selection */}
            {modes.length > 0 && (
              <div className="mb-10">
                <p className="text-xs font-semibold text-muted tracking-widest uppercase mb-5">1. Selecione o modo de restauração</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {modes.map(mode => {
                    const isSelected = selectedMode === mode.id
                    const hasExamples = !!(mode.example_before_url && mode.example_after_url)
                    // Detect if icon is emoji (single char or surrogate pair) vs text
                    const isEmoji = mode.icon && mode.icon.length <= 4
                    return (
                      <button
                        key={mode.id}
                        onClick={() => setSelectedMode(mode.id)}
                        className={`w-full text-left rounded-2xl border-2 transition-all duration-200 overflow-hidden group ${
                          isSelected
                            ? 'border-accent shadow-lg shadow-accent/15 scale-[1.01]'
                            : 'border-[#E8E8E8] bg-white hover:border-accent/50 hover:shadow-md hover:scale-[1.005]'
                        }`}
                      >
                        {/* Before/After — full width, tall */}
                        {hasExamples ? (
                          <div className="relative grid grid-cols-2 h-44">
                            <div className="relative bg-gray-100 overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={mode.example_before_url!} alt="Antes" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                              <span className="absolute bottom-3 left-3 text-[10px] font-bold text-white/90 tracking-[2px] uppercase">Antes</span>
                            </div>
                            <div className="relative bg-gray-100 overflow-hidden border-l-2 border-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={mode.example_after_url!} alt="Depois" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                              <span className="absolute bottom-3 right-3 text-[10px] font-bold text-white/90 tracking-[2px] uppercase">Depois ✦</span>
                            </div>
                            {/* Selected overlay */}
                            {isSelected && (
                              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-widest uppercase shadow-md">
                                ✓ Selecionado
                              </div>
                            )}
                            {/* Divider line */}
                            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white z-10 pointer-events-none" />
                          </div>
                        ) : (
                          <div className={`h-20 flex items-center justify-center text-4xl ${isSelected ? 'bg-accent-light/40' : 'bg-surface'}`}>
                            {isEmoji ? mode.icon : '✨'}
                          </div>
                        )}

                        {/* Info */}
                        <div className={`flex items-start gap-3 px-4 py-4 ${isSelected ? 'bg-accent-light/20' : 'bg-white'}`}>
                          {isEmoji && (
                            <span className="text-xl flex-shrink-0 mt-0.5">{mode.icon}</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold leading-tight ${isSelected ? 'text-accent' : 'text-ink'}`}>
                              {mode.name}
                            </p>
                            {mode.description && (
                              <p className="text-xs text-muted mt-1 leading-relaxed line-clamp-2">{mode.description}</p>
                            )}
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${
                            isSelected ? 'border-accent bg-accent' : 'border-[#E8E8E8]'
                          }`}>
                            {isSelected && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <p className="text-xs font-semibold text-muted tracking-widest uppercase mb-4">2. Envie sua foto</p>
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

            {/* Pipeline stage indicator */}
            {pipeline.length > 0 && (
              <div className="flex items-center justify-center flex-wrap gap-2 mb-6">
                {pipeline.map((model, i) => {
                  const LABELS: Record<string, string> = {
                    'microsoft/bringing-old-photos-back-to-life': '✂️ Danos',
                    'megvii-research/nafnet':  '🔍 Desfoque',
                    'jingyunliang/swinir':     '🗜️ JPEG',
                    'nightmareai/real-esrgan': '📐 Upscale',
                    'sczhou/codeformer':       '👤 Rostos',
                    'piddnad/ddcolor':         '🎨 Cores',
                  }
                  const label = LABELS[model] || model.split('/')[1]
                  const currentStage = Math.floor(((progress - 35) / 55) * pipeline.length)
                  const isDone   = i < currentStage
                  const isActive = i === currentStage
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all ${
                        isDone   ? 'bg-green-100 text-green-700 font-medium' :
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
            {/* Colorization result */}
            {colorizationUrl && (
              <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6 mt-2">
                <div className="flex items-center gap-2 text-amber-600 text-sm font-medium mb-4">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Colorização concluída!
                </div>
                <BeforeAfterSlider before={restoredUrl} after={colorizationUrl} />
                <a href={colorizationUrl} download target="_blank" rel="noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-amber-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors">
                  ↓ Baixar foto colorizada
                </a>
              </div>
            )}

            {/* Colorization suggestion */}
            {colorizationSuggested && !colorizationUrl && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-amber-800 text-sm mb-1">🎨 Quer ver ela em cores?</p>
                  <p className="text-amber-700 text-xs">A IA vai colorir sua foto restaurada preservando todos os detalhes originais.</p>
                </div>
                <button
                  onClick={handleColorize}
                  disabled={colorizing}
                  className="shrink-0 bg-amber-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-60 disabled:cursor-wait">
                  {colorizing ? 'Colorindo...' : 'Colorizar — 1 crédito'}
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <a href={colorizationUrl || restoredUrl} download target="_blank" rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-ink text-white py-3.5 rounded-xl text-sm font-medium hover:bg-accent transition-colors">
                ↓ Baixar foto restaurada
              </a>
              <button
                onClick={() => { setStep('upload'); setFile(null); setRestoredUrl(''); setOriginalUrl(''); setColorizationSuggested(false); setColorizationUrl(null) }}
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

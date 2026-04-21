'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UploadZone from '@/components/ui/UploadZone'
import BeforeAfterSlider from '@/components/ui/BeforeAfterSlider'
import { ArrowLeft, Sparkles, AlertCircle, ChevronDown } from 'lucide-react'
import { useT } from '@/contexts/LanguageContext'

type Step  = 'upload' | 'diagnosing' | 'restoring' | 'done' | 'error'
type Mode  = { id: string; name: string; description: string; icon: string; model: string; example_before_url: string | null; example_after_url: string | null; badge: string | null }

export default function UploadPage() {
  const router     = useRouter()
  const t          = useT()
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
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Page Header */}
      <div className="bg-[#0F172A] border-b border-white/5 px-8 md:px-12 py-10 mb-10">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#7C0DF2] mb-2">RevivAI — RESTAURAÇÃO</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white font-display uppercase">Painel de Restauração</h1>
          <p className="text-sm text-white/50 mt-1 font-sans">Escolha o algoritmo e revitalize cada pixel com inteligência artificial.</p>
        </div>
      </div>
      <main className="max-w-4xl mx-auto px-6 py-4 md:py-6">

        {/* UPLOAD STEP */}
        {step === 'upload' && (
          <>
            {/* Mode selection */}
            {modes.length > 0 && (
              <div className="mb-10">
                <p className="text-[10px] font-bold text-neutral-400 tracking-[0.3em] uppercase mb-5">{t('upload_mode_label')}</p>
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
                        className={`w-full text-left border transition-all duration-200 overflow-hidden group ${
                          isSelected
                            ? 'border-[#7C0DF2] shadow-[0_0_15px_rgba(124,13,242,0.15)] scale-[1.01]'
                            : 'border-white/5 bg-[#0F172A] hover:border-white/20 hover:shadow-md'
                        }`}
                      >
                        {/* Before/After — full width, tall */}
                        {hasExamples ? (
                          <div className="relative grid grid-cols-2 h-44">
                            <div className="relative bg-[#f0eeec] overflow-hidden flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={mode.example_before_url!} alt="Antes" className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                              <span className="absolute bottom-3 left-3 text-[10px] font-bold text-white/90 tracking-[2px] uppercase">{t('upload_selected') === '✓ Selecionado' ? 'Antes' : 'Before'}</span>
                            </div>
                            <div className="relative bg-[#f0eeec] overflow-hidden flex items-center justify-center border-l-2 border-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={mode.example_after_url!} alt="Depois" className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                              <span className="absolute bottom-3 right-3 text-[10px] font-bold text-white/90 tracking-[2px] uppercase">After ✦</span>
                            </div>
                            {/* Badge pill */}
                            {mode.badge && (
                              <span className={`absolute top-2.5 left-2.5 z-20 text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white shadow ${
                                mode.badge === 'Premium' ? 'bg-purple-600' : mode.badge === 'Recomendado' ? 'bg-emerald-500' : 'bg-accent'
                              }`}>{mode.badge}</span>
                            )}
                            {/* Selected overlay */}
                            {isSelected && (
                              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#7C0DF2] text-[#020617] text-[10px] font-bold px-3 py-1 uppercase tracking-widest shadow-md">
                                ✓ Selecionado
                              </div>
                            )}
                            {/* Divider line */}
                            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white z-10 pointer-events-none" />
                          </div>
                        ) : (
                          <div className={`h-28 flex items-center justify-center text-4xl relative ${isSelected ? 'bg-[#7C0DF2]/10' : 'bg-[#1E293B]/50'}`}>
                            {isEmoji ? mode.icon : '✨'}
                            {mode.badge && (
                              <span className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white shadow ${
                                mode.badge === 'Premium' ? 'bg-purple-600' : mode.badge === 'Recomendado' ? 'bg-emerald-500' : 'bg-accent'
                              }`}>{mode.badge}</span>
                            )}
                          </div>
                        )}

                        {/* Info */}
                        <div className={`flex items-start gap-3 px-4 py-4 ${isSelected ? 'bg-[#7C0DF2]/5' : 'bg-[#0F172A]'}`}>
                          {isEmoji && (
                            <span className="text-xl flex-shrink-0 mt-0.5">{mode.icon}</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold uppercase tracking-wider leading-tight font-display ${isSelected ? 'text-[#7C0DF2]' : 'text-white'}`}>
                              {mode.name}
                            </p>
                            {mode.description && (
                              <p className="text-xs text-white/50 font-sans mt-1 leading-relaxed line-clamp-2">{mode.description}</p>
                            )}
                          </div>
                          <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${
                            isSelected ? 'bg-[#7C0DF2]' : 'border border-white/20'
                          }`}>
                            {isSelected && <span className="text-[#020617] text-[10px] font-bold leading-none">✓</span>}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <p className="text-[10px] font-bold text-neutral-400 tracking-[0.3em] uppercase mb-4">{t('upload_send_label')}</p>
            <UploadZone onFile={f => setFile(f)} />

            {file && (
              <button
                onClick={handleRestore}
                className="mt-5 w-full flex items-center justify-center gap-2 bg-[#7C0DF2] text-[#020617] py-5 text-xs font-bold uppercase tracking-[0.2em] hover:bg-white transition-all"
              >
                <Sparkles size={16} /> RESTAURAR AGORA
              </button>
            )}
          </>
        )}

        {/* DIAGNOSING */}
        {step === 'diagnosing' && (
          <div className="bg-[#0F172A] border border-white/5 p-12 text-center">
            <div className="w-16 h-16 bg-white/5 border border-white/10 flex items-center justify-center text-[#7C0DF2] mx-auto mb-6 animate-pulse">
              <Sparkles size={24} />
            </div>
            <h2 className="font-display text-3xl uppercase font-bold mb-2 text-white">{t('upload_diag_title')}</h2>
            <p className="text-white/50 font-sans text-sm mb-8">{t('upload_diag_sub')}</p>
            <div className="w-full bg-[#1E293B] h-1 overflow-hidden">
              <div className="bg-[#7C0DF2] h-1 transition-all duration-500 shadow-[0_0_10px_#7C0DF2]" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* RESTORING */}
        {step === 'restoring' && diagnosis && (
          <div className="bg-[#0F172A] border border-white/5 p-12 text-center">
            <div className="inline-flex items-center gap-2 bg-[#7C0DF2]/10 border border-[#7C0DF2]/20 text-[#7C0DF2] uppercase tracking-widest px-4 py-1.5 text-[10px] font-bold mb-6">
              <span>{diagnosis.icon}</span> {diagnosis.label}
              <span className="bg-[#7C0DF2] text-[#020617] text-[10px] px-2 py-0.5 ml-1">{diagnosis.confidence}%</span>
            </div>
            {imageInfo && (
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-2 font-mono">
                {imageInfo.width}×{imageInfo.height}px {imageInfo.isGrayscale ? `· ${t('upload_grayscale')}` : `· ${t('upload_color_img')}`}
              </p>
            )}
            <h2 className="font-display font-bold uppercase text-3xl text-white mb-2">{t('upload_restore_title')}</h2>
            <p className="text-white/50 font-sans text-sm mb-6">{diagnosis.description || t('upload_restore_default')}</p>

            {/* Pipeline stage indicator */}
            {pipeline.length > 0 && (
              <div className="flex items-center justify-center flex-wrap gap-2 mb-6">
                {pipeline.map((model, i) => {
                  const LABELS: Record<string, string> = {
                    'microsoft/bringing-old-photos-back-to-life': t('pipe_damage'),
                    'megvii-research/nafnet':  t('pipe_blur'),
                    'jingyunliang/swinir':     t('pipe_jpeg'),
                    'nightmareai/real-esrgan': t('pipe_upscale'),
                    'sczhou/codeformer':       t('pipe_faces'),
                    'piddnad/ddcolor':         t('pipe_color'),
                  }
                  const label = LABELS[model] || model.split('/')[1]
                  const currentStage = Math.floor(((progress - 35) / 55) * pipeline.length)
                  const isDone   = i < currentStage
                  const isActive = i === currentStage
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 transition-all ${
                        isDone   ? 'bg-[#7C0DF2]/10 text-[#7C0DF2]' :
                        isActive ? 'bg-[#7C0DF2] text-[#020617] animate-pulse' :
                        'bg-white/5 text-white/40'
                      }`}>
                        {isDone ? '✓' : isActive ? '⟳' : '○'} {label}
                      </div>
                      {i < pipeline.length - 1 && <span className="text-white/20">→</span>}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="w-full bg-[#1E293B] h-1.5 mb-3 overflow-hidden">
              <div className="bg-[#7C0DF2] h-1.5 transition-all duration-1000 shadow-[0_0_10px_#7C0DF2]" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#7C0DF2] mb-1">{progress}{t('upload_progress_suffix')}</p>
            <p className="text-[11px] text-muted font-mono opacity-50">{diagnosis.model}</p>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && originalUrl && restoredUrl && (
          <div className="flex flex-col gap-6">
            <div className="bg-[#0F172A] border border-white/5 p-6">
              <div className="flex items-center gap-2 text-[#7C0DF2] text-[10px] font-bold tracking-widest uppercase mb-5">
                <span className="w-2 h-2 bg-[#7C0DF2] shadow-[0_0_10px_#7C0DF2]" /> {t('upload_done_label')}
              </div>
              <BeforeAfterSlider before={originalUrl} after={restoredUrl} />
            </div>
            {/* Colorization result */}
            {colorizationUrl && (
              <div className="bg-[#0F172A] border border-white/5 p-6 mt-2">
                <div className="flex items-center gap-2 text-amber-400 text-[10px] font-bold tracking-widest uppercase mb-4">
                  <span className="w-2 h-2 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" /> {t('upload_colorize_done')}
                </div>
                <BeforeAfterSlider before={restoredUrl} after={colorizationUrl} />
                <a href={colorizationUrl} download target="_blank" rel="noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-amber-400 text-[#020617] py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-amber-300 transition-colors">
                  {t('upload_download_colorized')}
                </a>
              </div>
            )}

            {/* Colorization suggestion */}
            {colorizationSuggested && !colorizationUrl && (
              <div className="bg-white/5 border border-white/10 p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold font-display uppercase tracking-widest text-amber-400 text-sm mb-1">{t('upload_colorize_title')}</p>
                  <p className="text-white/50 font-sans text-xs">{t('upload_colorize_sub')}</p>
                </div>
                <button
                  onClick={handleColorize}
                  disabled={colorizing}
                  className="shrink-0 bg-amber-400 text-[#020617] px-6 py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-amber-300 transition-colors disabled:opacity-60 disabled:cursor-wait">
                  {colorizing ? t('upload_colorizing') : t('upload_colorize_btn')}
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <a href={colorizationUrl || restoredUrl} download target="_blank" rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-[#7C0DF2] text-[#020617] py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-colors">
                {t('upload_download')}
              </a>
              <button
                onClick={() => { setStep('upload'); setFile(null); setRestoredUrl(''); setOriginalUrl(''); setColorizationSuggested(false); setColorizationUrl(null) }}
                className="flex-1 border border-white/20 text-white/70 py-4 text-[10px] font-bold uppercase tracking-widest hover:border-[#7C0DF2] hover:text-[#7C0DF2] transition-colors">
                {t('upload_restore_another')}
              </button>
            </div>
          </div>
        )}

        {/* ERROR */}
        {step === 'error' && (
          <div className="bg-red-950/20 border border-red-500/20 p-10 text-center">
            <AlertCircle size={32} className="text-red-400 mx-auto mb-4" />
            <h2 className="font-display uppercase tracking-wider text-2xl font-bold mb-2 text-red-400">{t('upload_error_title')}</h2>
            <p className="text-red-400/70 font-sans text-sm mb-6">{error}</p>
            <button
              onClick={() => { setStep('upload'); setFile(null) }}
              className="bg-red-500 text-[#020617] px-8 py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-red-400 transition-colors">
              {t('upload_error_retry')}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

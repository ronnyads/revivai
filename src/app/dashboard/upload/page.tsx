'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UploadZone from '@/components/ui/UploadZone'
import BeforeAfterSlider from '@/components/ui/BeforeAfterSlider'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Layers3,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { useT } from '@/contexts/LanguageContext'

type Step = 'upload' | 'diagnosing' | 'restoring' | 'done' | 'error'
type Diagnosis = {
  label: string
  description: string
  icon: string
  confidence: number
  model: string
}
type Mode = {
  id: string
  name: string
  description: string
  icon: string
  model: string
  example_before_url: string | null
  example_after_url: string | null
  badge: string | null
}

export default function UploadPage() {
  const router = useRouter()
  const t = useT()

  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null)
  const [imageInfo, setImageInfo] = useState<{
    width: number
    height: number
    isGrayscale: boolean
  } | null>(null)
  const [originalUrl, setOriginalUrl] = useState('')
  const [restoredUrl, setRestoredUrl] = useState('')
  const [photoId, setPhotoId] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [modes, setModes] = useState<Mode[]>([])
  const [selectedMode, setSelectedMode] = useState<string | null>(null)
  const [pipeline, setPipeline] = useState<string[]>([])
  const [colorizationSuggested, setColorizationSuggested] = useState(false)
  const [colorizationUrl, setColorizationUrl] = useState<string | null>(null)
  const [colorizing, setColorizing] = useState(false)

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message
    return fallback
  }

  useEffect(() => {
    fetch('/api/restoration-modes')
      .then((r) => r.json())
      .then(({ modes }) => {
        if (modes?.length) {
          setModes(modes)
          setSelectedMode(modes[0].id)
        }
      })
      .catch(() => {})
  }, [])

  const activeMode = modes.find((mode) => mode.id === selectedMode) ?? null

  const resetSession = () => {
    setStep('upload')
    setFile(null)
    setDiagnosis(null)
    setImageInfo(null)
    setOriginalUrl('')
    setRestoredUrl('')
    setPhotoId('')
    setError('')
    setProgress(0)
    setPipeline([])
    setColorizationSuggested(false)
    setColorizationUrl(null)
    setColorizing(false)
  }

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
        if (res.status === 402) {
          router.push('/#pricing')
          return
        }
        throw new Error(err.error || 'Erro na colorização')
      }

      const { colorization_url } = await res.json()
      setColorizationUrl(colorization_url)
      setColorizationSuggested(false)
    } catch (error: unknown) {
      alert(getErrorMessage(error, 'Erro ao colorizar. Tente novamente.'))
    } finally {
      setColorizing(false)
    }
  }

  const handleRestore = async () => {
    if (!file) return

    setStep('diagnosing')
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (selectedMode) formData.append('modeId', selectedMode)

      const uploadRes = await fetch('/api/restore', { method: 'POST', body: formData })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        if (uploadRes.status === 402) {
          router.push('/#pricing')
          return
        }
        throw new Error(err.error || 'Erro no upload')
      }

      const responseData = await uploadRes.json()
      const {
        photoId: pid,
        predictionId: predId,
        originalUrl: oUrl,
        diagnosis: diag,
        imageInfo: info,
        pipeline: pl,
        restoredUrl: directUrl,
        colorization_suggested: colSugg,
      } = responseData

      setPhotoId(pid)
      setOriginalUrl(oUrl)
      setDiagnosis(diag)
      setImageInfo(info)
      if (pl) setPipeline(pl)

      if (directUrl) {
        setRestoredUrl(directUrl)
        setProgress(100)
        setStep('done')
        if (colSugg) setColorizationSuggested(true)
        return
      }

      setProgress(35)
      setStep('restoring')

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

          if (newPredictionId && newPredictionId !== currentPredId) {
            currentPredId = newPredictionId
            if (phaseDiag) {
              setDiagnosis((prev) => (prev ? { ...prev, description: phaseDiag } : prev))
            }
          }

          if (phaseDiag && !newPredictionId) {
            setDiagnosis((prev) => (prev ? { ...prev, description: phaseDiag } : prev))
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
        } catch (error: unknown) {
          console.warn('[poll] transient error:', getErrorMessage(error, 'unknown error'))
        }
      }, 3000)
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Erro inesperado. Tente novamente.'))
      setStep('error')
    }
  }

  const pipelineLabels: Record<string, string> = {
    'microsoft/bringing-old-photos-back-to-life': t('pipe_damage'),
    'megvii-research/nafnet': t('pipe_blur'),
    'jingyunliang/swinir': t('pipe_jpeg'),
    'nightmareai/real-esrgan': t('pipe_upscale'),
    'sczhou/codeformer': t('pipe_faces'),
    'piddnad/ddcolor': t('pipe_color'),
  }

  return (
    <div className="obsidian-shell min-h-screen text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(84,214,246,0.16),_transparent_28%),radial-gradient(circle_at_80%_0%,_rgba(0,173,204,0.12),_transparent_22%)]" />

      <main className="relative mx-auto max-w-7xl px-4 pb-28 pt-6 md:px-8 md:py-8 lg:px-12">
        <header className="panel-card rounded-[28px] border border-white/6 bg-[#111111]/92 p-5 md:rounded-[32px] md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 font-label text-[9px] uppercase tracking-[0.24em] text-[#A8B5B8] transition-colors hover:border-[#54D6F6]/30 hover:text-white md:px-4 md:text-[10px]"
              >
                <ArrowLeft size={14} />
                voltar ao painel
              </Link>

              <p className="mt-6 font-label text-[10px] uppercase tracking-[0.38em] text-[#54D6F6]">painel de restauração</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold uppercase tracking-[-0.04em] text-white md:text-5xl">
                Revitalize memórias com um pipeline visual de nível premium
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#9EADB1] sm:text-base">
                Escolha o algoritmo certo, acompanhe o diagnóstico em tempo real e entregue uma restauração limpa, nítida e pronta para download.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-[18px] border border-white/10 bg-white/5 p-3 md:rounded-[24px] md:p-4">
                <p className="font-label text-[9px] uppercase tracking-[0.2em] text-[#54D6F6] md:text-[10px] md:tracking-[0.26em]">algoritmos</p>
                <p className="mt-2 text-xl font-semibold text-white md:text-2xl">{modes.length || '--'}</p>
                <p className="mt-1 hidden text-xs text-[#7D8B90] sm:block">modelos carregados</p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/5 p-3 md:rounded-[24px] md:p-4">
                <p className="font-label text-[9px] uppercase tracking-[0.2em] text-[#54D6F6] md:text-[10px] md:tracking-[0.26em]">status</p>
                <p className="mt-2 text-xl font-semibold text-white md:text-2xl">{step === 'done' ? '100%' : `${progress}%`}</p>
                <p className="mt-1 hidden text-xs text-[#7D8B90] sm:block">progresso atual</p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/5 p-3 md:rounded-[24px] md:p-4">
                <p className="font-label text-[10px] uppercase tracking-[0.26em] text-[#54D6F6]">segurança</p>
                <p className="mt-2 text-xl font-semibold text-white md:text-2xl">ISO</p>
                <p className="mt-1 hidden text-xs text-[#7D8B90] sm:block">sandbox criptografado</p>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 md:mt-8 md:gap-8 xl:grid-cols-[minmax(0,1.55fr)_380px]">
          <section className="space-y-5 md:space-y-6">
            {step === 'upload' && (
              <>
                <div className="panel-card rounded-[28px] border border-white/6 bg-[#111111]/92 p-4 md:rounded-[32px] md:p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="font-label text-[10px] uppercase tracking-[0.32em] text-[#54D6F6]">seleção de algoritmo</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">Escolha o modo de restauração</h2>
                    </div>
                    <p className="max-w-xl text-sm leading-relaxed text-[#7D8B90]">
                      Cada motor ataca um tipo de degradação diferente. A seleção abaixo define o comportamento do pipeline antes do upload.
                    </p>
                  </div>

                  {modes.length > 0 ? (
                    <div className="mt-5 grid gap-3 md:mt-6 md:grid-cols-2 md:gap-4">
                      {modes.map((mode) => {
                        const isSelected = selectedMode === mode.id
                        const hasExamples = Boolean(mode.example_before_url && mode.example_after_url)
                        const isEmoji = mode.icon && mode.icon.length <= 4

                        return (
                          <button
                            key={mode.id}
                            onClick={() => setSelectedMode(mode.id)}
                            className={`group overflow-hidden rounded-[22px] border text-left transition-all duration-300 md:rounded-[28px] ${
                              isSelected
                                ? 'border-[#54D6F6]/40 bg-[#0D171A] shadow-[0_24px_80px_rgba(84,214,246,0.12)]'
                                : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                            }`}
                          >
                            {hasExamples ? (
                              <div className="relative grid h-32 grid-cols-2 overflow-hidden border-b border-white/10 sm:h-40 md:h-48">
                                <div className="relative">
                                  <img
                                    src={mode.example_before_url!}
                                    alt="Antes"
                                    className="h-full w-full object-cover opacity-80 transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                  <span className="absolute bottom-2 left-2 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 font-label text-[9px] uppercase tracking-[0.2em] text-white md:bottom-3 md:left-3 md:px-3 md:py-1.5 md:text-[10px] md:tracking-[0.24em]">
                                    antes
                                  </span>
                                </div>
                                <div className="relative border-l border-white/10">
                                  <img
                                    src={mode.example_after_url!}
                                    alt="Depois"
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                  <span className="absolute bottom-2 right-2 rounded-full border border-[#54D6F6]/20 bg-[#0C171A]/90 px-2.5 py-1 font-label text-[9px] uppercase tracking-[0.2em] text-[#54D6F6] md:bottom-3 md:right-3 md:px-3 md:py-1.5 md:text-[10px] md:tracking-[0.24em]">
                                    depois
                                  </span>
                                </div>

                                {mode.badge && (
                                  <span className="absolute left-2 top-2 rounded-full border border-[#54D6F6]/20 bg-[#0C171A]/90 px-2.5 py-1 font-label text-[9px] uppercase tracking-[0.2em] text-[#54D6F6] md:left-3 md:top-3 md:px-3 md:py-1.5 md:text-[10px] md:tracking-[0.24em]">
                                    {mode.badge}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className={`flex h-28 items-center justify-center border-b border-white/10 md:h-40 ${isSelected ? 'bg-[#0C171A]' : 'bg-[#141414]'}`}>
                                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#54D6F6]/15 bg-black/30 text-3xl">
                                  {isEmoji ? mode.icon : '✨'}
                                </div>
                              </div>
                            )}

                            <div className="flex items-start gap-3 p-4 md:gap-4 md:p-5">
                              {isEmoji && (
                                <span className="mt-0.5 text-lg text-[#54D6F6] md:text-xl">{mode.icon}</span>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3">
                                  <p className={`font-display text-sm font-semibold uppercase tracking-[0.08em] md:text-base ${isSelected ? 'text-[#54D6F6]' : 'text-white'}`}>
                                    {mode.name}
                                  </p>
                                  {isSelected && (
                                    <span className="rounded-full border border-[#54D6F6]/20 bg-[#0C171A] px-2 py-1 font-label text-[9px] uppercase tracking-[0.2em] text-[#54D6F6] md:px-2.5 md:text-[10px] md:tracking-[0.24em]">
                                      ativo
                                    </span>
                                  )}
                                </div>
                                {mode.description && (
                                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[#94A5A9] md:line-clamp-none">{mode.description}</p>
                                )}
                              </div>
                              <div className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full border ${isSelected ? 'border-[#54D6F6] bg-[#54D6F6] text-[#041014]' : 'border-white/15 text-transparent'}`}>
                                <CheckCircle2 size={14} />
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-8 text-sm text-[#8FA7AD] md:rounded-[28px] md:px-6 md:py-10">
                      Carregando os modelos disponíveis para a restauração.
                    </div>
                  )}
                </div>

                <div className="panel-card rounded-[28px] border border-white/6 bg-[#111111]/92 p-4 md:rounded-[32px] md:p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="font-label text-[10px] uppercase tracking-[0.32em] text-[#54D6F6]">arquivo de entrada</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">Envie a imagem que entra no pipeline</h2>
                    </div>
                    {file && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-label text-[10px] uppercase tracking-[0.24em] text-[#A8B5B8]">
                        {file.name}
                      </span>
                    )}
                  </div>

                  <div className="mt-6">
                    <UploadZone onFile={(incomingFile) => setFile(incomingFile)} />
                  </div>

                  {file && (
                    <button
                      onClick={handleRestore}
                      className="sticky bottom-24 z-20 mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-gradient px-6 py-4 font-label text-[11px] uppercase tracking-[0.28em] text-[#041014] shadow-[0_18px_60px_rgba(84,214,246,0.22)] transition-transform hover:scale-[1.01] md:static md:tracking-[0.32em]"
                    >
                      <Sparkles size={16} />
                      restaurar agora
                    </button>
                  )}
                </div>
              </>
            )}

            {(step === 'diagnosing' || step === 'restoring') && (
              <div className="panel-card rounded-[28px] border border-white/6 bg-[#111111]/92 p-5 md:rounded-[32px] md:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-2xl">
                    <p className="font-label text-[10px] uppercase tracking-[0.32em] text-[#54D6F6]">
                      {step === 'diagnosing' ? 'diagnóstico ativo' : 'restauração em progresso'}
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold uppercase tracking-[-0.04em] text-white md:text-3xl">
                      {step === 'diagnosing' ? t('upload_diag_title') : t('upload_restore_title')}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-[#9EADB1]">
                      {step === 'diagnosing' ? t('upload_diag_sub') : diagnosis?.description || t('upload_restore_default')}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-[#54D6F6]/20 bg-[#0C171A] px-4 py-3">
                    <p className="font-label text-[10px] uppercase tracking-[0.26em] text-[#54D6F6]">progresso</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{progress}%</p>
                  </div>
                </div>

                <div className="mt-8 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-2 rounded-full bg-cyan-gradient shadow-[0_0_30px_rgba(84,214,246,0.4)] transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3 md:gap-4">
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4 md:rounded-[24px]">
                    <p className="font-label text-[10px] uppercase tracking-[0.24em] text-[#54D6F6]">modelo</p>
                    <p className="mt-2 text-sm text-white">{diagnosis?.label || activeMode?.name || 'Analisando'}</p>
                    <p className="mt-2 text-xs text-[#7D8B90]">{diagnosis?.model || activeMode?.model || 'Pipeline automático'}</p>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4 md:rounded-[24px]">
                    <p className="font-label text-[10px] uppercase tracking-[0.24em] text-[#54D6F6]">confiança</p>
                    <p className="mt-2 text-sm text-white">{diagnosis ? `${diagnosis.confidence}%` : 'Em leitura'}</p>
                    <p className="mt-2 text-xs text-[#7D8B90]">Avaliação da rede neural principal</p>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4 md:rounded-[24px]">
                    <p className="font-label text-[10px] uppercase tracking-[0.24em] text-[#54D6F6]">arquivo</p>
                    <p className="mt-2 text-sm text-white">
                      {imageInfo ? `${imageInfo.width}×${imageInfo.height}px` : 'Lendo dimensões'}
                    </p>
                    <p className="mt-2 text-xs text-[#7D8B90]">
                      {imageInfo ? (imageInfo.isGrayscale ? t('upload_grayscale') : t('upload_color_img')) : 'Verificando espectro'}
                    </p>
                  </div>
                </div>

                {pipeline.length > 0 && (
                  <div className="mt-8">
                    <p className="font-label text-[10px] uppercase tracking-[0.32em] text-[#54D6F6]">pipeline encadeado</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {pipeline.map((model, index) => {
                        const label = pipelineLabels[model] || model.split('/')[1]
                        const currentStage = Math.floor(((progress - 35) / 55) * pipeline.length)
                        const isDone = index < currentStage
                        const isActive = index === currentStage

                        return (
                          <div
                            key={`${model}-${index}`}
                            className={`rounded-full border px-4 py-2 font-label text-[10px] uppercase tracking-[0.22em] transition-colors ${
                              isDone
                                ? 'border-[#54D6F6]/25 bg-[#0C171A] text-[#54D6F6]'
                                : isActive
                                  ? 'border-[#54D6F6]/45 bg-[#54D6F6] text-[#041014]'
                                  : 'border-white/10 bg-white/[0.03] text-[#7D8B90]'
                            }`}
                          >
                            {label}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 'done' && originalUrl && restoredUrl && (
              <>
                <div className="panel-card rounded-[28px] border border-white/6 bg-[#111111]/92 p-4 md:rounded-[32px] md:p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="font-label text-[10px] uppercase tracking-[0.32em] text-[#54D6F6]">{t('upload_done_label')}</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">Comparativo final</h2>
                    </div>
                    <span className="rounded-full border border-[#54D6F6]/20 bg-[#0C171A] px-4 py-2 font-label text-[10px] uppercase tracking-[0.24em] text-[#54D6F6]">
                      restauração concluída
                    </span>
                  </div>

                  <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <BeforeAfterSlider before={originalUrl} after={restoredUrl} />

                    <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4 md:rounded-[32px] md:p-6">
                      <p className="font-label text-[10px] uppercase tracking-[0.32em] text-[#54D6F6]">sumário operacional</p>
                      <div className="mt-6 space-y-4">
                        <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                          <p className="font-label text-[10px] uppercase tracking-[0.24em] text-[#7D8B90]">modelo aplicado</p>
                          <p className="mt-2 text-white">{diagnosis?.label || activeMode?.name || 'Pipeline premium'}</p>
                        </div>
                        <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                          <p className="font-label text-[10px] uppercase tracking-[0.24em] text-[#7D8B90]">confiança da análise</p>
                          <p className="mt-2 text-white">{diagnosis ? `${diagnosis.confidence}%` : 'Alta'}</p>
                        </div>
                        <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                          <p className="font-label text-[10px] uppercase tracking-[0.24em] text-[#7D8B90]">dimensão de saída</p>
                          <p className="mt-2 text-white">
                            {imageInfo ? `${imageInfo.width}×${imageInfo.height}px` : 'Pronto para entrega'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-col gap-3">
                        <a
                          href={colorizationUrl || restoredUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-gradient px-6 py-4 font-label text-[11px] uppercase tracking-[0.32em] text-[#041014] transition-transform hover:scale-[1.01]"
                        >
                          <Download size={16} />
                          {t('upload_download')}
                        </a>
                        <button
                          onClick={resetSession}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-6 py-4 font-label text-[11px] uppercase tracking-[0.32em] text-white transition-colors hover:border-[#54D6F6]/25 hover:text-[#54D6F6]"
                        >
                          <Layers3 size={16} />
                          {t('upload_restore_another')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {colorizationUrl && (
                  <div className="panel-card rounded-[28px] border border-white/6 bg-[#111111]/92 p-4 md:rounded-[32px] md:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-label text-[10px] uppercase tracking-[0.32em] text-amber-300">{t('upload_colorize_done')}</p>
                        <h2 className="mt-2 text-2xl font-semibold text-white">Versão colorizada pronta</h2>
                      </div>
                      <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 font-label text-[10px] uppercase tracking-[0.24em] text-amber-300">
                        estágio extra
                      </span>
                    </div>
                    <div className="mt-6 max-w-xl">
                      <BeforeAfterSlider before={restoredUrl} after={colorizationUrl} />
                    </div>
                  </div>
                )}

                {colorizationSuggested && !colorizationUrl && (
                  <div className="panel-card rounded-[28px] border border-amber-300/12 bg-[linear-gradient(135deg,rgba(251,191,36,0.08),rgba(17,17,17,0.92))] p-4 md:rounded-[32px] md:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-label text-[10px] uppercase tracking-[0.32em] text-amber-300">{t('upload_colorize_title')}</p>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#D3C89A]">{t('upload_colorize_sub')}</p>
                      </div>
                      <button
                        onClick={handleColorize}
                        disabled={colorizing}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-300 px-6 py-4 font-label text-[11px] uppercase tracking-[0.28em] text-[#2A1B00] transition-transform hover:scale-[1.01] disabled:cursor-wait disabled:opacity-60 md:w-auto md:tracking-[0.32em]"
                      >
                        <Wand2 size={16} />
                        {colorizing ? t('upload_colorizing') : t('upload_colorize_btn')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {step === 'error' && (
              <div className="panel-card rounded-[28px] border border-red-400/20 bg-[linear-gradient(135deg,rgba(127,29,29,0.28),rgba(17,17,17,0.92))] p-5 md:rounded-[32px] md:p-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-[0.32em] text-red-300">{t('upload_error_title')}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">A restauração foi interrompida</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-red-100/75">{error}</p>
                  </div>
                  <AlertCircle size={36} className="text-red-300" />
                </div>

                <button
                  onClick={resetSession}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-red-300 px-6 py-4 font-label text-[11px] uppercase tracking-[0.32em] text-[#2A0B0B] transition-transform hover:scale-[1.01]"
                >
                  {t('upload_error_retry')}
                </button>
              </div>
            )}
          </section>

          <aside className="hidden space-y-4 xl:block">
            <div className="panel-card border border-white/6 bg-[#111111]/92 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#54D6F6]/20 bg-[#0C171A] text-[#54D6F6]">
                  <ScanSearch size={18} />
                </div>
                <div>
                  <p className="font-label text-[10px] uppercase tracking-[0.28em] text-[#54D6F6]">modo selecionado</p>
                  <p className="mt-1 text-lg font-semibold text-white">{activeMode?.name || 'Aguardando algoritmo'}</p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[#94A5A9]">
                {activeMode?.description || 'Assim que os modos forem carregados, o sistema mostra o comportamento ideal para sua imagem.'}
              </p>

              {activeMode?.badge && (
                <span className="mt-4 inline-flex rounded-full border border-[#54D6F6]/20 bg-[#0C171A] px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.24em] text-[#54D6F6]">
                  {activeMode.badge}
                </span>
              )}
            </div>

            <div className="panel-card border border-white/6 bg-[#111111]/92 p-5">
              <p className="font-label text-[10px] uppercase tracking-[0.28em] text-[#54D6F6]">guard rails</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={16} className="text-[#54D6F6]" />
                    <p className="font-label text-[10px] uppercase tracking-[0.24em] text-white">sandbox privado</p>
                  </div>
                  <p className="mt-2 text-sm text-[#8FA7AD]">Uploads passam por um fluxo isolado antes do processamento final.</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <Layers3 size={16} className="text-[#54D6F6]" />
                    <p className="font-label text-[10px] uppercase tracking-[0.24em] text-white">pipeline modular</p>
                  </div>
                  <p className="mt-2 text-sm text-[#8FA7AD]">
                    {pipeline.length > 0 ? `${pipeline.length} estágios armados para esta execução.` : 'Os estágios entram em sequência conforme o diagnóstico.'}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <Sparkles size={16} className="text-[#54D6F6]" />
                    <p className="font-label text-[10px] uppercase tracking-[0.24em] text-white">resultado final</p>
                  </div>
                  <p className="mt-2 text-sm text-[#8FA7AD]">Entrega com revisão visual e download imediato no mesmo fluxo.</p>
                </div>
              </div>
            </div>

            {imageInfo && (
              <div className="panel-card border border-white/6 bg-[#111111]/92 p-5">
                <p className="font-label text-[10px] uppercase tracking-[0.28em] text-[#54D6F6]">telemetria da imagem</p>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="font-label text-[10px] uppercase tracking-[0.24em] text-[#7D8B90]">resolução</p>
                    <p className="mt-2 text-white">{imageInfo.width}×{imageInfo.height}px</p>
                  </div>
                  <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="font-label text-[10px] uppercase tracking-[0.24em] text-[#7D8B90]">espectro</p>
                    <p className="mt-2 text-white">{imageInfo.isGrayscale ? t('upload_grayscale') : t('upload_color_img')}</p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}

'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import UploadZone from '@/components/ui/UploadZone'
import BeforeAfterSlider from '@/components/ui/BeforeAfterSlider'
import { ArrowLeft, Sparkles, AlertCircle } from 'lucide-react'

type Step = 'upload' | 'diagnosing' | 'restoring' | 'done' | 'error'

export default function UploadPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [diagnosis, setDiagnosis] = useState<{ label: string; description: string; icon: string } | null>(null)
  const [originalUrl, setOriginalUrl] = useState('')
  const [restoredUrl, setRestoredUrl] = useState('')
  const [photoId, setPhotoId] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)

  const handleFile = (f: File) => setFile(f)

  const handleRestore = async () => {
    if (!file) return
    setStep('diagnosing')
    setProgress(10)

    try {
      // 1. Upload to Supabase Storage via API
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch('/api/restore', { method: 'POST', body: formData })
      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        // If unauthorized, redirect to pricing/login
        if (uploadRes.status === 402) {
          router.push('/#pricing')
          return
        }
        throw new Error(err.error || 'Erro no upload')
      }

      const { photoId: pid, originalUrl: oUrl, diagnosis: diag } = await uploadRes.json()
      setPhotoId(pid)
      setOriginalUrl(oUrl)
      setDiagnosis(diag)
      setProgress(40)
      setStep('restoring')

      // 2. Poll for result
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        setProgress(Math.min(40 + attempts * 4, 90))
        const statusRes = await fetch(`/api/restore?photoId=${pid}`)
        const { status, restored_url } = await statusRes.json()
        if (status === 'done' && restored_url) {
          clearInterval(poll)
          setRestoredUrl(restored_url)
          setProgress(100)
          setStep('done')
        } else if (status === 'error') {
          clearInterval(poll)
          throw new Error('IA retornou erro')
        }
      }, 3000)
    } catch (e: any) {
      setError(e.message || 'Erro inesperado. Tente novamente.')
      setStep('error')
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white border-b border-[#E8E8E8] px-8 py-5 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors">
          <ArrowLeft size={16} /> Voltar ao dashboard
        </Link>
        <span className="font-display text-xl font-semibold">reviv<span className="text-accent">.</span>ai</span>
        <div />
      </header>

      <main className="max-w-3xl mx-auto px-8 py-16">
        <h1 className="font-display text-5xl font-normal tracking-tight mb-2">Nova restauração</h1>
        <p className="text-muted text-sm mb-12">Faça o upload da sua foto e nossa IA cuida do resto.</p>

        {/* Step: Upload */}
        {step === 'upload' && (
          <>
            <UploadZone onFile={handleFile} />
            {file && (
              <button
                onClick={handleRestore}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-accent text-white py-4 rounded-xl text-base font-medium hover:bg-accent-dark transition-colors shadow-lg shadow-accent/20 hover:-translate-y-0.5 transition-transform"
              >
                <Sparkles size={18} /> Restaurar com IA →
              </button>
            )}
          </>
        )}

        {/* Step: Diagnosing */}
        {step === 'diagnosing' && (
          <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center text-accent mx-auto mb-6 animate-pulse">
              <Sparkles size={24} />
            </div>
            <h2 className="font-display text-3xl font-normal mb-2">Analisando sua foto...</h2>
            <p className="text-muted text-sm mb-8">Nossa IA está diagnosticando o tipo de restauração ideal.</p>
            <div className="w-full bg-[#E8E8E8] rounded-full h-1.5">
              <div className="bg-accent h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Step: Restoring */}
        {step === 'restoring' && (
          <div className="bg-white rounded-2xl border border-[#E8E8E8] p-12 text-center">
            {diagnosis && (
              <div className="inline-flex items-center gap-2 bg-accent-light border border-accent/30 text-accent rounded-full px-4 py-1.5 text-xs font-medium mb-6">
                <span>{diagnosis.icon}</span> {diagnosis.label} detectado
              </div>
            )}
            <h2 className="font-display text-3xl font-normal mb-2">Restaurando sua memória...</h2>
            <p className="text-muted text-sm mb-8">{diagnosis?.description}</p>
            <div className="w-full bg-[#E8E8E8] rounded-full h-1.5 mb-3">
              <div className="bg-accent h-1.5 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-muted">{progress}% concluído</p>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && originalUrl && restoredUrl && (
          <div className="flex flex-col gap-8">
            <div className="bg-white rounded-2xl border border-[#E8E8E8] p-6">
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-green-500" /> Restauração concluída!
              </div>
              <BeforeAfterSlider before={originalUrl} after={restoredUrl} />
            </div>
            <div className="flex gap-4">
              <a
                href={restoredUrl} download target="_blank" rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-ink text-white py-3.5 rounded-xl text-sm font-medium hover:bg-accent transition-colors"
              >
                ↓ Baixar foto restaurada
              </a>
              <button
                onClick={() => { setStep('upload'); setFile(null); setRestoredUrl(''); setOriginalUrl('') }}
                className="flex-1 border border-[#E8E8E8] text-ink py-3.5 rounded-xl text-sm font-medium hover:border-accent hover:text-accent transition-colors"
              >
                Restaurar outra foto
              </button>
            </div>
          </div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-10 text-center">
            <AlertCircle size={32} className="text-red-500 mx-auto mb-4" />
            <h2 className="font-display text-2xl font-normal mb-2 text-red-700">Algo deu errado</h2>
            <p className="text-red-500 text-sm mb-6">{error}</p>
            <button
              onClick={() => { setStep('upload'); setFile(null) }}
              className="bg-ink text-white px-8 py-3 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

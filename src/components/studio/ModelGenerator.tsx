'use client'

import { useState } from 'react'
import { ChevronRight, ChevronLeft, RefreshCw, Save, Check, Loader2, User } from 'lucide-react'

interface ModelParams {
  gender: string
  age_range: string
  skin_tone: string
  body_type: string
  style: string
  extra_details?: string
}

const STEPS = [
  {
    id: 'gender',
    title: 'Gênero',
    subtitle: 'Qual é o gênero do modelo?',
    layout: 'two-col' as const,
    options: [
      { value: 'feminino',  label: 'Feminino',  emoji: '👩' },
      { value: 'masculino', label: 'Masculino', emoji: '👨' },
    ],
  },
  {
    id: 'age_range',
    title: 'Faixa Etária',
    subtitle: 'Qual a faixa de idade do modelo?',
    layout: 'two-col' as const,
    options: [
      { value: '20-30', label: '20 – 30 anos', emoji: '✨' },
      { value: '30-40', label: '30 – 40 anos', emoji: '💼' },
      { value: '40-55', label: '40 – 55 anos', emoji: '🌟' },
      { value: '55+',   label: '55+ anos',     emoji: '🎯' },
    ],
  },
  {
    id: 'skin_tone',
    title: 'Cor da Pele',
    subtitle: 'Selecione o tom de pele mais próximo',
    layout: 'swatch' as const,
    options: [
      { value: 'muito_clara', label: 'Muito Clara', color: '#F5DCB4' },
      { value: 'clara',       label: 'Clara',       color: '#E8C89C' },
      { value: 'media',       label: 'Média',       color: '#C8956C' },
      { value: 'oliva',       label: 'Oliva',       color: '#A0714F' },
      { value: 'morena',      label: 'Morena',      color: '#7D4E2D' },
      { value: 'negra',       label: 'Negra',       color: '#4A2C17' },
    ],
  },
  {
    id: 'body_type',
    title: 'Tipo Físico',
    subtitle: 'Qual é o tipo físico do modelo?',
    layout: 'grid' as const,
    options: [
      { value: 'magro',     label: 'Magro/a',    emoji: '🪶' },
      { value: 'atletico',  label: 'Atlético/a', emoji: '💪' },
      { value: 'normal',    label: 'Normal',     emoji: '🧍' },
      { value: 'robusto',   label: 'Robusto/a',  emoji: '🏋️' },
      { value: 'plus_size', label: 'Plus Size',  emoji: '🌸' },
    ],
  },
  {
    id: 'style',
    title: 'Estilo',
    subtitle: 'Como o modelo está vestido?',
    layout: 'grid' as const,
    options: [
      { value: 'casual',       label: 'Casual',       emoji: '👕' },
      { value: 'profissional', label: 'Profissional', emoji: '👔' },
      { value: 'esportivo',    label: 'Esportivo',    emoji: '🏃' },
      { value: 'elegante',     label: 'Elegante',     emoji: '✨' },
      { value: 'alternativo',  label: 'Alternativo',  emoji: '🎨' },
    ],
  },
]

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function ModelGenerator({ initial, onGenerate }: Props) {
  const [step, setStep] = useState(0)
  const [params, setParams] = useState<Partial<ModelParams>>({
    gender:    (initial.gender    as string) || '',
    age_range: (initial.age_range as string) || '',
    skin_tone: (initial.skin_tone as string) || '',
    body_type: (initial.body_type as string) || '',
    style:     (initial.style     as string) || '',
  })
  const [extra, setExtra]       = useState((initial.extra_details as string) || '')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<string | null>(
    (initial.model_text as string) || null
  )
  const [saved,  setSaved]      = useState(false)
  const [savedPrompt, setSavedPrompt] = useState<string | null>(null)
  const [loadingSaved, setLoadingSaved] = useState(false)

  const currentStep = STEPS[step]
  const field = currentStep?.id as keyof ModelParams
  const hasSelection = step < STEPS.length ? !!params[field] : true
  const isReview = step >= STEPS.length

  function select(value: string) {
    setParams(prev => ({ ...prev, [field]: value }))
  }

  async function handleGenerate() {
    setLoading(true)
    setSaved(false)
    try {
      onGenerate({ ...params, extra_details: extra || undefined })
    } finally {
      setLoading(false)
    }
  }

  // If result is in initial (after generation), show it
  if (initial.model_text && !result) {
    setResult(initial.model_text as string)
  }

  async function handleSave() {
    if (!result) return
    const res = await fetch('/api/studio/save-model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: result }),
    })
    if (res.ok) setSaved(true)
  }

  async function handleLoadSaved() {
    setLoadingSaved(true)
    const res = await fetch('/api/studio/save-model')
    const data = await res.json()
    setSavedPrompt(data.prompt)
    setLoadingSaved(false)
  }

  const progress = Math.round((Math.min(step, STEPS.length) / STEPS.length) * 100)

  // ── Result view ──────────────────────────────────────────────────────────
  const modelText = result || (initial.model_text as string | undefined)
  if (modelText) {
    return (
      <div className="flex flex-col gap-3">
        <div className="bg-zinc-800 border border-indigo-500/30 rounded-xl p-3">
          <p className="text-[10px] text-indigo-400 uppercase tracking-widest mb-1.5 font-medium">Descrição do Modelo</p>
          <p className="text-xs text-zinc-300 leading-relaxed">{modelText}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setResult(null); setStep(STEPS.length) }}
            className="flex items-center justify-center gap-1.5 flex-1 text-[11px] text-zinc-400 hover:text-white border border-zinc-700 py-2 rounded-xl transition-colors"
          >
            <RefreshCw size={11} /> Regenerar
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center justify-center gap-1.5 flex-1 text-[11px] py-2 rounded-xl transition-colors ${
              saved
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20'
            }`}
          >
            {saved ? <><Check size={11} /> Salvo!</> : <><Save size={11} /> Salvar Modelo</>}
          </button>
        </div>
        <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
          Conecte este card ao <span className="text-zinc-400">card Imagem</span> para usar o modelo nas fotos
        </p>
      </div>
    )
  }

  // ── Wizard ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      {/* Carregar modelo salvo */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
          Passo {Math.min(step + 1, STEPS.length)} de {STEPS.length}
        </p>
        <button
          onClick={handleLoadSaved}
          disabled={loadingSaved}
          className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
        >
          {loadingSaved ? 'Carregando...' : '↩ Carregar modelo salvo'}
        </button>
      </div>

      {/* Modelo salvo banner */}
      {savedPrompt && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-2.5">
          <p className="text-[10px] text-indigo-400 font-medium mb-1">Modelo salvo:</p>
          <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-2">{savedPrompt}</p>
          <button
            onClick={() => { setResult(savedPrompt); setSavedPrompt(null) }}
            className="mt-1.5 text-[10px] text-indigo-400 hover:text-indigo-300"
          >
            Usar este modelo →
          </button>
        </div>
      )}

      {/* Barra de progresso */}
      <div className="w-full bg-zinc-800 rounded-full h-1">
        <div
          className="bg-indigo-500 h-1 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Conteúdo do passo */}
      {!isReview ? (
        <div className="flex flex-col gap-2.5">
          <div>
            <p className="text-sm font-semibold text-white">{currentStep.title}</p>
            <p className="text-[11px] text-zinc-500">{currentStep.subtitle}</p>
          </div>

          {/* Layout dois colunas */}
          {currentStep.layout === 'two-col' && (
            <div className="grid grid-cols-2 gap-2">
              {currentStep.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => select(opt.value)}
                  className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-all ${
                    params[field] === opt.value
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {'emoji' in opt && <span className="text-xl">{(opt as { emoji: string }).emoji}</span>}
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Layout swatches */}
          {currentStep.layout === 'swatch' && (
            <div className="grid grid-cols-3 gap-2">
              {currentStep.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => select(opt.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                    params[field] === opt.value
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                      : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-full border border-zinc-600"
                    style={{ backgroundColor: (opt as { color: string }).color }}
                  />
                  <span className="text-[10px] text-zinc-400">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Layout grid 3col */}
          {currentStep.layout === 'grid' && (
            <div className="grid grid-cols-3 gap-2">
              {currentStep.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => select(opt.value)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-[11px] font-medium text-center transition-all ${
                    params[field] === opt.value
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {'emoji' in opt && <span className="text-base">{(opt as { emoji: string }).emoji}</span>}
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Navegação */}
          <div className="flex items-center justify-between pt-1">
            {step > 0 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <ChevronLeft size={13} /> Voltar
              </button>
            ) : <div />}
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!hasSelection}
              className={`flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all ${
                hasSelection
                  ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              {step === STEPS.length - 1 ? 'Revisar' : 'Próximo'}
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      ) : (
        /* Revisão + gerar */
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Pronto para gerar!</p>
            <p className="text-[11px] text-zinc-500">Adicione detalhes extras se quiser</p>
          </div>

          {/* Chips de resumo */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(params).filter(([, v]) => v).map(([k, v]) => (
              <span key={k} className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 rounded-full border border-zinc-700">
                {String(v)}
              </span>
            ))}
          </div>

          <textarea
            value={extra}
            onChange={e => setExtra(e.target.value)}
            placeholder="Ex: cabelo loiro cacheado, óculos redondos, sorriso aberto..."
            rows={2}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-indigo-500"
          />

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50"
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Gerando...</>
              : <><User size={15} /> Gerar Modelo — 1 crédito</>
            }
          </button>

          <button
            onClick={() => setStep(s => s - 1)}
            className="text-[11px] text-zinc-600 hover:text-zinc-400 text-center transition-colors"
          >
            ← Voltar e editar
          </button>
        </div>
      )}
    </div>
  )
}

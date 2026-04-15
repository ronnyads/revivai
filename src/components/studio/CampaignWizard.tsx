'use client'

import { useState } from 'react'
import { X, ChevronRight, ChevronLeft, Wand2, Package, User, Mic, Film, Check, Loader2, Scissors, Layers } from 'lucide-react'

// ─── Tipos ──────────────────────────────────────────────────
export interface WizardResult {
  mode:     'single' | 'series'
  segments: WizardSegment[]
  modelConfig: {
    gender: string
    age_range: string
    skin_tone: string
    body_type: string
    style: string
  }
  voiceId:  string
  duration: number
  productUrl: string
}

export interface WizardSegment {
  label: string   // 'Hook', 'Benefício', 'CTA'
  script: string
}

interface Props {
  onConfirm: (result: WizardResult) => void
  onClose:   () => void
  credits:   number
}

const STEPS = ['Produto & Modelo', 'Script', 'Voz & Vídeo', 'Revisar']

const VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'Feminino', color: 'text-pink-400' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',  gender: 'Masculino', color: 'text-blue-400'  },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh',  gender: 'Masculino', color: 'text-violet-400'},
]

const GENDERS    = [{ v: 'feminino', l: 'Feminina' }, { v: 'masculino', l: 'Masculino' }]
const AGE_RANGES = [{ v: '20-30', l: '20–30' }, { v: '30-40', l: '30–40' }, { v: '40-55', l: '40–55' }]
const SKIN_TONES = [
  { v: 'muito_clara', l: 'Muito clara' },
  { v: 'clara',       l: 'Clara'       },
  { v: 'media',       l: 'Média'       },
  { v: 'oliva',       l: 'Oliva'       },
  { v: 'morena',      l: 'Morena'      },
  { v: 'negra',       l: 'Negra'       },
]
const BODY_TYPES = [
  { v: 'magro',    l: 'Magro(a)'   },
  { v: 'atletico', l: 'Atlético(a)'},
  { v: 'normal',   l: 'Normal'     },
  { v: 'plus_size',l: 'Plus size'  },
]
const STYLES = [
  { v: 'casual',       l: 'Casual'       },
  { v: 'profissional', l: 'Profissional' },
  { v: 'esportivo',    l: 'Esportivo'    },
  { v: 'elegante',     l: 'Elegante'     },
]

const SEGMENT_LABELS = ['Hook (Gancho)', 'Benefício', 'CTA (Chamada)']
const SEGMENT_HINTS  = [
  'Chame atenção nos primeiros 2s. Ex: "Esse detalhe tá destruindo sua pele..."',
  'Mostre o benefício principal. Ex: "Com o FPS 90, eu fico protegida o dia inteiro..."',
  'Convide para a ação. Ex: "Testa por 7 dias e me conta o resultado!"',
]

export default function CampaignWizard({ onConfirm, onClose, credits }: Props) {
  const [step, setStep]       = useState(0)
  const [mode, setMode]       = useState<'single' | 'series'>('series')
  const [productUrl, setProductUrl] = useState('')
  const [segCount,   setSegCount]   = useState(3)
  const [segments, setSegments]     = useState<WizardSegment[]>(
    SEGMENT_LABELS.map(label => ({ label, script: '' }))
  )
  const [modelConfig, setModelConfig] = useState({
    gender: 'feminino', age_range: '20-30', skin_tone: 'media', body_type: 'normal', style: 'casual',
  })
  const [voiceId,  setVoiceId]  = useState('EXAVITQu4vr4xnSDxMaL')
  const [duration, setDuration] = useState(5)
  const [aiLoading, setAiLoading] = useState(false)

  // Segmentos ativos de acordo com a quantidade escolhida
  const activeSegments = segments.slice(0, mode === 'single' ? 1 : segCount)

  // Créditos estimados: modelo(1) + fusão(1 se produto) + N×(script+voz+vídeo+lipsync) = 1+1+N*8
  const estCredits = 1 + (productUrl ? 1 : 0) + activeSegments.length * 8

  async function generateScripts() {
    if (!productUrl) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/studio/generate-scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: productUrl, count: segCount }),
      })
      const data = await res.json()
      if (data.scripts) {
        setSegments(prev => prev.map((s, i) => ({
          ...s, script: data.scripts[i] ?? s.script,
        })))
      }
    } finally {
      setAiLoading(false)
    }
  }

  function updateSegment(i: number, val: string) {
    setSegments(prev => prev.map((s, idx) => idx === i ? { ...s, script: val } : s))
  }

  function canNext() {
    if (step === 0) return true
    if (step === 1) return activeSegments.every(s => s.script.trim().length > 0)
    if (step === 2) return true
    return true
  }

  function handleConfirm() {
    onConfirm({ mode, segments: activeSegments, modelConfig, voiceId, duration, productUrl })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center">
              <Wand2 size={15} className="text-fuchsia-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Campaign Builder</h2>
              <p className="text-[10px] text-zinc-500">Crie seu anúncio UGC em série</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-zinc-800/60">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-0 flex-1">
              <div className={`flex items-center gap-1.5 text-[11px] font-medium ${
                i === step ? 'text-fuchsia-400' : i < step ? 'text-emerald-400' : 'text-zinc-600'
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  i === step ? 'bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-400'
                  : i < step  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                  : 'bg-zinc-800 border border-zinc-700 text-zinc-600'
                }`}>
                  {i < step ? <Check size={10} /> : i + 1}
                </span>
                <span className="hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 mx-2 ${i < step ? 'bg-emerald-500/40' : 'bg-zinc-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 max-h-[60vh]">

          {/* ── STEP 0: Produto & Modelo ─────────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5">
              {/* Modo */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 block">
                  Como você quer criar?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { v: 'single', icon: <Scissors size={18} />, title: 'Clip único', sub: 'Um vídeo independente, sem cortes encadeados', color: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
                    { v: 'series', icon: <Film size={18} />, title: 'Série de clipes', sub: 'Vários clipes que continuam um no outro com contexto preservado', color: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400' },
                  ].map(opt => (
                    <button
                      key={opt.v}
                      onClick={() => setMode(opt.v as 'single' | 'series')}
                      className={`flex flex-col items-start gap-2 p-3 rounded-xl border transition-all text-left cursor-pointer ${
                        mode === opt.v ? opt.color : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {opt.icon}
                      <div>
                        <p className="text-xs font-semibold">{opt.title}</p>
                        <p className="text-[10px] opacity-70 leading-relaxed">{opt.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Produto */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1.5">
                  <Package size={10} /> URL da foto do produto
                </label>
                <input
                  value={productUrl}
                  onChange={e => setProductUrl(e.target.value)}
                  placeholder="https://... (opcional — pode adicionar depois)"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500/50 transition-colors"
                />
                <p className="text-[10px] text-zinc-600 mt-1">A IA vai gerar uma cena natural entre o modelo UGC e o produto</p>
              </div>

              {/* Modelo */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 block flex items-center gap-1.5">
                  <User size={10} /> Modelo UGC
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Gênero', key: 'gender', options: GENDERS },
                    { label: 'Faixa etária', key: 'age_range', options: AGE_RANGES },
                    { label: 'Tom de pele', key: 'skin_tone', options: SKIN_TONES },
                    { label: 'Estilo', key: 'style', options: STYLES },
                  ].map(({ label, key, options }) => (
                    <div key={key}>
                      <label className="text-[9px] text-zinc-600 uppercase tracking-wide mb-1 block">{label}</label>
                      <select
                        value={modelConfig[key as keyof typeof modelConfig]}
                        onChange={e => setModelConfig(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-fuchsia-500/50 transition-colors"
                      >
                        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 1: Script ───────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              {mode === 'series' && (
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 block">
                    Quantos clipes?
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <button
                        key={n}
                        onClick={() => setSegCount(n)}
                        className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                          segCount === n
                            ? 'border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-400'
                            : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest">Scripts</label>
                <button
                  onClick={generateScripts}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 text-[11px] text-fuchsia-400 hover:text-fuchsia-300 border border-fuchsia-500/30 bg-fuchsia-500/10 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {aiLoading ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
                  Gerar com IA
                </button>
              </div>

              <div className="space-y-3">
                {activeSegments.map((seg, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-medium text-zinc-400">
                        {mode === 'single' ? '📝 Fala do modelo' : `${i + 1}. ${seg.label}`}
                      </label>
                      {i > 0 && (
                        <span className="text-[9px] text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/20 px-1.5 py-0.5 rounded-full">
                          Continua no clipe {i}
                        </span>
                      )}
                    </div>
                    <textarea
                      value={seg.script}
                      onChange={e => updateSegment(i, e.target.value)}
                      placeholder={SEGMENT_HINTS[i] ?? 'Digite a fala do modelo...'}
                      rows={3}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-fuchsia-500/50 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: Voz & Vídeo ─────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 block flex items-center gap-1.5">
                  <Mic size={10} /> Voz do modelo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {VOICES.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setVoiceId(v.id)}
                      className={`flex flex-col items-center py-3 px-2 rounded-xl border transition-all cursor-pointer ${
                        voiceId === v.id
                          ? 'border-fuchsia-500/40 bg-fuchsia-500/10'
                          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      }`}
                    >
                      <Mic size={15} className={voiceId === v.id ? 'text-fuchsia-400' : 'text-zinc-500'} />
                      <p className={`text-xs font-semibold mt-1 ${voiceId === v.id ? 'text-fuchsia-400' : 'text-zinc-400'}`}>{v.name}</p>
                      <p className="text-[9px] text-zinc-600">{v.gender}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 block flex items-center gap-1.5">
                  <Film size={10} /> Duração de cada clipe: <span className="text-white font-medium ml-1">{duration}s</span>
                </label>
                <input
                  type="range" min={3} max={10} step={1}
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full accent-fuchsia-500"
                />
                <div className="flex justify-between text-[9px] text-zinc-600 mt-1">
                  <span>3s (rápido)</span>
                  <span>10s (detalhado)</span>
                </div>
              </div>

              <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-3.5 space-y-2">
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  <span className="text-fuchsia-400 font-medium">Vídeos contínuos:</span>{' '}
                  Cada clipe começa exatamente no último frame do anterior — mesmo modelo, mesmo cenário, mesma iluminação.
                </p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  <span className="text-cyan-400 font-medium">Lip Sync automático:</span>{' '}
                  Cada clipe recebe um card Lip Sync — SyncLabs sincroniza os lábios do modelo com a voz gerada em cada segmento.
                </p>
                <p className="text-[10px] text-zinc-500">
                  Limite Reels: 6 clipes × 10s = 60s de conteúdo fluido e profissional.
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 3: Revisão ──────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <Layers size={13} />, label: mode === 'single' ? 'Clip único' : `${activeSegments.length} clipes em série`, color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20' },
                  { icon: <User size={13} />, label: `Modelo ${GENDERS.find(g => g.v === modelConfig.gender)?.l ?? ''} · ${AGE_RANGES.find(a => a.v === modelConfig.age_range)?.l ?? ''} anos`, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
                  { icon: <Mic size={13} />, label: `Voz: ${VOICES.find(v => v.id === voiceId)?.name ?? ''}`, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                  { icon: <Film size={13} />, label: `${duration}s por clipe`, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                  { icon: <Wand2 size={13} />, label: 'Lip Sync em cada clipe', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-2 text-[11px] font-medium px-3 py-2.5 rounded-xl border ${item.color}`}>
                    {item.icon}
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Resumo scripts */}
              <div className="space-y-2">
                {activeSegments.map((s, i) => (
                  <div key={i} className="bg-zinc-800/60 rounded-xl px-3 py-2.5">
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wide mb-1">
                      {mode === 'single' ? 'Script' : `Clipe ${i + 1} — ${s.label}`}
                    </p>
                    <p className="text-[11px] text-zinc-300 leading-relaxed line-clamp-2">{s.script || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Créditos */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                credits >= estCredits
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-red-500/30 bg-red-500/10'
              }`}>
                <div>
                  <p className="text-xs font-semibold text-white">Total estimado</p>
                  <p className="text-[10px] text-zinc-500">Modelo{productUrl ? ' + Fusão' : ''} + {activeSegments.length}× (Script + Voz + Vídeo + Lip Sync)</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${credits >= estCredits ? 'text-emerald-400' : 'text-red-400'}`}>
                    {estCredits} cr
                  </p>
                  <p className="text-[10px] text-zinc-500">Você tem {credits} cr</p>
                </div>
              </div>

              {credits < estCredits && (
                <p className="text-[11px] text-red-400 text-center">Créditos insuficientes. Reduza o número de clipes ou recarregue.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
          <button
            onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft size={15} /> {step === 0 ? 'Cancelar' : 'Voltar'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex items-center gap-1.5 text-sm font-semibold bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-5 py-2.5 rounded-xl transition-all disabled:opacity-40 cursor-pointer"
            >
              Próximo <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleConfirm}
              disabled={credits < estCredits}
              className="flex items-center gap-1.5 text-sm font-semibold bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-5 py-2.5 rounded-xl transition-all disabled:opacity-40 cursor-pointer"
            >
              <Wand2 size={15} /> Montar campanha
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

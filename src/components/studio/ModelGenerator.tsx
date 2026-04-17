'use client'

import { useState, useEffect } from 'react'
import { 
  ChevronRight, ChevronLeft, RefreshCw, Save, Check, Loader2, User, 
  Sparkles, Briefcase, Star, Target, UserRound, GraduationCap, 
  Dumbbell, PersonStanding, Move, Shirt, Zap, Crown, Fingerprint 
} from 'lucide-react'

interface ModelParams {
  gender: string
  age_range: string
  skin_tone: string
  body_type: string
  style: string
  extra_details?: string
  engine: 'google' | 'flux'
}

const ENGINE_OPTIONS = [
  { 
    value: 'google', 
    label: 'Realismo Limpo (Google)', 
    subtitle: 'Ideal para peles suaves e cenários de dia a dia.',
    icon: <Sparkles className="text-blue-400" /> 
  },
  { 
    value: 'flux',   
    label: 'Realismo Cinematic (FLUX)', 
    subtitle: 'Máximo detalhe, texturas de pele reais e luz de cinema.',
    icon: <Zap className="text-purple-400" /> 
  },
]

const STEPS = [
  {
    id: 'gender',
    title: 'Gênero',
    subtitle: 'Determine a base do modelo',
    layout: 'two-col' as const,
    options: [
      { 
        value: 'feminino',  
        label: 'Feminino',  
        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&h=500&auto=format&fit=crop' 
      },
      { 
        value: 'masculino', 
        label: 'Masculino', 
        image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&h=600&auto=format&fit=crop' 
      },
    ],
  },
  {
    id: 'age_range',
    title: 'Faixa Etária',
    subtitle: 'A idade influencia o tom de voz e maturidade',
    layout: 'grid' as const,
    options: [
      { 
        value: '20-30', 
        label: '20 – 30 anos', 
        femaleImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=1000',
        maleImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=1000'
      },
      { 
        value: '30-40', 
        label: '30 – 40 anos', 
        femaleImage: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&q=80&w=1000',
        maleImage: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=1000'
      },
      { 
        value: '40-55', 
        label: '40 – 55 anos', 
        femaleImage: 'https://plus.unsplash.com/premium_photo-1770616817226-c2ac031db9fd?auto=format&fit=crop&q=80&w=1000',
        maleImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=1000' 
      },
      { 
        value: '55+',   
        label: 'Mais de 55', 
        femaleImage: 'https://images.pexels.com/photos/2050994/pexels-photo-2050994.jpeg?auto=compress&cs=tinysrgb&width=1000',
        maleImage: 'https://images.pexels.com/photos/3831645/pexels-photo-3831645.jpeg?auto=compress&cs=tinysrgb&width=1000'
      },
    ],
  },
  {
    id: 'skin_tone',
    title: 'Tom de Pele',
    subtitle: 'Base para o realismo da fotografia',
    layout: 'swatch' as const,
    options: [
      { value: 'muito_clara', label: 'Alva',     color: 'linear-gradient(135deg, #FFF5E6, #F5DCB4)' },
      { value: 'clara',       label: 'Clara',    color: 'linear-gradient(135deg, #FFDFB0, #E8C89C)' },
      { value: 'media',       label: 'Média',    color: 'linear-gradient(135deg, #EBC090, #C8956C)' },
      { value: 'oliva',       label: 'Oliva',    color: 'linear-gradient(135deg, #B98A66, #A0714F)' },
      { value: 'morena',      label: 'Morena',   color: 'linear-gradient(135deg, #8E5D3A, #7D4E2D)' },
      { value: 'negra',       label: 'Negra',    color: 'linear-gradient(135deg, #3B1E12, #26140D)' },
    ],
  },
  {
    id: 'body_type',
    title: 'Tipo Físico',
    subtitle: 'Estrutura corporal para enquadramento',
    layout: 'grid' as const,
    options: [
      { 
        value: 'magro',     
        label: 'Magro',    
        femaleImage: 'https://images.pexels.com/photos/18516750/pexels-photo-18516750.jpeg?auto=compress&cs=tinysrgb&width=1000',
        maleImage: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=1000'
      },
      { 
        value: 'atletico',  
        label: 'Atlético', 
        femaleImage: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?auto=format&fit=crop&q=80&w=1000',
        maleImage: 'https://images.unsplash.com/photo-1754475096386-b7a2a45a91fb?auto=format&fit=crop&q=80&w=1000'
      },
      { 
        value: 'normal',    
        label: 'Normal',   
        femaleImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=1000',
        maleImage: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=1000'
      },
      { 
        value: 'plus_size', 
        label: 'Plus Size',
        femaleImage: 'https://images.unsplash.com/photo-1562887077-e086f7da6870?auto=format&fit=crop&q=80&w=1000',
        maleImage: 'https://images.unsplash.com/photo-1677543167033-af3c688aa4df?auto=format&fit=crop&q=80&w=1000'
      },
    ],
  },
  {
    id: 'style',
    title: 'Estilo',
    subtitle: 'Vibe visual e vestimentas do modelo',
    layout: 'grid' as const,
    options: [
      { 
        value: 'casual',       
        label: 'Casual',       
        femaleImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=1000',
        maleImage: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&q=80&w=1000'
      },
      { 
        value: 'profissional', 
        label: 'Formal',       
        femaleImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1000&auto=format&fit=crop',
        maleImage: 'https://images.pexels.com/photos/3778876/pexels-photo-3778876.jpeg?auto=compress&cs=tinysrgb&width=1000'
      },
      { 
        value: 'esportivo',    
        label: 'Sporty',    
        femaleImage: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&q=80&w=1000',
        maleImage: 'https://images.unsplash.com/photo-1483721310020-03333e577078?auto=format&fit=crop&q=80&w=1000'
      },
      { 
        value: 'elegante',     
        label: 'High-End',     
        femaleImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=1000',
        maleImage: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=1000'
      },
    ],
  },
  {
    id: 'engine',
    title: 'Motor de Realismo',
    subtitle: 'Escolha a tecnologia de geração',
    layout: 'engine' as const,
    options: ENGINE_OPTIONS,
  },
]

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function ModelGenerator({ initial, onGenerate }: Props) {
  const [step, setStep] = useState(0)
  const [activeConfig, setActiveConfig] = useState({ google: true, flux: true })
  const [params, setParams] = useState<Partial<ModelParams>>({
    gender:    (initial.gender    as string) || '',
    age_range: (initial.age_range as string) || '',
    skin_tone: (initial.skin_tone as string) || '',
    body_type: (initial.body_type as string) || '',
    style:     (initial.style     as string) || '',
    engine:    (initial.engine    as 'google' | 'flux') || 'google',
  })

  // Busca configurações do Admin no mount
  useEffect(() => {
    fetch('/api/studio/config')
      .then(r => r.json())
      .then(config => {
        setActiveConfig(config)
        // Se só um estiver ativo, já pré-seleciona
        if (config.google && !config.flux) setParams(p => ({ ...p, engine: 'google' }))
        if (!config.google && config.flux) setParams(p => ({ ...p, engine: 'flux' }))
      })
      .catch(() => {}) // ignora erro, fica no default
  }, [])
  const [extra, setExtra]       = useState((initial.extra_details as string) || '')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<string | null>(
    (initial.model_text as string) || null
  )
  const [saved,  setSaved]      = useState(false)
  const [savedPrompt, setSavedPrompt] = useState<string | null>(null)
  const [loadingSaved, setLoadingSaved] = useState(false)

  // Filtra os passos baseado no que está ativo
  const filteredSteps = STEPS.filter(s => {
    if (s.id === 'engine') return activeConfig.google && activeConfig.flux
    return true
  })

  const currentStep = filteredSteps[step]
  const field = currentStep?.id as keyof ModelParams
  const hasSelection = step < filteredSteps.length ? !!params[field] : true
  const isReview = step >= filteredSteps.length

  function select(value: string) {
    setParams(prev => ({ ...prev, [field]: value }))
  }

  async function handleGenerate() {
    setLoading(true)
    setSaved(false)
    try {
      // Se apenas um motor estiver ativo e não passamos pelo passo de escolha, 
      // garante que o motor correto seja enviado
      let engineToUse = params.engine
      if (!activeConfig.google && activeConfig.flux) engineToUse = 'flux'
      if (activeConfig.google && !activeConfig.flux) engineToUse = 'google'

      onGenerate({ ...params, engine: engineToUse, extra_details: extra || undefined })
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

  const progress = Math.round((Math.min(step, filteredSteps.length) / filteredSteps.length) * 100)

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
            onClick={() => { setResult(null); setStep(filteredSteps.length) }}
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
          Passo {Math.min(step + 1, filteredSteps.length)} de {filteredSteps.length}
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

          {/* Layout dois colunas (Gênero) */}
          {currentStep.layout === 'two-col' && (
            <div className="grid grid-cols-2 gap-2">
              {currentStep.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => select(opt.value)}
                  className={`group relative flex flex-col items-center justify-end h-44 p-4 rounded-2xl border-2 transition-all overflow-hidden ${
                    params[field] === opt.value
                      ? 'border-indigo-500 ring-4 ring-indigo-500/20'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <img src={(opt as any).image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <span className="relative text-xs font-black tracking-widest uppercase text-white shadow-sm z-10">{opt.label}</span>
                  {params[field] === opt.value && (
                    <div className="absolute top-2 right-2 bg-indigo-500 rounded-full p-1 z-20">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
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
                  className={`flex flex-col items-center gap-2 p-2.5 rounded-xl border transition-all ${
                    params[field] === opt.value
                      ? 'border-indigo-500 bg-indigo-500/5 shadow-inner'
                      : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 shadow-sm'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full border shadow-lg transform transition-transform ${params[field] === opt.value ? 'scale-110 border-white/40 ring-2 ring-indigo-500/40' : 'border-black/20 hover:scale-105'}`}
                    style={{ background: (opt as { color: string }).color }}
                  />
                  <span className={`text-[10px] font-medium ${params[field] === opt.value ? 'text-indigo-400' : 'text-zinc-500'}`}>{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Layout grid com fotos dinâmicas (Age, Body, Style) */}
          {currentStep.layout === 'grid' && (
            <div className="grid grid-cols-2 gap-2">
              {currentStep.options.map(opt => {
                const isFemale = params.gender === 'feminino'
                const displayImg = isFemale ? (opt as any).femaleImage : (opt as any).maleImage
                
                return (
                  <button
                    key={opt.value}
                    onClick={() => select(opt.value)}
                    className={`group relative flex flex-col items-center justify-end h-56 p-4 rounded-2xl border transition-all overflow-hidden ${
                      params[field] === opt.value
                        ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                        : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900 shadow-xl'
                    }`}
                  >
                    {displayImg && (
                      <img 
                        src={displayImg} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        alt="" 
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="relative z-10 w-full text-center">
                      <span className={`text-[11px] font-black tracking-widest uppercase ${params[field] === opt.value ? 'text-white' : 'text-zinc-100'}`}>{opt.label}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Layout de Motores de IA */}
          {currentStep.layout === 'engine' && (
            <div className="flex flex-col gap-2">
              {currentStep.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => select(opt.value)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                    params[field] === opt.value
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${params[field] === opt.value ? 'bg-indigo-500/20' : 'bg-zinc-800'}`}>
                    {(opt as any).icon}
                  </div>
                  <div className="flex-1">
                    <span className="block text-[11px] font-bold text-white leading-tight">{opt.label}</span>
                    <span className="block text-[9px] text-zinc-500 mt-0.5">{(opt as any).subtitle}</span>
                  </div>
                  {params[field] === opt.value && (
                    <div className="bg-indigo-500 rounded-full p-1 shadow-lg">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Navegação */}
          <div className="flex items-center justify-between pt-2">
            {step > 0 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 hover:text-white transition-all group"
              >
                <div className="w-6 h-6 rounded-full border border-zinc-800 flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
                  <ChevronLeft size={14} />
                </div>
                Voltar
              </button>
            ) : <div />}
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!hasSelection}
              className={`flex items-center gap-2 text-[11px] font-bold px-4 py-2 rounded-xl transition-all ${
                hasSelection
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/10'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-700 cursor-not-allowed'
              }`}
            >
              {step === filteredSteps.length - 1 ? 'Revisar Detalhes' : 'Próxima Etapa'}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      ) : (
        /* Revisão + gerar */
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">O perfil está pronto</h3>
            <p className="text-[11px] text-zinc-500">Revise as características selecionadas abaixo</p>
          </div>

          {/* Chips de resumo mais premium */}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(params).filter(([k, v]) => v && k !== 'engine').map(([k, v]) => (
              <div key={k} className="bg-zinc-900/50 border border-zinc-800 p-2 rounded-lg">
                <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">{STEPS.find(s => s.id === k)?.title}</p>
                <p className="text-[11px] text-zinc-300 font-medium capitalize">{String(v).replace('_', ' ')}</p>
              </div>
            ))}
            {/* Chip de Engine em destaque na revisão */}
            <div className="col-span-2 bg-indigo-500/5 border border-indigo-500/20 p-2 rounded-lg flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                {params.engine === 'flux' ? <Zap size={12} className="text-purple-400" /> : <Sparkles size={12} className="text-blue-400" />}
              </div>
              <div>
                <p className="text-[9px] text-indigo-400/60 uppercase font-bold tracking-widest leading-none">Tecnologia de Realismo</p>
                <p className="text-[10px] text-indigo-300 font-bold mt-0.5">{params.engine === 'flux' ? 'FLUX Pro Cinematic' : 'Google Imagen HQ'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] text-zinc-500 font-medium px-1">Instruções Adicionais (Opcional)</p>
            <textarea
              value={extra}
              onChange={e => setExtra(e.target.value)}
              placeholder="Ex: cabelo loiro cacheado, tatuagens vazadas, óculos redondos..."
              rows={3}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="group relative flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Criando Persona...</>
                : <><Sparkles size={16} className="text-indigo-200" /> GERAR FOTO DO MODELO</>
              }
            </button>

            <button
              onClick={() => setStep(s => s - 1)}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 font-medium py-1 transition-colors"
            >
              Deseja alterar algo? Clique aqui para editar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

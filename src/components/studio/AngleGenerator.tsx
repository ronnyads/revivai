'use client'

import { useState, useEffect } from 'react'
import { Camera, Image as ImageIcon, Map, Maximize, User, Scan, ArrowRight, Sparkles, Layers } from 'lucide-react'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const ANGLES = [
  { id: 'frontal', label: 'Frontal', icon: <User size={14} />, desc: 'Visao direta do rosto e corpo' },
  { id: 'profile', label: 'Perfil', icon: <Scan size={14} />, desc: 'Visao lateral 90 graus' },
  { id: 'closeup', label: 'Close-up', icon: <Maximize size={14} />, desc: 'Foco total no rosto' },
  { id: 'wide', label: 'Distante', icon: <Map size={14} />, desc: 'Mostra o corpo inteiro' },
  { id: 'back', label: 'Costas', icon: <ArrowRight size={14} />, desc: 'Visao traseira do modelo' },
]

export default function AngleGenerator({ initial, onGenerate }: Props) {
  const [selectedAngle, setSelectedAngle] = useState((initial.angle as string) || 'frontal')
  const [aspectRatio, setAspectRatio] = useState((initial.aspect_ratio as string) || '9:16')
  const [engine, setEngine] = useState((initial.engine as string) || 'flux')
  const [activeConfig, setActiveConfig] = useState({ anglesGoogle: true, anglesFlux: true })

  useEffect(() => {
    fetch('/api/studio/config')
      .then((r) => r.json())
      .then((config) => {
        setActiveConfig(config)
        if (config.anglesGoogle && !config.anglesFlux) setEngine('google')
        if (!config.anglesGoogle && config.anglesFlux) setEngine('flux')
      })
      .catch(() => {})
  }, [])

  const showEngineBlock = activeConfig.anglesGoogle && activeConfig.anglesFlux
  const sourceUrl = initial.source_url as string
  const resultUrl = initial.url as string

  if (resultUrl) {
    return (
      <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="relative group">
          <div className="absolute -top-2 -left-2 z-10 flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-lg">
            <Sparkles size={10} /> NOVA PERSPECTIVA
          </div>
          <div className={`${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'} w-full overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-zinc-900 shadow-2xl`}>
            <img src={resultUrl} alt="Result" className="h-full w-full object-cover" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Perspectiva pronta</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              O novo angulo ja foi gerado. Voce pode abrir, baixar ou criar outra variacao mantendo a mesma persona.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="space-y-2">
              <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Proporcao</label>
              <div className="flex gap-0.5 rounded-lg border border-white/5 bg-zinc-900 p-0.5">
                {['9:16', '1:1', '4:5'].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`flex-1 rounded-md py-1 text-[10px] font-bold transition-all ${
                      aspectRatio === ratio ? 'border border-white/10 bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Motor</label>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] font-bold text-emerald-300">
                {engine === 'google' ? 'Imagen 4.0' : 'FLUX Ultra'}
              </div>
            </div>
          </div>

          <a
            href={resultUrl}
            download
            target="_blank"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold text-white transition-all hover:bg-white/10"
          >
            <Maximize size={14} /> ABRIR EM TELA CHEIA
          </a>

          <button
            onClick={() => onGenerate({ source_url: sourceUrl, angle: selectedAngle, engine, aspect_ratio: aspectRatio })}
            className="text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-emerald-400"
          >
            Gerar outra variacao
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
        <div className="rounded-xl bg-emerald-500/10 p-2">
          <Camera size={16} className="text-emerald-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-[12px] font-bold leading-tight text-white">Angulos (Trocar Posicao)</h4>
          <p className="text-[10px] leading-tight text-zinc-400">Crie novas perspectivas da mesma pessoa sem perder identidade.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="relative group">
            <div className="absolute -top-2 -left-2 z-10 flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-lg">
              <ImageIcon size={10} /> IMAGEM FONTE
            </div>

            {sourceUrl ? (
              <div className={`${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'} w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 shadow-inner transition-all group-hover:border-emerald-500/30`}>
                <img src={sourceUrl} alt="Source" className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 flex h-16 items-end bg-gradient-to-t from-black/80 to-transparent p-3">
                  <span className="text-[10px] font-medium text-zinc-400">Pronta para novo angulo</span>
                </div>
              </div>
            ) : (
              <div className={`${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'} flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/5 bg-white/5 p-6 text-center`}>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-zinc-600">
                  <Camera size={24} />
                </div>
                <p className="text-xs font-semibold text-zinc-400">Sem fonte conectada</p>
                <p className="text-[10px] text-zinc-600">Arraste a saida de uma Modelo para este card</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="space-y-2">
              <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Proporcao</label>
              <div className="flex gap-0.5 rounded-lg border border-white/5 bg-zinc-900 p-0.5">
                {['9:16', '1:1', '4:5'].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`flex-1 rounded-md py-1 text-[10px] font-bold transition-all ${
                      aspectRatio === ratio ? 'border border-white/10 bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {showEngineBlock ? (
              <div className="space-y-2">
                <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Motor</label>
                <div className="grid grid-cols-2 gap-2">
                  {activeConfig.anglesFlux ? (
                    <button
                      onClick={() => setEngine('flux')}
                      className={`rounded-xl border px-2 py-2 text-[10px] font-bold transition-all ${
                        engine === 'flux'
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <div className="mb-1 flex justify-center">
                        <Layers size={12} />
                      </div>
                      FLUX
                    </button>
                  ) : null}
                  {activeConfig.anglesGoogle ? (
                    <button
                      onClick={() => setEngine('google')}
                      className={`rounded-xl border px-2 py-2 text-[10px] font-bold transition-all ${
                        engine === 'google'
                          ? 'border-blue-500/40 bg-blue-500/15 text-blue-300'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <div className="mb-1 flex justify-center">
                        <Camera size={12} />
                      </div>
                      IMAGEN
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="block px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Perspectiva</label>
            <div className="grid grid-cols-3 gap-2">
              {ANGLES.map((ang) => (
                <button
                  key={ang.id}
                  onClick={() => setSelectedAngle(ang.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all ${
                    selectedAngle === ang.id
                      ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/20'
                      : 'border-white/5 bg-white/2 hover:border-white/10 hover:bg-white/5'
                  }`}
                >
                  <div className={`rounded-lg p-1.5 ${selectedAngle === ang.id ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                    {ang.icon}
                  </div>
                  <span className={`text-[10px] font-bold ${selectedAngle === ang.id ? 'text-white' : 'text-zinc-400'}`}>{ang.label}</span>
                  <span className="text-center text-[8px] leading-tight text-zinc-600">{ang.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!sourceUrl}
            onClick={() => onGenerate({ source_url: sourceUrl, angle: selectedAngle, engine, aspect_ratio: aspectRatio })}
            className={`group/btn relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 text-xs font-bold transition-all ${
              !sourceUrl
                ? 'cursor-not-allowed bg-zinc-800 text-zinc-600'
                : 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-500 active:scale-95'
            }`}
          >
            <Sparkles size={14} />
            GERAR NOVA PERSPECTIVA
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover/btn:animate-shimmer" />
          </button>

          <p className="text-center text-[9px] font-medium text-zinc-600">Preserva identidade, roupas e cenario em 100%</p>
        </div>
      </div>
    </div>
  )
}

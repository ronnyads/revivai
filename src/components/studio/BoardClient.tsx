'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowLeft, Edit2, Check, Zap } from 'lucide-react'
import Link from 'next/link'
import { StudioAsset, StudioProject, AssetType } from '@/types'
import AssetCard from './AssetCard'
import AddCardMenu from './AddCardMenu'

interface Props {
  project: StudioProject
  initialAssets: StudioAsset[]
  userCredits: number
}

// Ordem do fluxo guiado
const GUIDED_FLOW: AssetType[] = ['script', 'image', 'voice', 'video', 'caption']

const DEFAULT_PARAMS: Record<AssetType, Record<string, unknown>> = {
  model:   { gender: '', age_range: '', skin_tone: '', body_type: '', style: '' },
  script:  { product: '', audience: '', format: 'reels', hook_style: 'problema' },
  image:   { prompt: '', style: 'ugc', aspect_ratio: '9:16' },
  voice:   { script: '', voice_id: 'EXAVITQu4vr4xnSDxMaL', speed: 1.0 },
  video:   { source_image_url: '', motion_prompt: '', duration: 5 },
  talking_video: {
    source_image_url: '',
    talking_video_mode: 'exact_speech',
    idea_prompt: '',
    speech_text: '',
    expression_direction: '',
    visual_prompt: '',
    voice_id: 'EXAVITQu4vr4xnSDxMaL',
    speed: 1.0,
    quality: '720p',
  },
  caption: { audio_url: '' },
  upscale: { source_url: '', scale: 4 },
  render:  { source_image_url: '', audio_url: '' },
  animate: { portrait_image_url: '', driving_video_url: '' },
  compose: {
    portrait_url: '',
    product_url: '',
    product_urls: [],
    position: 'southeast',
    product_scale: 0.35,
    aspect_ratio: '9:16',
    compose_variant: 'fitting',
    compose_mode: 'gemini',
    fitting_pose_preset: 'three-quarter',
    fitting_energy_preset: 'natural',
  },
  lipsync: { face_url: '', audio_url: '' },
  face:    { face_image_url: '' },
  join:    { video_urls: [] },
  angles:  { source_url: '', angle: 'frontal', pose: 'straight' },
  music:   { prompt: '', style: 'lofi' },
  ugc_bundle: { source_url: '' },
  scene:   { source_url: '', scene_prompt: '', aspect_ratio: '9:16' },
  look_split: { source_url: '', smart_prompt: '' },
}
const CREDIT_COST: Record<AssetType, number> = {
  image: 8, script: 3, voice: 8, caption: 2, upscale: 3, video: 15, talking_video: 50, model: 8, render: 1, animate: 20, compose: 12, lipsync: 20, face: 0, join: 0, angles: 12, music: 10, ugc_bundle: 60, scene: 12, look_split: 6,
}

export default function BoardClient({ project, initialAssets, userCredits }: Props) {
  const [assets,       setAssets]       = useState<StudioAsset[]>(initialAssets)
  const [credits,      setCredits]      = useState(userCredits)
  const [title,        setTitle]        = useState(project.title)
  const [editing,      setEditing]      = useState(false)
  const [guidedMode,   setGuidedMode]   = useState(false)
  const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  // ── Polling ──────────────────────────────────────────────────────────────
  const startPolling = useCallback((assetId: string) => {
    if (pollingRef.current.has(assetId)) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/studio/assets/${assetId}`)
        // 404 = asset deletado/inválido — para polling
        if (!res.ok) {
          clearInterval(pollingRef.current.get(assetId))
          pollingRef.current.delete(assetId)
          return
        }
        const { asset } = await res.json()
        if (!asset) return
        if (asset.status === 'done' || asset.status === 'error') {
          clearInterval(pollingRef.current.get(assetId))
          pollingRef.current.delete(assetId)
          setAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...asset } : a))
        }
      } catch { /* silencioso */ }
    }, 3000)
    pollingRef.current.set(assetId, interval)
  }, [])

  useEffect(() => {
    assets.filter(a => a.status === 'processing').forEach(a => startPolling(a.id))
    return () => {
      pollingRef.current.forEach(interval => clearInterval(interval))
      pollingRef.current.clear()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Adicionar card idle ──────────────────────────────────────────────────
  function addIdleCard(type: AssetType, prefillParams?: Record<string, unknown>) {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const tempAsset: StudioAsset = {
      id: tempId,
      project_id: project.id,
      user_id: project.user_id,
      type,
      status: 'idle',
      input_params: { ...DEFAULT_PARAMS[type], ...prefillParams },
      credits_cost: CREDIT_COST[type],
      board_order: assets.length,
      created_at: new Date().toISOString(),
    }
    setAssets(prev => [...prev, tempAsset])
  }

  async function addCard(type: AssetType, prefillParams?: Record<string, unknown>) {
    if (credits < CREDIT_COST[type]) {
      alert(`Você precisa de ${CREDIT_COST[type]} crédito(s) para gerar ${type}.`)
      return
    }
    addIdleCard(type, prefillParams)
  }

  // ── "Usar em..." — cria card pré-preenchido ──────────────────────────────
  function handleUseAs(targetType: AssetType, prefillParams: Record<string, unknown>) {
    // Se já existe um card idle desse tipo, atualiza ele em vez de criar novo
    const existingIdle = assets.find(a => a.type === targetType && a.status === 'idle')
    if (existingIdle) {
      setAssets(prev => prev.map(a =>
        a.id === existingIdle.id
          ? { ...a, input_params: { ...a.input_params, ...prefillParams } }
          : a
      ))
      // Scroll suave para o card
      setTimeout(() => {
        document.getElementById(`card-${existingIdle.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    } else {
      addIdleCard(targetType, prefillParams)
    }
  }

  // ── Fluxo guiado — cria todos os cards em ordem ──────────────────────────
  function activateGuidedFlow() {
    if (assets.length > 0) {
      // Já tem cards — só ativa numeração
      setGuidedMode(true)
      return
    }
    // Board vazio — cria todos os cards do fluxo
    const now = Date.now()
    const newAssets: StudioAsset[] = GUIDED_FLOW.map((type, i) => ({
      id: `temp-${now}-${i}`,
      project_id: project.id,
      user_id: project.user_id,
      type,
      status: 'idle',
      input_params: DEFAULT_PARAMS[type],
      credits_cost: CREDIT_COST[type],
      board_order: i,
      created_at: new Date().toISOString(),
    }))
    setAssets(newAssets)
    setGuidedMode(true)
  }

  // ── Gerar ────────────────────────────────────────────────────────────────
  async function handleGenerate(type: AssetType, params: Record<string, unknown>, existingId: string) {
    const isTemp = existingId.startsWith('temp-')

    // Marca o card como "processing" visualmente enquanto aguarda o POST
    // NÃO deleta antes — só remove/atualiza após confirmar sucesso
    setAssets(prev => prev.map(a =>
      a.id === existingId ? { ...a, status: 'processing' as const } : a
    ))

    let res: Response
    try {
      res = await fetch('/api/studio/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id, type, input_params: params }),
      })
    } catch {
      // Erro de rede — restaura o card para idle
      setAssets(prev => prev.map(a =>
        a.id === existingId ? { ...a, status: 'idle' as const } : a
      ))
      alert('Erro de conexão. Verifique sua internet e tente novamente.')
      return
    }

    const body = await res.json()
    const { asset, error } = body

    if (!res.ok || error || !asset) {
      // Falhou — restaura o card para idle com mensagem de erro visível
      setAssets(prev => prev.map(a =>
        a.id === existingId
          ? { ...a, status: 'idle' as const, error_msg: error ?? `Erro ${res.status}` }
          : a
      ))
      alert(`Erro ao gerar: ${error ?? `HTTP ${res.status}`}`)
      return
    }

    // Sucesso — agora sim remove o card antigo (se existia no DB) e adiciona o novo
    if (!isTemp) {
      fetch(`/api/studio/assets/${existingId}`, { method: 'DELETE' }).catch(() => {})
    }
    setAssets(prev => [
      ...prev.filter(a => a.id !== existingId),
      asset,
    ])
    setCredits(c => c - asset.credits_cost)
    if (asset.status === 'processing') startPolling(asset.id)
  }

  // ── Deletar / Retry ──────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    setAssets(prev => prev.filter(a => a.id !== id))
    if (!id.startsWith('temp-')) {
      await fetch(`/api/studio/assets/${id}`, { method: 'DELETE' })
    }
  }

  function handleRetry(id: string, type: AssetType, params: Record<string, unknown>) {
    handleGenerate(type, params, id)
  }

  // ── Título ───────────────────────────────────────────────────────────────
  async function saveTitle() {
    setEditing(false)
    if (title === project.title) return
    await fetch(`/api/studio/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  }

  // Numeração para modo guiado
  function getStepNumber(asset: StudioAsset): number | undefined {
    if (!guidedMode) return undefined
    const idx = GUIDED_FLOW.indexOf(asset.type)
    return idx >= 0 ? idx + 1 : undefined
  }

  const ghostTypes: AssetType[] = ['script', 'image', 'voice', 'video']

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard/studio" className="text-zinc-500 hover:text-white transition-colors shrink-0">
            <ArrowLeft size={18} />
          </Link>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveTitle()}
                autoFocus
                className="bg-zinc-800 border border-accent rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none min-w-[200px]"
              />
              <button onClick={saveTitle} className="text-accent hover:text-white transition-colors">
                <Check size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 text-sm font-semibold text-white hover:text-accent transition-colors group truncate"
            >
              {title}
              <Edit2 size={13} className="text-zinc-600 group-hover:text-accent shrink-0" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-zinc-500 bg-zinc-800 px-3 py-1.5 rounded-xl">
            {credits} crédito{credits !== 1 ? 's' : ''}
          </span>
          {/* Fluxo guiado */}
          <button
            onClick={activateGuidedFlow}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all ${
              guidedMode
                ? 'bg-accent/10 border-accent text-accent'
                : 'border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
            }`}
          >
            <Zap size={13} />
            {guidedMode ? 'Guiado ativo' : 'Fluxo Guiado'}
          </button>
          <AddCardMenu onAdd={addCard} />
        </div>
      </div>

      {/* Dica do fluxo guiado */}
      {guidedMode && (
        <div className="mx-6 mt-4 bg-accent/5 border border-accent/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <Zap size={15} className="text-accent shrink-0" />
          <p className="text-xs text-zinc-300">
            <span className="text-accent font-medium">Modo guiado ativo</span> — siga a numeração nos cards.
            Quando um card ficar pronto, use o botão <span className="text-white font-medium">"Usar em..."</span> para passar o resultado automaticamente para o próximo.
          </p>
          <button onClick={() => setGuidedMode(false)} className="text-zinc-600 hover:text-white text-xs shrink-0">Fechar</button>
        </div>
      )}

      {/* Board grid */}
      <div className="p-6">
        {assets.length === 0 ? (
          <div className="flex flex-col items-center gap-6 mt-8">
            {/* Opções de início */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-md">
              <button
                onClick={activateGuidedFlow}
                className="flex flex-col items-center gap-2 border-2 border-accent/30 hover:border-accent bg-accent/5 hover:bg-accent/10 rounded-2xl p-6 transition-all group"
              >
                <Zap size={24} className="text-accent" />
                <p className="text-sm font-semibold text-white">Fluxo Guiado</p>
                <p className="text-[10px] text-zinc-400 text-center">Cria todos os cards em ordem</p>
              </button>
              <button
                onClick={() => addIdleCard('script')}
                className="flex flex-col items-center gap-2 border-2 border-dashed border-zinc-800 hover:border-zinc-600 rounded-2xl p-6 transition-all group"
              >
                <span className="text-2xl">✦</span>
                <p className="text-sm font-semibold text-white group-hover:text-accent transition-colors">Board Livre</p>
                <p className="text-[10px] text-zinc-400 text-center">Adicione cards à vontade</p>
              </button>
            </div>
            {/* Ghost cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
              {ghostTypes.map(type => (
                <button
                  key={type}
                  onClick={() => addCard(type)}
                  className="border-2 border-dashed border-zinc-800 hover:border-accent/40 rounded-2xl p-6 flex flex-col items-center gap-2 text-zinc-600 hover:text-accent transition-all group"
                >
                  <span className="text-2xl">{type === 'script' ? '📝' : type === 'image' ? '🖼️' : type === 'voice' ? '🎙️' : '🎬'}</span>
                  <p className="text-xs font-medium">{type === 'script' ? 'Script' : type === 'image' ? 'Imagem' : type === 'voice' ? 'Voz' : 'Vídeo'}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets
              .sort((a, b) => a.board_order - b.board_order)
              .map(asset => (
                <div key={asset.id} id={`card-${asset.id}`}>
                  <AssetCard
                    asset={asset}
                    stepNumber={getStepNumber(asset)}
                    onDelete={handleDelete}
                    onRetry={handleRetry}
                    onGenerate={handleGenerate}
                    onUseAs={handleUseAs}
                  />
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}

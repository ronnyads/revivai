'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ArrowLeft, Edit2, Check } from 'lucide-react'
import Link from 'next/link'
import { StudioAsset, StudioProject, AssetType } from '@/types'
import AssetCard from './AssetCard'
import AddCardMenu from './AddCardMenu'

interface Props {
  project: StudioProject
  initialAssets: StudioAsset[]
  userCredits: number
}

export default function BoardClient({ project, initialAssets, userCredits }: Props) {
  const [assets,  setAssets]  = useState<StudioAsset[]>(initialAssets)
  const [credits, setCredits] = useState(userCredits)
  const [title,   setTitle]   = useState(project.title)
  const [editing, setEditing] = useState(false)
  const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  // ── Polling para assets em processing ───────────────────────────────────
  const startPolling = useCallback((assetId: string) => {
    if (pollingRef.current.has(assetId)) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/studio/assets/${assetId}`)
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

  // Inicia polling para assets processing no carregamento
  useEffect(() => {
    assets.filter(a => a.status === 'processing').forEach(a => startPolling(a.id))
    return () => {
      pollingRef.current.forEach(interval => clearInterval(interval))
      pollingRef.current.clear()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Adicionar card novo ─────────────────────────────────────────────────
  async function addCard(type: AssetType) {
    const costMap: Record<AssetType, number> = {
      image: 1, script: 1, voice: 1, caption: 1, upscale: 1, video: 3,
    }
    const cost = costMap[type]
    if (credits < cost) {
      alert(`Você precisa de ${cost} crédito(s) para gerar ${type}.`)
      return
    }

    const defaultParams: Record<AssetType, Record<string, unknown>> = {
      image:   { prompt: '', style: 'ugc', aspect_ratio: '9:16' },
      script:  { product: '', audience: '', format: 'reels', hook_style: 'problema' },
      voice:   { script: '', voice_id: 'EXAVITQu4vr4xnSDxMaL', speed: 1.0 },
      video:   { source_image_url: '', motion_prompt: '', duration: 5 },
      caption: { audio_url: '' },
      upscale: { source_url: '', scale: 4 },
    }

    // Adiciona card idle localmente
    const tempId = `temp-${Date.now()}`
    const tempAsset: StudioAsset = {
      id: tempId,
      project_id: project.id,
      user_id: project.user_id,
      type,
      status: 'idle',
      input_params: defaultParams[type],
      credits_cost: cost,
      board_order: assets.length,
      created_at: new Date().toISOString(),
    }
    setAssets(prev => [...prev, tempAsset])
  }

  // ── Gerar (de um card idle) ─────────────────────────────────────────────
  async function handleGenerate(type: AssetType, params: Record<string, unknown>, existingId: string) {
    const isTemp = existingId.startsWith('temp-')

    // Se card temporário, cria via API; se já existe no DB, deleta e recria
    if (!isTemp) {
      await fetch(`/api/studio/assets/${existingId}`, { method: 'DELETE' })
      setAssets(prev => prev.filter(a => a.id !== existingId))
    } else {
      setAssets(prev => prev.filter(a => a.id !== existingId))
    }

    const res = await fetch('/api/studio/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: project.id, type, input_params: params }),
    })

    const { asset, error } = await res.json()
    if (error || !asset) {
      alert(error ?? 'Erro ao gerar')
      // Readiciona o card idle
      setAssets(prev => [...prev, { id: existingId, project_id: project.id, user_id: project.user_id, type, status: 'idle', input_params: params, credits_cost: type === 'video' ? 3 : 1, board_order: prev.length, created_at: new Date().toISOString() }])
      return
    }

    setAssets(prev => [...prev, asset])
    setCredits(c => c - asset.credits_cost)

    if (asset.status === 'processing') {
      startPolling(asset.id)
    }
  }

  // ── Deletar card ────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    setAssets(prev => prev.filter(a => a.id !== id))
    if (!id.startsWith('temp-')) {
      await fetch(`/api/studio/assets/${id}`, { method: 'DELETE' })
    }
  }

  // ── Retry ───────────────────────────────────────────────────────────────
  function handleRetry(id: string, type: AssetType, params: Record<string, unknown>) {
    handleGenerate(type, params, id)
  }

  // ── Salvar título ───────────────────────────────────────────────────────
  async function saveTitle() {
    setEditing(false)
    if (title === project.title) return
    await fetch(`/api/studio/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  }

  // ── Empty state placeholders ────────────────────────────────────────────
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
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-zinc-500 bg-zinc-800 px-3 py-1.5 rounded-xl">
            {credits} crédito{credits !== 1 ? 's' : ''}
          </span>
          <AddCardMenu onAdd={addCard} />
        </div>
      </div>

      {/* Board grid */}
      <div className="p-6">
        {assets.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-8">
            {ghostTypes.map(type => (
              <button
                key={type}
                onClick={() => addCard(type)}
                className="border-2 border-dashed border-zinc-800 hover:border-accent/40 rounded-2xl p-6 flex flex-col items-center gap-2 text-zinc-600 hover:text-accent transition-all group"
              >
                <span className="text-2xl">{
                  type === 'script' ? '📝' :
                  type === 'image'  ? '🖼️' :
                  type === 'voice'  ? '🎙️' : '🎬'
                }</span>
                <p className="text-xs font-medium capitalize">{type === 'script' ? 'Script' : type === 'image' ? 'Imagem' : type === 'voice' ? 'Voz' : 'Vídeo'}</p>
                <p className="text-[10px] text-zinc-700 group-hover:text-zinc-500">Clique para adicionar</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets
              .sort((a, b) => a.board_order - b.board_order)
              .map(asset => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onDelete={handleDelete}
                  onRetry={handleRetry}
                  onGenerate={handleGenerate}
                />
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}

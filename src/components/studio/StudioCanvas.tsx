'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ReactFlow, Background, BackgroundVariant, MiniMap, Controls,
  useNodesState, useEdgesState, addEdge, ConnectionMode,
  type Node, type Edge, type Connection, type NodeChange, type EdgeChange,
  MarkerType, ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowLeft, Edit2, Check, Plus, Wand2, LayoutGrid } from 'lucide-react'
import Link from 'next/link'
import { StudioAsset, StudioConnection, StudioProject, AssetType } from '@/types'
import AssetNode, { AssetNodeData } from './nodes/AssetNode'
import LightEdge from './edges/LightEdge'
import AddCardMenu from './AddCardMenu'
import CampaignWizard, { WizardResult } from './CampaignWizard'

const nodeTypes = { assetNode: AssetNode }
const edgeTypes = { lightEdge: LightEdge }

const CREDIT_COST: Record<AssetType, number> = {
  image: 1, script: 1, voice: 1, caption: 1, upscale: 1, video: 3, model: 1, render: 1, animate: 3, compose: 1, lipsync: 3,
}

const DEFAULT_PARAMS: Record<AssetType, Record<string, unknown>> = {
  model:   { gender: '', age_range: '', skin_tone: '', body_type: '', style: '' },
  script:  { product: '', audience: '', format: 'reels', hook_style: 'problema' },
  image:   { prompt: '', style: 'ugc', aspect_ratio: '9:16' },
  voice:   { script: '', voice_id: 'EXAVITQu4vr4xnSDxMaL', speed: 1.0 },
  video:   { source_image_url: '', motion_prompt: '', duration: 5 },
  caption: { audio_url: '' },
  upscale: { source_url: '', scale: 4 },
  render:  { source_image_url: '', audio_url: '' },
  animate: { portrait_image_url: '', driving_video_url: '' },
  compose: { portrait_url: '', product_url: '', position: 'southeast', product_scale: 0.35 },
  lipsync: { face_url: '', audio_url: '' },
}

// Mapeamento: targetHandle → campo a preencher no nó destino
const HANDLE_TO_FIELD: Record<string, string> = {
  source_image_url:  'source_image_url',
  source_url:        'source_url',
  script:            'script',
  audio_url:         'audio_url',
  model_prompt:      'model_prompt',
  continuation_frame:  'continuation_frame',
  portrait_image_url:  'portrait_image_url',
  portrait_url:        'portrait_url',
  face_url:            'face_url',
}

interface Props {
  project: StudioProject
  initialAssets: StudioAsset[]
  initialConnections: StudioConnection[]
  userCredits: number
}

function buildNodes(assets: StudioAsset[], callbacks: Omit<AssetNodeData, 'asset'>): Node[] {
  return assets.map((asset, i) => ({
    id: asset.id,
    type: 'assetNode',
    position: {
      x: asset.position_x ?? (100 + (i % 3) * 380),
      y: asset.position_y ?? (100 + Math.floor(i / 3) * 440),
    },
    data: { asset, ...callbacks } as unknown as Record<string, unknown>,
    style: { overflow: 'visible', width: 360 },
  }))
}

function buildEdges(connections: StudioConnection[]): Edge[] {
  return connections.map(c => ({
    id: c.id,
    source: c.source_id,
    target: c.target_id,
    sourceHandle: c.source_handle,
    targetHandle: c.target_handle,
    type: 'lightEdge',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f97316', width: 16, height: 16 },
  }))
}

function StudioCanvasInner({ project, initialAssets, initialConnections, userCredits }: Props) {
  const [assets,      setAssets]      = useState<StudioAsset[]>(initialAssets)
  const [connections, setConnections] = useState<StudioConnection[]>(initialConnections)
  const [credits,     setCredits]     = useState(userCredits)
  const [title,       setTitle]       = useState(project.title)
  const [editing,     setEditing]     = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  // ── Callbacks passados para os nós ──────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id))
    if (!id.startsWith('temp-')) {
      await fetch(`/api/studio/assets/${id}`, { method: 'DELETE' })
    }
  }, [])

  const handleUpdateParams = useCallback((id: string, params: Record<string, unknown>) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, input_params: { ...a.input_params, ...params } } : a))
  }, [])

  const startPolling = useCallback((assetId: string) => {
    if (pollingRef.current.has(assetId)) return
    const stopPolling = () => {
      clearInterval(pollingRef.current.get(assetId))
      pollingRef.current.delete(assetId)
    }
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/studio/assets/${assetId}`)
        // 404 = asset foi deletado/substituído — para de fazer poll
        if (!res.ok) { stopPolling(); return }
        const { asset } = await res.json()
        if (!asset) { stopPolling(); return }
        if (asset.status === 'done' || asset.status === 'error') {
          stopPolling()
          setAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...asset } : a))
        }
      } catch { /* rede — tenta de novo no próximo tick */ }
    }, 3000)
    pollingRef.current.set(assetId, interval)
  }, [])

  const handleGenerate = useCallback(async (type: AssetType, params: Record<string, unknown>, existingId: string) => {
    const isTemp = existingId.startsWith('temp-')

    // Salva posição antes de qualquer mudança de estado
    const currentAsset = assets.find(a => a.id === existingId)
    const pos = currentAsset
      ? { x: currentAsset.position_x, y: currentAsset.position_y }
      : { x: 100 + (assets.length % 3) * 380, y: 100 + Math.floor(assets.length / 3) * 440 }

    // Mescla params do form com campos já preenchidos por conexões (ex: model_prompt, source_image_url)
    // Os params do form têm prioridade sobre os defaults, mas campos de conexão são preservados
    const mergedParams = { ...(currentAsset?.input_params ?? {}), ...params }

    // Mostra spinner no card existente enquanto a API processa
    setAssets(prev => prev.map(a =>
      a.id === existingId ? { ...a, status: 'processing', error_msg: null } : a
    ))

    // Passa existing_id para o backend reutilizar o mesmo registro (ID estável = conexões preservadas)
    const res = await fetch('/api/studio/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: project.id,
        type,
        input_params: mergedParams,
        existing_id: isTemp ? undefined : existingId,
      }),
    })
    const { asset, error } = await res.json()

    if (error || !asset) {
      setAssets(prev => prev.map(a =>
        a.id === existingId ? { ...a, status: 'error', error_msg: error ?? 'Erro ao gerar' } : a
      ))
      return
    }

    // Atualiza posição no DB
    fetch(`/api/studio/assets/${asset.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position_x: pos.x, position_y: pos.y }),
    })

    // Atualiza o card in-place (o ID pode mudar se era temp → substitui em assets, edges e connections)
    const newId = asset.id
    const oldId = existingId

    setAssets(prev => prev.map(a =>
      a.id === oldId
        ? { ...asset, position_x: pos.x, position_y: pos.y }
        : a
    ))

    // Re-mapeia edges para o novo ID (evita conexões órfãs quando temp- vira UUID real)
    if (newId !== oldId) {
      setEdges(prev => prev.map(e => ({
        ...e,
        source: e.source === oldId ? newId : e.source,
        target: e.target === oldId ? newId : e.target,
      })))
      // Só remapeia connections se o ID antigo existe nelas
      const hasOldId = connections.some(c => c.source_id === oldId || c.target_id === oldId)
      if (hasOldId) {
        setConnections(prev => prev.map(c => ({
          ...c,
          source_id: c.source_id === oldId ? newId : c.source_id,
          target_id: c.target_id === oldId ? newId : c.target_id,
        })))
      }
    }

    setCredits(c => c - asset.credits_cost)
    if (asset.status === 'processing') startPolling(asset.id)
  }, [assets, project.id, startPolling])

  const nodeCallbacks: Omit<AssetNodeData, 'asset'> = {
    onDelete: handleDelete,
    onGenerate: handleGenerate,
    onUpdateParams: handleUpdateParams,
  }

  // ── React Flow state ─────────────────────────────────────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes(assets, nodeCallbacks))
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges(connections))

  // Sincroniza assets → nodes de forma granular (sem recriar todos — preserva edges)
  useEffect(() => {
    setNodes(prev => {
      const assetMap = new Map(assets.map(a => [a.id, a]))
      const existingIds = new Set(prev.map(n => n.id))

      // Atualiza apenas o campo `asset` dos nodes existentes (posição preservada)
      const updated = prev
        .filter(n => assetMap.has(n.id))
        .map(n => ({
          ...n,
          data: { ...n.data, asset: assetMap.get(n.id)! },
          style: { overflow: 'visible', width: 360 },
        }))

      // Adiciona nodes novos que ainda não existem no ReactFlow
      const newAssets = assets.filter(a => !existingIds.has(a.id))
      const offset = prev.length
      const newNodes = newAssets.map((asset, j) => ({
        id: asset.id,
        type: 'assetNode' as const,
        position: {
          x: asset.position_x ?? (100 + ((offset + j) % 3) * 380),
          y: asset.position_y ?? (100 + Math.floor((offset + j) / 3) * 440),
        },
        data: { asset, ...nodeCallbacks } as unknown as Record<string, unknown>,
        style: { overflow: 'visible', width: 360 },
      }))

      return [...updated, ...newNodes]
    })
  }, [assets]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Merge: mantém edges temp visuais + sincroniza as do banco
    // Sem isso, setEdges(buildEdges(connections)) apagaria todas as temp-edges da campanha
    setEdges(prev => {
      const dbEdges = buildEdges(connections)
      const dbIds   = new Set(dbEdges.map(e => e.id))
      const tempEdges = prev.filter(e => e.id.startsWith('temp-') && !dbIds.has(e.id))
      return [...dbEdges, ...tempEdges]
    })
  }, [connections]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-propaga URLs pelas arestas quando um asset completa (ex: compose → video, video → lipsync)
  useEffect(() => {
    const updates: { tgtId: string; field: string; value: string }[] = []

    edges.forEach(edge => {
      if (!edge.targetHandle) return
      const src = assets.find(a => a.id === edge.source)
      const tgt = assets.find(a => a.id === edge.target)
      if (!src?.result_url || !tgt) return

      const fillValue = edge.targetHandle === 'continuation_frame'
        ? (src.last_frame_url ?? src.result_url)
        : src.result_url
      const field = HANDLE_TO_FIELD[edge.targetHandle] ?? edge.targetHandle

      // Força a atualização se o nó destino estiver com um valor diferente da saída da fonte
      if (tgt.input_params[field] !== fillValue) {
        updates.push({ tgtId: tgt.id, field, value: fillValue })
      }
    })

    if (updates.length > 0) {
      // Dispara a atualização para todos os campos que defasaram
      updates.forEach(u => handleUpdateParams(u.tgtId, { [u.field]: u.value }))
    }
  }, [assets, edges, handleUpdateParams])

  useEffect(() => {
    assets.filter(a => a.status === 'processing').forEach(a => startPolling(a.id))
    return () => {
      pollingRef.current.forEach(i => clearInterval(i))
      pollingRef.current.clear()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag end — salva posição ─────────────────────────────────────────────
  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.id.startsWith('temp-')) return
    fetch(`/api/studio/assets/${node.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position_x: node.position.x, position_y: node.position.y }),
    })
  }, [])

  // ── Conectar dois nós ────────────────────────────────────────────────────
  const onConnect = useCallback(async (connection: Connection) => {
    const { source, target, sourceHandle } = connection
    if (!source || !target) return

    // Infere o handle alvo inline (sem stale closure — assets sempre atual via deps)
    function inferTarget(): string | null {
      const src = assets.find(a => a.id === source)
      const tgt = assets.find(a => a.id === target)
      if (!src || !tgt) return null
      if (src.type === 'model'   && (tgt.type === 'image' || tgt.type === 'video'))  return 'model_prompt'
      if (src.type === 'image'   && tgt.type === 'video')    return 'source_image_url'
      if (src.type === 'video'   && tgt.type === 'video')    return 'continuation_frame'
      if (src.type === 'video'   && tgt.type === 'render')   return 'source_image_url'
      if (src.type === 'image'   && tgt.type === 'upscale')  return 'source_url'
      if (src.type === 'upscale' && tgt.type === 'video')    return 'source_image_url'
      if (src.type === 'script'  && tgt.type === 'voice')    return 'script'
      if (src.type === 'voice'   && tgt.type === 'caption')  return 'audio_url'
      if (src.type === 'voice'   && tgt.type === 'render')   return 'audio_url'
      if (src.type === 'voice'   && tgt.type === 'video')    return 'audio_url'
      if (src.type === 'model'   && tgt.type === 'animate')  return 'portrait_image_url'
      if (src.type === 'image'   && tgt.type === 'animate')  return 'portrait_image_url'
      if (src.type === 'model'   && tgt.type === 'compose')  return 'portrait_url'
      if (src.type === 'image'   && tgt.type === 'compose')  return 'portrait_url'
      if (src.type === 'compose' && tgt.type === 'video')    return 'source_image_url'
      if (src.type === 'video'   && tgt.type === 'lipsync')  return 'face_url'
      if (src.type === 'compose' && tgt.type === 'lipsync')  return 'face_url'
      if (src.type === 'animate' && tgt.type === 'lipsync')  return 'face_url'
      if (src.type === 'voice'   && tgt.type === 'lipsync')  return 'audio_url'
      return null
    }

    const targetHandle = connection.targetHandle ?? inferTarget()
    if (!targetHandle) return

    const isSourceTemp = source.startsWith('temp-')
    const isTargetTemp = target.startsWith('temp-')

    if (!isSourceTemp && !isTargetTemp) {
      // Ambos têm UUIDs reais — persiste no DB
      const res = await fetch('/api/studio/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          source_id: source,
          target_id: target,
          source_handle: sourceHandle ?? 'output',
          target_handle: targetHandle,
        }),
      })
      const { connection: conn } = await res.json()
      if (conn) setConnections(prev => [...prev, conn])
    } else {
      // Pelo menos um card ainda é temporário — adiciona aresta visual localmente
      const tempConnId = `temp-conn-${Date.now()}`
      setEdges(prev => addEdge({
        id: tempConnId,
        source,
        target,
        sourceHandle: sourceHandle ?? 'output',
        targetHandle,
        type: 'lightEdge',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f97316', width: 16, height: 16 },
      }, prev))
    }

    // Auto-preenche o campo no nó destino com a URL do nó fonte (sempre)
    const sourceAsset = assets.find(a => a.id === source)
    if (sourceAsset?.result_url) {
      const fillValue = targetHandle === 'continuation_frame'
        ? (sourceAsset.last_frame_url ?? sourceAsset.result_url)
        : sourceAsset.result_url
      const field = HANDLE_TO_FIELD[targetHandle] ?? targetHandle
      handleUpdateParams(target, { [field]: fillValue })
      if (!isTargetTemp) {
        await fetch(`/api/studio/assets/${target}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input_params: { [field]: fillValue } }),
        })
      }
    }
  }, [assets, project.id, handleUpdateParams, setEdges])

  // ── Deletar aresta ───────────────────────────────────────────────────────
  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    deletedEdges.forEach(async e => {
      setConnections(prev => prev.filter(c => c.id !== e.id))
      if (!e.id.startsWith('temp-')) {
        await fetch(`/api/studio/connections/${e.id}`, { method: 'DELETE' })
      }
    })
  }, [])

  // ── Adicionar card ───────────────────────────────────────────────────────
  function addCard(type: AssetType) {
    if (credits < CREDIT_COST[type]) {
      alert(`Você precisa de ${CREDIT_COST[type]} crédito(s).`)
      return
    }
    const i = assets.length
    const tempId = `temp-${Date.now()}`
    const newAsset: StudioAsset = {
      id: tempId,
      project_id: project.id,
      user_id: project.user_id,
      type,
      status: 'idle',
      input_params: DEFAULT_PARAMS[type],
      credits_cost: CREDIT_COST[type],
      board_order: i,
      position_x: 100 + (i % 3) * 380,
      position_y: 100 + Math.floor(i / 3) * 440,
      created_at: new Date().toISOString(),
    }
    setAssets(prev => [...prev, newAsset])
  }

  // ── Campaign Wizard → monta cards automaticamente ──────────────────────
  function buildCampaign(result: WizardResult) {
    setShowWizard(false)
    const now = Date.now()
    const newAssets: StudioAsset[] = []
    const tempEdges: Edge[] = []
    let idx = 0
    let edgeIdx = 0

    function mkEdge(source: string, target: string, sh: string, th: string): Edge {
      return {
        id: `temp-edge-${now}-${edgeIdx++}`,
        source, target, sourceHandle: sh, targetHandle: th,
        type: 'lightEdge',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f97316', width: 16, height: 16 },
      }
    }

    // 1. Card Modelo UGC — coluna esquerda
    const modelId = `temp-${now}-model`
    newAssets.push({
      id: modelId,
      project_id: project.id, user_id: project.user_id,
      type: 'model', status: 'idle',
      input_params: { ...result.modelConfig },
      credits_cost: 1, board_order: idx++,
      position_x: 60, position_y: 440,
      created_at: new Date().toISOString(),
    })

    // 2. Card Compose — se tiver produto
    let composeId: string | null = null
    if (result.productUrl) {
      composeId = `temp-${now}-compose`
      newAssets.push({
        id: composeId,
        project_id: project.id, user_id: project.user_id,
        type: 'compose', status: 'idle',
        input_params: { portrait_url: '', product_url: result.productUrl, position: 'southeast', product_scale: 0.35 },
        credits_cost: 1, board_order: idx++,
        position_x: 440, position_y: 440,
        created_at: new Date().toISOString(),
      })
      tempEdges.push(mkEdge(modelId, composeId, 'output', 'portrait_url'))
    }

    // 3. Cards por segmento: Script → Voz → Vídeo (contínuo) → Lip Sync
    const baseX = result.productUrl ? 820 : 440
    let prevVideoId: string | null = null

    result.segments.forEach((seg, i) => {
      const colX      = baseX + i * 380
      const scriptId  = `temp-${now}-script-${i}`
      const voiceId   = `temp-${now}-voice-${i}`
      const videoId   = `temp-${now}-video-${i}`
      const lipsyncId = `temp-${now}-lipsync-${i}`

      newAssets.push({
        id: scriptId,
        project_id: project.id, user_id: project.user_id,
        type: 'script', status: 'idle',
        input_params: { product: '', audience: '', format: 'reels', script_text: seg.script },
        credits_cost: 1, board_order: idx++,
        position_x: colX, position_y: 60,
        created_at: new Date().toISOString(),
      })
      newAssets.push({
        id: voiceId,
        project_id: project.id, user_id: project.user_id,
        type: 'voice', status: 'idle',
        input_params: { script: seg.script, voice_id: result.voiceId, speed: 1.0 },
        credits_cost: 1, board_order: idx++,
        position_x: colX, position_y: 340,
        created_at: new Date().toISOString(),
      })
      newAssets.push({
        id: videoId,
        project_id: project.id, user_id: project.user_id,
        type: 'video', status: 'idle',
        input_params: { source_image_url: '', continuation_frame: '', motion_prompt: seg.script.slice(0, 100), duration: result.duration },
        credits_cost: 3, board_order: idx++,
        position_x: colX, position_y: 600,
        created_at: new Date().toISOString(),
      })
      newAssets.push({
        id: lipsyncId,
        project_id: project.id, user_id: project.user_id,
        type: 'lipsync', status: 'idle',
        input_params: { face_url: '', audio_url: '' },
        credits_cost: 3, board_order: idx++,
        position_x: colX, position_y: 860,
        created_at: new Date().toISOString(),
      })

      // Script → Voz
      tempEdges.push(mkEdge(scriptId, voiceId, 'output', 'script'))
      // Voz → Lip Sync (áudio)
      tempEdges.push(mkEdge(voiceId, lipsyncId, 'output', 'audio_url'))
      // Vídeo → Lip Sync (rosto)
      tempEdges.push(mkEdge(videoId, lipsyncId, 'output', 'face_url'))

      // Fonte de imagem do vídeo
      if (i === 0) {
        // Primeiro segmento: usa compose (ou modelo se não tiver produto)
        const sourceId = composeId ?? modelId
        tempEdges.push(mkEdge(sourceId, videoId, 'output', 'source_image_url'))
      } else {
        // Segmentos seguintes: continua no último frame do vídeo anterior
        tempEdges.push(mkEdge(prevVideoId!, videoId, 'output', 'continuation_frame'))
      }

      prevVideoId = videoId
    })

    setAssets(newAssets)
    setEdges(tempEdges)
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

  return (
    <div className="w-full h-screen bg-zinc-950 flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 z-10 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard/studio" className="text-zinc-500 hover:text-white transition-colors shrink-0">
            <ArrowLeft size={18} />
          </Link>
          {editing ? (
            <div className="flex items-center gap-2">
              <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveTitle()} autoFocus className="bg-zinc-800 border border-accent rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none min-w-[200px]" />
              <button onClick={saveTitle} className="text-accent hover:text-white"><Check size={16} /></button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="flex items-center gap-2 text-sm font-semibold text-white hover:text-accent transition-colors group truncate">
              {title}
              <Edit2 size={12} className="text-zinc-600 group-hover:text-accent shrink-0" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-zinc-500 bg-zinc-800 px-3 py-1.5 rounded-xl">{credits} cr</span>
          {assets.length === 0 && (
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-3 py-1.5 rounded-xl transition-all"
            >
              <Wand2 size={13} /> Campaign Builder
            </button>
          )}
          <AddCardMenu onAdd={addCard} />
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onEdgesDelete={onEdgesDelete}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={1.5}
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode="Delete"
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} color="#27272a" gap={20} size={1} />
          <MiniMap
            nodeColor="#3f3f46"
            maskColor="rgba(9,9,11,0.8)"
            style={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12 }}
          />
          <Controls
            style={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12 }}
          />

          {/* Empty state */}
          {assets.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-4">
                <p className="text-zinc-500 text-sm font-medium">Canvas vazio — como quer começar?</p>
                <div className="flex items-center gap-3 pointer-events-auto">
                  <button
                    onClick={() => setShowWizard(true)}
                    className="flex flex-col items-center gap-2 px-5 py-4 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 transition-all group cursor-pointer"
                  >
                    <Wand2 size={20} className="text-fuchsia-400" />
                    <div className="text-center">
                      <p className="text-xs font-semibold text-fuchsia-400">Campaign Builder</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Guiado · recomendado</p>
                    </div>
                  </button>
                  <span className="text-zinc-700 text-xs">ou</span>
                  <button
                    onClick={() => addCard('model')}
                    className="flex flex-col items-center gap-2 px-5 py-4 rounded-2xl border border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 transition-all cursor-pointer"
                  >
                    <LayoutGrid size={20} className="text-zinc-400" />
                    <div className="text-center">
                      <p className="text-xs font-semibold text-zinc-400">Modo livre</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">Monte card a card</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </ReactFlow>
      </div>

      {/* Dica de conexão */}
      <div className="shrink-0 px-6 py-2 border-t border-zinc-800 flex items-center gap-3">
        <div className="flex items-center gap-4 text-[10px] text-zinc-600">
          <span>🟠 Arraste do <span className="text-zinc-400">ponto laranja</span> para conectar saídas</span>
          <span>🔵 <span className="text-zinc-400">Ponto azul</span> = entrada de dados</span>
          <span><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">Del</kbd> para remover conexão selecionada</span>
        </div>
      </div>

      {/* Campaign Wizard modal */}
      {showWizard && (
        <CampaignWizard
          credits={credits}
          onConfirm={buildCampaign}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  )
}

export default function StudioCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <StudioCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

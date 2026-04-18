'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  ReactFlow, Background, BackgroundVariant, MiniMap, Controls,
  useNodesState, useEdgesState, addEdge, ConnectionMode,
  type Node, type Edge, type Connection, type NodeChange, type EdgeChange,
  MarkerType, ReactFlowProvider, useReactFlow
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowLeft, Edit2, Check, Plus, Wand2, LayoutGrid, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { StudioAsset, StudioConnection, StudioProject, AssetType } from '@/types'
import AssetNode, { AssetNodeData } from './nodes/AssetNode'
import LightEdge from './edges/LightEdge'
import AddCardMenu from './AddCardMenu'
import CanvasQuickAdd from './CanvasQuickAdd'
import CampaignWizard, { WizardResult } from './CampaignWizard'
import TemplateGallery, { WorkflowTemplate } from './TemplateGallery'

const nodeTypes = { assetNode: AssetNode }
const edgeTypes = { lightEdge: LightEdge }

const CREDIT_COST: Record<AssetType, number> = {
  image: 8, script: 3, voice: 8, caption: 2, upscale: 3, video: 15, model: 8, render: 1, animate: 20, compose: 12, lipsync: 20, face: 0, join: 0,
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
  face:    { face_image_url: '' },
  join:    { video_urls: [] },
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
  video_0:             'video_urls',
  video_1:             'video_urls',
  video_2:             'video_urls',
  video_3:             'video_urls',
  video_4:             'video_urls',
  video_5:             'video_urls',
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
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 16, height: 16 },
  }))
}

function StudioCanvasInner({ project, initialAssets, initialConnections, userCredits }: Props) {
  const [assets,      setAssets]      = useState<StudioAsset[]>(initialAssets)
  const [connections, setConnections] = useState<StudioConnection[]>(initialConnections)
  const [credits,     setCredits]     = useState(userCredits)
  const { screenToFlowPosition } = useReactFlow()
  const [title,       setTitle]       = useState(project.title)
  const [editing,     setEditing]     = useState(false)
  const [showWizard,  setShowWizard]  = useState(false)
  const [showGallery, setShowGallery] = useState(initialAssets.length === 0)
  const pollingRef        = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())
  const startPollingRef   = useRef<(id: string) => void>(() => {})
  
  // Lixeira para Ctrl+Z — conexões e soft-delete de assets
  const trashRef = useRef<{ connections: StudioConnection[] }>({ connections: [] })

  // Soft-delete: card some da tela mas só é deletado do DB após 8s
  // Se o usuário clicar "Desfazer" antes, o card volta sem nenhuma chamada de rede
  const pendingDeleteRef = useRef<{
    asset: StudioAsset
    timer: ReturnType<typeof setTimeout>
  } | null>(null)
  const [undoToast,    setUndoToast]    = useState<{ label: string } | null>(null)
  const [quickAddMenu, setQuickAddMenu] = useState<{ x: number; y: number } | null>(null)

  // ── Atalhos de Teclado (Ctrl+Z e Ctrl+S) ────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se estiver digitando em um input
      const isInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA'
      
      // Ctrl+S: Salvar / Renomear projeto
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        setEditing(true)
      }

      // Ctrl+Z: Desfazer exclusão de card (soft-delete) ou conexão
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !isInput) {
        e.preventDefault()
        // Prioridade: card deletado > conexão deletada
        if (pendingDeleteRef.current) {
          undoDeleteAsset()
        } else {
          const lastConn = trashRef.current.connections.pop()
          if (lastConn) {
            setConnections(prev => [...prev, lastConn])
            if (!(lastConn as any).isLocalConn) {
              fetch('/api/studio/connections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  project_id: lastConn.project_id,
                  source_id: lastConn.source_id,
                  target_id: lastConn.target_id,
                  source_handle: lastConn.source_handle,
                  target_handle: lastConn.target_handle
                }),
              })
            }
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ── Desfazer exclusão de card ────────────────────────────────────────────
  const undoDeleteAsset = useCallback(async () => {
    const pending = pendingDeleteRef.current
    if (!pending) return
    clearTimeout(pending.timer)
    pendingDeleteRef.current = null
    setUndoToast(null)

    let restored = pending.asset

    // Se o card estava processando, re-busca o status atual do DB:
    // o webhook pode ter completado durante os 8s de soft-delete.
    if (pending.asset.status === 'processing' && !pending.asset.isLocal) {
      try {
        const res = await fetch(`/api/studio/assets/${pending.asset.id}`)
        if (res.ok) {
          const { asset } = await res.json()
          if (asset) restored = asset
        }
      } catch { /* usa o estado salvo se falhar */ }
    }

    setAssets(prev => {
      const withoutDup = prev.filter(a => a.id !== restored.id)
      return [...withoutDup, restored].sort((a, b) => a.board_order - b.board_order)
    })

    // Se ainda estiver processando, retoma o polling para atualizar quando concluir
    if (restored.status === 'processing') {
      startPollingRef.current(restored.id)
    }
  }, [])

  // ── Callbacks passados para os nós ──────────────────────────────────────
  const handleDelete = useCallback((id: string) => {
    const asset = assets.find(a => a.id === id)
    if (!asset) return

    // 1. Se já há um delete pendente, executa-o imediatamente (libera slot)
    const prev = pendingDeleteRef.current
    if (prev) {
      clearTimeout(prev.timer)
      if (!prev.asset.isLocal) {
        fetch(`/api/studio/assets/${prev.asset.id}`, { method: 'DELETE' })
      }
    }

    // 2. Remove visualmente agora
    setAssets(p => p.filter(a => a.id !== id))

    // 3. Agenda o DELETE real após 8 segundos
    const timer = setTimeout(() => {
      pendingDeleteRef.current = null
      setUndoToast(null)
      if (!asset.isLocal) {
        fetch(`/api/studio/assets/${id}`, { method: 'DELETE' })
      }
    }, 8000)

    pendingDeleteRef.current = { asset, timer }
    setUndoToast({ label: asset.type })
  }, [assets])

  const handleUpdateParams = useCallback((id: string, params: Record<string, unknown>) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, input_params: { ...a.input_params, ...params } } : a))
  }, [])

  const startPolling = useCallback((assetId: string) => {
    if (pollingRef.current.has(assetId)) return

    // Marca como em polling com um sentinel value
    pollingRef.current.set(assetId, undefined as unknown as ReturnType<typeof setInterval>)

    const stopPolling = () => { pollingRef.current.delete(assetId) }

    // Fibonacci backoff: 3s → 5s → 8s → 13s → 21s → 30s (max)
    const fibonacci = [3000, 5000, 8000, 13000, 21000, 30000]

    const poll = async (attempt: number) => {
      if (!pollingRef.current.has(assetId)) return // foi parado externamente
      try {
        const res = await fetch(`/api/studio/assets/${assetId}`)
        if (!res.ok) { stopPolling(); return } // 404 = asset deletado
        const { asset } = await res.json()
        if (!asset) { stopPolling(); return }

        // Se completou pelo webhook/route
        if (asset.status === 'done' || asset.status === 'error') {
          stopPolling()
          setAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...asset } : a))
          return
        }

        // Se ainda está em processamento e é um tipo que aceita /sync (Google Veo não tem webhook)
        if (asset.status === 'processing' && typeof asset.input_params === 'object' && asset.input_params?.prediction_id) {
          try {
            const syncRes = await fetch(`/api/studio/assets/${assetId}/sync`, { method: 'POST' })
            if (syncRes.ok) {
              const syncData = await syncRes.json()
              if (syncData.status === 'done' || syncData.status === 'error') {
                // Recupera asset atualizado com as urls convertidas
                const updatedRes = await fetch(`/api/studio/assets/${assetId}`)
                const { asset: updatedAsset } = await updatedRes.json()
                if (updatedAsset) {
                  stopPolling()
                  setAssets(prev => prev.map(a => a.id === assetId ? { ...a, ...updatedAsset } : a))
                  return
                }
              }
            }
          } catch { /* ignora erro silencioso no sync */ }
        }

      } catch { /* rede — tenta de novo */ }

      // Agenda próxima tentativa com backoff
      const delay = fibonacci[Math.min(attempt, fibonacci.length - 1)]
      const timer = setTimeout(() => poll(attempt + 1), delay)
      pollingRef.current.set(assetId, timer as unknown as ReturnType<typeof setInterval>)
    }

    // Primeira tentativa após 3s
    const timer = setTimeout(() => poll(0), 3000)
    pollingRef.current.set(assetId, timer as unknown as ReturnType<typeof setInterval>)
  }, [])

  // Expõe startPolling via ref para que undoDeleteAsset possa usá-lo sem dep circular
  startPollingRef.current = startPolling

  const handleGenerate = useCallback(async (type: AssetType, params: Record<string, unknown>, existingId: string) => {
    // Salva posição antes de qualquer mudança de estado
    const currentAsset = assets.find(a => a.id === existingId)
    const isTemp = !!currentAsset?.isLocal

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

    try {
      const res = await fetch('/api/studio/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          type,
          input_params: mergedParams,
          existing_id: isTemp ? undefined : existingId,
          frontend_id: isTemp ? existingId : undefined, // Injete o ID pra persistir consistente
        }),
      })

      if (!res.ok) {
        // Se a API falhou gravemente (ex: timeout), tenta ler JSON se tiver
        const text = await res.text()
        let errData = { error: 'Falha na comunicação com o servidor' }
        try { errData = JSON.parse(text) } catch { errData.error = text.slice(0, 400) }
        
        throw new Error(errData.error || `Erro HTTP ${res.status}`)
      }

      const { asset, error } = await res.json()

      if (error || !asset) {
        throw new Error(error || 'Resposta inválida do servidor')
      }

      // Atualiza posição no DB
      fetch(`/api/studio/assets/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position_x: pos.x, position_y: pos.y }),
      })

      // Atualiza o card in-place sem mudar o ID!
      setAssets(prev => prev.map(a =>
        a.id === existingId
          ? { ...asset, position_x: pos.x, position_y: pos.y } // Sem `isLocal` = virou real
          : a
      ))

      setCredits(c => c - asset.credits_cost)
      if (asset.status === 'processing') startPolling(asset.id)
    } catch (err: any) {
      alert(`Servidor (500): ${err.message}`)
      setAssets(prev => prev.map(a =>
        a.id === existingId ? { ...a, status: 'error', error_msg: err.message ?? 'Erro na geração' } : a
      ))
    }
  }, [assets, project.id, startPolling])

  const handleDuplicate = useCallback((id: string) => {
    const original = assets.find(a => a.id === id)
    if (!original) return
    const copy: StudioAsset = {
      ...original,
      id: crypto.randomUUID(),
      status: 'idle',
      result_url: null,
      last_frame_url: null,
      error_msg: null,
      position_x: (original.position_x ?? 100) + 40,
      position_y: (original.position_y ?? 100) + 40,
      created_at: new Date().toISOString(),
      isLocal: true,
    }
    setAssets(prev => [...prev, copy])
  }, [assets])

  const nodeCallbacks = useMemo<Omit<AssetNodeData, 'asset'>>(() => ({
    onDelete: handleDelete,
    onGenerate: handleGenerate,
    onUpdateParams: handleUpdateParams,
    onDuplicate: handleDuplicate,
  }), [handleDelete, handleGenerate, handleUpdateParams, handleDuplicate])

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
          data: { ...n.data, asset: assetMap.get(n.id)!, ...nodeCallbacks },
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
  }, [assets, nodeCallbacks]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Merge: mantém edges temp visuais + sincroniza as do banco
    // Deduplication por source+target+handle evita fios duplos quando temp vira UUID real
    setEdges(prev => {
      const dbEdges = buildEdges(connections)
      const tempEdges = prev.filter(e => {
        if (!(e as any).isLocalConn) return false
        // Remove temp edge se já existe uma DB edge cobrindo a mesma conexão
        return !dbEdges.some(de =>
          de.source === e.source &&
          de.target === e.target &&
          de.targetHandle === e.targetHandle
        )
      })
      return [...dbEdges, ...tempEdges]
    })
  }, [connections]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-propaga URLs pelas arestas quando um asset completa
  // Usa ref para evitar loop infinito (assets → update → assets → ...)
  const lastPropagated = useRef<Map<string, string>>(new Map())
  useEffect(() => {
    const updates: { tgtId: string; params: Record<string, unknown> }[] = []

    edges.forEach(edge => {
      if (!edge.targetHandle) return
      const src = assets.find(a => a.id === edge.source)
      const tgt = assets.find(a => a.id === edge.target)
      if (!src?.result_url || !tgt) return

      const fillValue = edge.targetHandle === 'continuation_frame'
        ? (src.last_frame_url ?? src.result_url)
        : src.result_url

      const cacheKey = `${edge.id}:${edge.targetHandle}`
      
      let finalParams: Record<string, unknown> | null = null
      let isDifferent = false

      if (edge.targetHandle.startsWith('video_')) {
        const idx = parseInt(edge.targetHandle.split('_')[1])
        const currentArray = [...(tgt.input_params.video_urls as string[] ?? [])]
        if (currentArray[idx] !== fillValue) {
          isDifferent = true
          currentArray[idx] = fillValue
          finalParams = { video_urls: currentArray }
        }
      } else {
        const field = HANDLE_TO_FIELD[edge.targetHandle] ?? edge.targetHandle
        const currentInTarget = tgt.input_params[field] as string | undefined
        if (currentInTarget !== fillValue) {
          isDifferent = true
          finalParams = { [field]: fillValue }
        }
      }

      if (isDifferent && finalParams && lastPropagated.current.get(cacheKey) !== fillValue) {
        updates.push({ tgtId: tgt.id, params: finalParams })
        lastPropagated.current.set(cacheKey, fillValue)
      }
    })

    if (updates.length > 0) {
      updates.forEach(u => handleUpdateParams(u.tgtId, u.params))
    }
  }, [assets, edges]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    assets.filter(a => a.status === 'processing').forEach(a => startPolling(a.id))
    return () => {
      pollingRef.current.forEach(i => clearInterval(i))
      pollingRef.current.clear()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag end — salva posição ─────────────────────────────────────────────
  const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    // Atualiza coordenada local
    setAssets(prev => prev.map(a => a.id === node.id ? { ...a, position_x: Math.round(node.position.x), position_y: Math.round(node.position.y) } : a))

    // Se estiver no BD, manda pra nuvem
    const isTemp = !!assets.find(a => a.id === node.id)?.isLocal
    if (isTemp) return

    fetch(`/api/studio/assets/${node.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position_x: node.position.x, position_y: node.position.y }),
    })
  }, [assets])

  // ── Conectar dois nós ────────────────────────────────────────────────────
  const onConnect = useCallback(async (connection: Connection) => {
    const { source, target, sourceHandle } = connection
    if (!source || !target) return

    // Infere o handle alvo com base nos tipos — cobre todas as combinações relevantes
    // A inferência SEMPRE tem prioridade sobre o handle clicado manualmente,
    // para que o cliente não precise saber qual porta usar.
    function inferTarget(): string | null {
      const src = assets.find(a => a.id === source)
      const tgt = assets.find(a => a.id === target)
      if (!src || !tgt) return null

      const s = src.type
      const t = tgt.type

      // Categorias de saída por tipo
      const isImage = (x: AssetType) => ['model', 'image', 'compose', 'upscale'].includes(x)
      const isVideo = (x: AssetType) => ['video', 'animate', 'lipsync'].includes(x)
      const isAudio = (x: AssetType) => x === 'voice'
      const isText  = (x: AssetType) => x === 'script'

      switch (t) {
        case 'image':
          if (s === 'model')     return 'model_prompt'
          if (s === 'face')      return 'source_face_url'
          break

        case 'video':
          if (s === 'model')     return 'model_prompt'    // descreve o personagem no prompt
          if (isImage(s))        return 'source_image_url'
          if (isVideo(s))        return 'continuation_frame'
          if (isAudio(s))        return 'audio_url'
          break

        case 'voice':
          if (isText(s))         return 'script'
          break

        case 'caption':
          if (isAudio(s))        return 'audio_url'
          break

        case 'upscale':
          if (isImage(s))        return 'source_url'
          break

        case 'render':
          if (isVideo(s))        return 'source_image_url'
          if (isAudio(s))        return 'audio_url'
          break

        case 'animate':
          if (isImage(s))        return 'portrait_image_url'
          break

        case 'compose':
          if (isImage(s))        return 'portrait_url'
          break

        case 'lipsync':
          if (isVideo(s) || isImage(s)) return 'face_url'
          if (isAudio(s))               return 'audio_url'
          break

        case 'join':
          if (isVideo(s) || isImage(s)) {
            const currentArray = tgt?.input_params.video_urls as string[] ?? []
            return `video_${Math.min(currentArray.length, 5)}`
          }
          break
      }
      return null
    }

    // Inferência tem prioridade: identifica automaticamente o campo correto pelo tipo do card.
    // Só usa o handle clicado explicitamente se não houver inferência disponível.
    const targetHandle = inferTarget() ?? connection.targetHandle
    if (!targetHandle) return

    const srcAsset = assets.find(a => a.id === source)
    const tgtAsset = assets.find(a => a.id === target)
    const isSourceTemp = !!srcAsset?.isLocal
    const isTargetTemp = !!tgtAsset?.isLocal

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
      const tempConnId = crypto.randomUUID()
      setEdges(prev => addEdge({
        id: tempConnId,
        source,
        target,
        sourceHandle: sourceHandle ?? 'output',
        targetHandle,
        type: 'lightEdge',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 16, height: 16 },
        isLocalConn: true,
      } as any, prev))
    }

    // Auto-preenche o campo no nó destino com a URL do nó fonte (sempre)
    const sourceAsset = assets.find(a => a.id === source)
    if (sourceAsset?.result_url) {
      const fillValue = targetHandle === 'continuation_frame'
        ? (sourceAsset.last_frame_url ?? sourceAsset.result_url)
        : sourceAsset.result_url
      const targetAsset = assets.find(a => a.id === target)
      let finalParams: Record<string, unknown> = {}

      if (targetHandle.startsWith('video_') && targetAsset) {
        // Trata a injeção em arrays (ex: video_0 -> video_urls[0])
        const idx = parseInt(targetHandle.split('_')[1])
        const currentArray = [...(targetAsset.input_params.video_urls as string[] ?? [])]
        currentArray[idx] = fillValue
        finalParams = { video_urls: currentArray }
      } else {
        const field = HANDLE_TO_FIELD[targetHandle] ?? targetHandle
        finalParams = { [field]: fillValue }
      }

      handleUpdateParams(target, finalParams)
      if (!isTargetTemp) {
        await fetch(`/api/studio/assets/${target}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input_params: finalParams }),
        })
      }
    }
  }, [assets, project.id, handleUpdateParams, setEdges])

  // ── Deletar aresta ───────────────────────────────────────────────────────
  const onEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    deletedEdges.forEach(async e => {
      const connToDelete = connections.find(c => c.id === e.id)
      if (connToDelete) trashRef.current.connections.push(connToDelete) // Salva para Ctrl+Z
      
      setConnections(prev => prev.filter(c => c.id !== e.id))
      // Tenta excluir do DB toda Edge não-local (já salva). Edge do DB == Edge sem isLocalConn.
      if (!(e as any).isLocalConn) {
        await fetch(`/api/studio/connections/${e.id}`, { method: 'DELETE' })
      }

      // Limpa o parâmetro injetado no nó alvo quando a linha é removida
      if (e.target && e.targetHandle) {
        const targetAsset = assets.find(a => a.id === e.target)
        if (targetAsset) {
          let finalParams: Record<string, unknown> = {}
          if (e.targetHandle.startsWith('video_')) {
            const idx = parseInt(e.targetHandle.split('_')[1])
            const currentArray = [...(targetAsset.input_params.video_urls as string[] ?? [])]
            currentArray[idx] = ''
            finalParams = { video_urls: currentArray }
          } else {
            const field = HANDLE_TO_FIELD[e.targetHandle] ?? e.targetHandle
            finalParams = { [field]: '' }
          }
          handleUpdateParams(e.target, finalParams)
          if (!assets.find(a => a.id === e.target)?.isLocal) {
            await fetch(`/api/studio/assets/${e.target}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ input_params: finalParams }),
            })
          }
        }
      }
    })
  }, [connections, assets, handleUpdateParams])

  // ── Adicionar card ───────────────────────────────────────────────────────
  async function addCard(type: AssetType) {
    if (credits < CREDIT_COST[type]) {
      alert(`Você precisa de ${CREDIT_COST[type]} crédito(s).`)
      return
    }
    const i = assets.length
    const frontend_id = crypto.randomUUID()

    // Posicionamento inteligente: se vier do botão direito, usa a posição do mouse
    let pX = 60 + (i % 3) * 380
    let pY = 450 + Math.floor(i / 3) * 440

    if (quickAddMenu) {
      const flowPos = screenToFlowPosition({ x: quickAddMenu.x, y: quickAddMenu.y })
      pX = flowPos.x
      pY = flowPos.y
    }
    
    // 1. Cria localmente para feedback instantâneo (otimista)
    const newAsset: StudioAsset = {
      id: frontend_id,
      project_id: project.id,
      user_id: project.user_id,
      type,
      status: 'idle',
      input_params: DEFAULT_PARAMS[type],
      credits_cost: 0, // só cobra quando gerar
      board_order: i,
      position_x: pX,
      position_y: pY,
      created_at: new Date().toISOString(),
      isLocal: true, 
      isNew: true, // Efeito de fogo ativado
    }
    setAssets(prev => [...prev, newAsset])

    // Resfriamento automático: o brilho some após 12 segundos
    setTimeout(() => {
      setAssets(prev => prev.map(a => a.id === frontend_id ? { ...a, isNew: false } : a))
    }, 12000)

    // 2. Persiste no banco de dados como rascunho
    try {
      const res = await fetch('/api/studio/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          type,
          status: 'idle',
          frontend_id,
          input_params: DEFAULT_PARAMS[type],
          position_x: pX,
          position_y: pY,
        })
      })
      if (res.ok) {
        const { asset } = await res.json()
        if (asset) {
          // Remove a flag isLocal quando o server confirma, mas mantém isNew para o UI
          setAssets(prev => prev.map(a => a.id === frontend_id ? { ...asset, isLocal: false, isNew: true } : a))
        }
      }
    } catch { /* fallback */ }
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
        id: crypto.randomUUID(),
        source, target, sourceHandle: sh, targetHandle: th,
        type: 'lightEdge',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 16, height: 16 },
        isLocalConn: true,
      } as any
    }

    // 1. Card Modelo UGC — coluna esquerda
    const modelId = crypto.randomUUID()
    newAssets.push({
      id: modelId,
      project_id: project.id, user_id: project.user_id,
      type: 'model', status: 'idle',
      input_params: { ...result.modelConfig },
      credits_cost: 8, board_order: idx++,
      position_x: 60, position_y: 440,
      created_at: new Date().toISOString(),
      isLocal: true,
    })

    // 2. Card Compose — se tiver produto
    let composeId: string | null = null
    if (result.productUrl) {
      composeId = crypto.randomUUID()
      newAssets.push({
        id: composeId,
        project_id: project.id, user_id: project.user_id,
        type: 'compose', status: 'idle',
        input_params: { portrait_url: '', product_url: result.productUrl, position: 'southeast', product_scale: 0.35 },
        credits_cost: 12, board_order: idx++,
        position_x: 440, position_y: 440,
        created_at: new Date().toISOString(),
        isLocal: true,
      })
      tempEdges.push(mkEdge(modelId, composeId, 'output', 'portrait_url'))
    }

    // 3. Cards por segmento: Script → Voz → Vídeo (contínuo) → Lip Sync
    const baseX = result.productUrl ? 820 : 440
    let prevVideoId: string | null = null

    result.segments.forEach((seg, i) => {
      const colX      = baseX + i * 380
      const scriptId  = crypto.randomUUID()
      const voiceId   = crypto.randomUUID()
      const videoId   = crypto.randomUUID()
      const lipsyncId = crypto.randomUUID()

      newAssets.push({
        id: scriptId,
        project_id: project.id, user_id: project.user_id,
        type: 'script', status: 'idle',
        input_params: { product: '', audience: '', format: 'reels', script_text: seg.script },
        credits_cost: 3, board_order: idx++,
        position_x: colX, position_y: 60,
        created_at: new Date().toISOString(),
        isLocal: true,
      })
      newAssets.push({
        id: voiceId,
        project_id: project.id, user_id: project.user_id,
        type: 'voice', status: 'idle',
        input_params: { script: seg.script, voice_id: result.voiceId, speed: 1.0 },
        credits_cost: 8, board_order: idx++,
        position_x: colX, position_y: 340,
        created_at: new Date().toISOString(),
        isLocal: true,
      })
      newAssets.push({
        id: videoId,
        project_id: project.id, user_id: project.user_id,
        type: 'video', status: 'idle',
        input_params: { source_image_url: '', continuation_frame: '', motion_prompt: seg.script.slice(0, 100), duration: result.duration },
        credits_cost: 15, board_order: idx++,
        position_x: colX, position_y: 600,
        created_at: new Date().toISOString(),
        isLocal: true,
      })
      newAssets.push({
        id: lipsyncId,
        project_id: project.id, user_id: project.user_id,
        type: 'lipsync', status: 'idle',
        input_params: { face_url: '', audio_url: '' },
        credits_cost: 20, board_order: idx++,
        position_x: colX, position_y: 860,
        created_at: new Date().toISOString(),
        isLocal: true,
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

    // Adiciona ao estado e persiste (bulk persist via loop)
    setAssets(prev => [...prev, ...newAssets])
    
    newAssets.forEach(asset => {
      fetch('/api/studio/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          type: asset.type,
          status: 'idle',
          frontend_id: asset.id,
          input_params: asset.input_params
        })
      })
    })

    setEdges(prev => [...prev, ...tempEdges])
  }

  // ── Template Gallery → injeta workflow pré-fabricado ─────────────────────
  function buildFromTemplate(tpl: WorkflowTemplate) {
    setShowGallery(false)
    const now = Date.now()
    const idMap: string[] = []

    // Cria um ID temporário estável para cada nó do template
    tpl.nodes.forEach((_, i) => idMap.push(crypto.randomUUID()))

    const newAssets: StudioAsset[] = tpl.nodes.map((n, i) => ({
      id: idMap[i],
      project_id: project.id,
      user_id: project.user_id,
      type: n.type as AssetType,
      status: 'idle',
      input_params: { ...n.params },
      credits_cost: CREDIT_COST[n.type as AssetType] ?? 0,
      board_order: i,
      position_x: n.x,
      position_y: n.y,
      created_at: new Date().toISOString(),
      isLocal: true,
    }))

    const newEdges: Edge[] = tpl.edges.map((e, i) => ({
      id: crypto.randomUUID(),
      source: idMap[e.source],
      target: idMap[e.target],
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: 'lightEdge',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8', width: 16, height: 16 },
      isLocalConn: true,
    }))

    setAssets(prev => [...prev, ...newAssets])
    
    newAssets.forEach(asset => {
      fetch('/api/studio/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          type: asset.type,
          status: 'idle',
          frontend_id: asset.id,
          input_params: asset.input_params
        })
      })
    })

    setEdges(prev => [...prev, ...newEdges])
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
    <div className="w-full h-screen bg-[#f4f4f5] flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 z-10 bg-white/90 backdrop-blur-md border-b border-zinc-200 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard/studio" className="text-zinc-400 hover:text-zinc-800 transition-colors shrink-0">
            <ArrowLeft size={18} />
          </Link>
          {editing ? (
            <div className="flex items-center gap-2">
              <input 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && saveTitle()} 
                onBlur={saveTitle}
                autoFocus 
                className="bg-white border border-accent rounded-lg px-3 py-1.5 text-sm text-zinc-900 focus:outline-none min-w-[200px] shadow-sm" 
                placeholder="Nome do workflow..."
              />
              <button onMouseDown={e => { e.preventDefault(); saveTitle(); }} className="text-accent hover:text-accent/80"><Check size={16} /></button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} title="Clique ou Ctrl+S para renomear" className="flex items-center gap-2 text-sm font-semibold text-zinc-800 hover:text-accent transition-colors group truncate">
              {title || 'Projeto sem nome'}
              <Edit2 size={12} className="text-zinc-400 group-hover:text-accent shrink-0" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium text-zinc-500 bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-xl">{credits} cr</span>
          <button
            onClick={() => setShowGallery(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 bg-white border border-zinc-200 hover:border-accent/50 hover:shadow-sm px-3 py-1.5 rounded-xl transition-all"
          >
            <Plus size={13} /> Templates
          </button>
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
          onPaneClick={() => setQuickAddMenu(null)}
          onPaneContextMenu={e => {
            e.preventDefault();
            setQuickAddMenu({ x: e.clientX, y: e.clientY });
          }}
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
          <Background variant={BackgroundVariant.Dots} color="#d4d4d8" gap={24} size={1.5} />
          <MiniMap
            nodeColor="#e4e4e7"
            maskColor="rgba(244, 244, 245, 0.7)"
            style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
          />
          <Controls
            style={{ background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: 8, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', fill: '#71717a' }}
          />

          {/* Empty state */}
          {assets.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center bg-white/60 px-6 py-3 rounded-2xl border border-zinc-200 shadow-sm backdrop-blur-sm">
                <p className="text-zinc-500 text-sm font-medium">Canvas vazio — clique em <span className="text-accent underline decoration-accent/30 underline-offset-2">Templates</span> para começar</p>
              </div>
            </div>
          )}
        </ReactFlow>
      </div>

      {/* Dica de conexão */}
      <div className="shrink-0 px-6 py-2 border-t border-zinc-200 bg-white/70 backdrop-blur-sm flex items-center gap-3">
        <div className="flex items-center gap-4 text-[10px] font-medium text-zinc-500">
          <span>🟠 Arraste do <span className="text-orange-500">ponto laranja</span> para conectar saídas</span>
          <span>🔵 <span className="text-blue-500">Ponto azul</span> = entrada de dados</span>
          <span><kbd className="bg-white border border-zinc-200 shadow-sm px-1.5 py-0.5 rounded text-zinc-500">Del</kbd> para remover conexão</span>
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

      {/* Template Gallery overlay */}
      {showGallery && (
        <TemplateGallery
          onSelect={buildFromTemplate}
          onFree={() => setShowGallery(false)}
          onWizard={() => { setShowGallery(false); setShowWizard(true) }}
        />
      )}

      {/* Quick add — abre ao clicar no canvas vazio */}
      {quickAddMenu && (
        <CanvasQuickAdd
          x={quickAddMenu.x}
          y={quickAddMenu.y}
          onAdd={addCard}
          onClose={() => setQuickAddMenu(null)}
        />
      )}

      {/* Undo toast — aparece 8s após deletar um card */}
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-800 border border-zinc-600 text-white text-sm px-4 py-3 rounded-2xl shadow-2xl shadow-black/60 animate-in slide-in-from-bottom-4 duration-300">
          <span className="text-zinc-300">Card excluído</span>
          <button
            onClick={undoDeleteAsset}
            className="flex items-center gap-1.5 text-accent hover:text-white font-semibold transition-colors"
          >
            <RotateCcw size={13} />
            Desfazer
          </button>
          <span className="text-zinc-600 text-[10px]">Ctrl+Z</span>
        </div>
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

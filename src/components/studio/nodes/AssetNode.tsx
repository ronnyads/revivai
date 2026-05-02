'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import { Handle, NodeProps, Position } from '@xyflow/react'
import {
  ArrowRight,
  Camera,
  Check,
  Copy,
  CopyPlus,
  Download,
  Pencil,
  FileText,
  Film,
  GripHorizontal,
  Image,
  Layers,
  Loader2,
  Lock,
  Mic,
  Music,
  RotateCcw,
  Scissors,
  Sparkles,
  Trash2,
  User,
  Video,
  Wand2,
  ZoomIn,
} from 'lucide-react'
import { AssetType, StudioAsset } from '@/types'
import ComposeCard from '../ComposeCard'
import FaceGenerator from '../FaceGenerator'
import ImageGenerator from '../ImageGenerator'
import ScriptGenerator from '../ScriptGenerator'
import VoiceGenerator from '../VoiceGenerator'
import VideoGenerator from '../VideoGenerator'
import TalkingVideoGenerator from '../TalkingVideoGenerator'
import CaptionGenerator from '../CaptionGenerator'
import UpscaleCard from '../UpscaleCard'
import ModelGenerator from '../ModelGenerator'
import RenderCard from '../RenderCard'
import AnimateGenerator from '../AnimateGenerator'
import JoinGenerator from '../JoinGenerator'
import LipsyncGenerator from '../LipsyncGenerator'
import AngleGenerator from '../AngleGenerator'
import MusicGenerator from '../MusicGenerator'
import SceneGenerator from '../SceneGenerator'
import UGCBundleGenerator from '../UGCBundleGenerator'
import LookSplitGenerator from '../LookSplitGenerator'
import { getStudioNodeCardWidth } from '../node-layout'
import { buildTalkingVideoIdeaFromParts } from '@/lib/talkingVideoIdea'
import { resolveStudioPublicError } from '@/lib/studioPublicErrors'

const TYPE_META: Record<
  AssetType,
  { icon: React.ReactNode; label: string; color: string; chip: string; hint: string; output: string }
> = {
  face: {
    icon: <User size={14} />,
    label: 'Rosto Real',
    color: 'text-indigo-200',
    chip: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-200',
    hint: 'Upload de face para reaproveitar no fluxo.',
    output: 'Face pronta',
  },
  join: {
    icon: <Film size={14} />,
    label: 'Video Master',
    color: 'text-rose-100',
    chip: 'border-rose-500/20 bg-rose-500/10 text-rose-100',
    hint: 'Costura clipes em um unico MP4.',
    output: 'Video final',
  },
  model: {
    icon: <User size={14} />,
    label: 'Modelo UGC',
    color: 'text-sky-100',
    chip: 'border-sky-500/20 bg-sky-500/10 text-sky-100',
    hint: 'Gera uma modelo base para o comercial.',
    output: 'Modelo pronta',
  },
  image: {
    icon: <Image size={14} />,
    label: 'Imagem IA',
    color: 'text-violet-100',
    chip: 'border-violet-500/20 bg-violet-500/10 text-violet-100',
    hint: 'Cria stills e fotos de apoio.',
    output: 'Imagem pronta',
  },
  video: {
    icon: <Video size={14} />,
    label: 'Video',
    color: 'text-blue-100',
    chip: 'border-blue-500/20 bg-blue-500/10 text-blue-100',
    hint: 'Transforma frame em take com movimento.',
    output: 'Take pronto',
  },
  talking_video: {
    icon: <Mic size={14} />,
    label: 'Video com Fala',
    color: 'text-cyan-100',
    chip: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100',
    hint: 'Gera uma performance falada preservando a identidade da modelo.',
    output: 'Avatar pronto',
  },
  voice: {
    icon: <Mic size={14} />,
    label: 'Voz',
    color: 'text-emerald-100',
    chip: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
    hint: 'Sintetiza a locucao do roteiro.',
    output: 'Audio pronto',
  },
  upscale: {
    icon: <ZoomIn size={14} />,
    label: 'Upscale',
    color: 'text-amber-100',
    chip: 'border-amber-500/20 bg-amber-500/10 text-amber-100',
    hint: 'Melhora resolucao e nitidez.',
    output: 'Imagem 4K',
  },
  script: {
    icon: <FileText size={14} />,
    label: 'Script',
    color: 'text-pink-100',
    chip: 'border-pink-500/20 bg-pink-500/10 text-pink-100',
    hint: 'Escreve a fala e estrutura do ad.',
    output: 'Script pronto',
  },
  caption: {
    icon: <FileText size={14} />,
    label: 'Legenda',
    color: 'text-cyan-100',
    chip: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100',
    hint: 'Extrai e formata legendas do audio.',
    output: 'Legenda pronta',
  },
  render: {
    icon: <Film size={14} />,
    label: 'Video Final',
    color: 'text-rose-100',
    chip: 'border-rose-500/20 bg-rose-500/10 text-rose-100',
    hint: 'Combina video e audio em um render final.',
    output: 'Render pronto',
  },
  animate: {
    icon: <Sparkles size={14} />,
    label: 'Imitar Movimento',
    color: 'text-fuchsia-100',
    chip: 'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-100',
    hint: 'Replica gesto e energia a partir do video driver.',
    output: 'Animacao pronta',
  },
  compose: {
    icon: <Layers size={14} />,
    label: 'Provador',
    color: 'text-orange-100',
    chip: 'border-orange-500/20 bg-orange-500/10 text-orange-100',
    hint: 'Vista a modelo com a peca exata do cliente.',
    output: 'Composicao pronta',
  },
  lipsync: {
    icon: <Wand2 size={14} />,
    label: 'Lip Sync',
    color: 'text-cyan-100',
    chip: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100',
    hint: 'Sincroniza boca, audio e movimento.',
    output: 'Lip sync pronto',
  },
  angles: {
    icon: <Camera size={14} />,
    label: 'Dir. de Cena',
    color: 'text-emerald-100',
    chip: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100',
    hint: 'Varia camera, pose e enquadramento.',
    output: 'Novo angulo',
  },
  music: {
    icon: <Music size={14} />,
    label: 'Trilha AI',
    color: 'text-blue-100',
    chip: 'border-blue-500/20 bg-blue-500/10 text-blue-100',
    hint: 'Compoe trilha de apoio para o anuncio.',
    output: 'Musica pronta',
  },
  ugc_bundle: {
    icon: <Sparkles size={14} />,
    label: 'Pacote 8 UGC',
    color: 'text-indigo-100',
    chip: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-100',
    hint: 'Gera um conjunto de poses UGC em paralelo.',
    output: 'Pacote pronto',
  },
  scene: {
    icon: <Camera size={14} />,
    label: 'Cena Livre',
    color: 'text-violet-100',
    chip: 'border-violet-500/20 bg-violet-500/10 text-violet-100',
    hint: 'Move a modelo para uma cena guiada por prompt.',
    output: 'Cena pronta',
  },
  look_split: {
    icon: <Scissors size={14} />,
    label: 'Separar Look',
    color: 'text-cyan-100',
    chip: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100',
    hint: 'Ferramenta manual para quebrar 1 look em ate 3 referencias fieis.',
    output: 'Refs prontas',
  },
}

const INPUT_HANDLES: Partial<Record<AssetType, Array<{ id: string; label: string }>>> = {
  image: [
    { id: 'model_prompt', label: 'Modelo' },
    { id: 'source_face_url', label: 'Rosto' },
  ],
  video: [
    { id: 'source_image_url', label: 'Imagem' },
    { id: 'continuation_frame', label: 'Continuacao' },
    { id: 'model_prompt', label: 'Modelo' },
    { id: 'audio_url', label: 'Audio' },
  ],
  talking_video: [{ id: 'source_image_url', label: 'Imagem' }],
  upscale: [{ id: 'source_url', label: 'Imagem' }],
  voice: [{ id: 'script', label: 'Script' }],
  caption: [{ id: 'audio_url', label: 'Audio' }],
  render: [
    { id: 'source_image_url', label: 'Video' },
    { id: 'audio_url', label: 'Voz' },
  ],
  animate: [
    { id: 'portrait_image_url', label: 'Retrato' },
    { id: 'driving_video_url', label: 'Movimento' },
  ],
  compose: [
    { id: 'portrait_url', label: 'Modelo' },
    { id: 'product_bundle', label: 'Look/Refs' },
  ],
  lipsync: [
    { id: 'face_url', label: 'Video/Rosto' },
    { id: 'audio_url', label: 'Audio' },
  ],
  join: [
    { id: 'video_0', label: 'Cena 1' },
    { id: 'video_1', label: 'Cena 2' },
    { id: 'video_2', label: 'Cena 3' },
    { id: 'video_3', label: 'Cena 4' },
    { id: 'video_4', label: 'Cena 5' },
    { id: 'video_5', label: 'Cena 6' },
  ],
  angles: [{ id: 'source_url', label: 'Imagem/Modelo' }],
  music: [{ id: 'source_image_url', label: 'Imagem/Mood' }],
  ugc_bundle: [{ id: 'source_url', label: 'Imagem/Modelo' }],
  scene: [{ id: 'source_url', label: 'Modelo/Fusao' }],
  look_split: [{ id: 'source_url', label: 'Look/Colecao' }],
}

const PAID_PLANS = ['subscription', 'package', 'starter', 'popular', 'pro', 'agency']
const VIDEO_LOCKED_TYPES: AssetType[] = ['video', 'talking_video', 'animate', 'lipsync']
const SYNC_TYPES: AssetType[] = ['video', 'talking_video', 'animate', 'lipsync']

const STATUS_META = {
  idle: {
    label: 'Rascunho',
    className: 'border-white/10 bg-white/[0.045] text-white/72',
  },
  processing: {
    label: 'Gerando',
    className: 'border-[#54D6F6]/18 bg-[#0D171B] text-[#8EDDED]',
  },
  done: {
    label: 'Pronto',
    className: 'border-emerald-500/18 bg-emerald-500/10 text-emerald-200',
  },
  error: {
    label: 'Erro',
    className: 'border-red-500/18 bg-red-500/10 text-red-200',
  },
} as const

const LATERAL_EDITOR_TYPES = new Set<AssetType>(['compose', 'scene', 'image', 'video', 'talking_video', 'look_split'])

const FIELD_SUMMARIES: Partial<Record<AssetType, Array<{ field: string; label: string }>>> = {
  script: [
    { field: 'product', label: 'Produto' },
    { field: 'audience', label: 'Publico' },
  ],
  image: [{ field: 'prompt', label: 'Prompt' }],
  video: [{ field: 'motion_prompt', label: 'Movimento' }],
  talking_video: [{ field: 'idea_prompt', label: 'Ideia' }],
  voice: [{ field: 'voice_id', label: 'Voz selecionada' }],
  compose: [
    { field: 'product_url', label: 'Produto' },
    { field: 'smart_prompt', label: 'Direcao fina' },
  ],
  scene: [{ field: 'scene_prompt', label: 'Cena' }],
  music: [{ field: 'prompt', label: 'Mood' }],
  look_split: [{ field: 'smart_prompt', label: 'Observacao' }],
}

const NEXT_STEPS: Partial<Record<AssetType, { text: string; chip: string }>> = {
  model: { text: 'Use em Provador ou Cena Livre', chip: 'border-sky-500/18 bg-sky-500/10 text-sky-100' },
  compose: { text: 'Proximo passo: roteiro, voz ou video', chip: 'border-orange-500/18 bg-orange-500/10 text-orange-100' },
  video: { text: 'Conecte voz ou renderize o ad final', chip: 'border-blue-500/18 bg-blue-500/10 text-blue-100' },
  talking_video: { text: 'Entrega um video final falado sem precisar montar Voice + Lipsync manualmente', chip: 'border-cyan-500/18 bg-cyan-500/10 text-cyan-100' },
  script: { text: 'Envie este texto para Voz', chip: 'border-pink-500/18 bg-pink-500/10 text-pink-100' },
  voice: { text: 'Combine com video no render final', chip: 'border-emerald-500/18 bg-emerald-500/10 text-emerald-100' },
  look_split: { text: 'Opcional: conecte manualmente ao Provador', chip: 'border-cyan-500/18 bg-cyan-500/10 text-cyan-100' },
}

const ESTIMATED: Partial<Record<AssetType, number>> = {
  video: 300,
  talking_video: 360,
  animate: 120,
  model: 35,
  image: 20,
  voice: 10,
  script: 8,
  upscale: 25,
  caption: 15,
  compose: 150,
  render: 30,
  lipsync: 120,
  music: 45,
  ugc_bundle: 110,
  scene: 25,
  look_split: 22,
}

const PROCESSING_LABELS: Partial<Record<AssetType, string>> = {
  video: 'Gerando movimento e camera comercial...',
  talking_video: 'Montando a performance falada da modelo...',
  animate: 'Replicando movimento de referencia...',
  model: 'Criando modelo UGC premium...',
  image: 'Renderizando cena em alta definicao...',
  voice: 'Sintetizando locucao natural...',
  script: 'Escrevendo roteiro de alta conversao...',
  upscale: 'Refinando nitidez e resolucao...',
  caption: 'Extraindo e formatando legendas...',
  compose: 'Montando composicao final com o produto...',
  render: 'Renderizando corte final...',
  lipsync: 'Sincronizando labios e fala...',
  music: 'Compondo trilha original...',
  ugc_bundle: 'Gerando o pacote de poses em paralelo...',
  scene: 'Posicionando modelo na nova cena...',
  look_split: 'Separando o look em referencias fieis...',
}

export interface AssetNodeData {
  asset: StudioAsset
  userPlan: string
  selectionActive?: boolean
  onDelete: (id: string) => void
  onGenerate: (type: AssetType, params: Record<string, unknown>, existingId: string) => void
  onUpdateParams: (id: string, params: Record<string, unknown>) => void
  onDuplicate: (id: string, overrides?: Record<string, unknown>) => void
  [key: string]: unknown
}

function hasMeaningfulValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((item) => hasMeaningfulValue(item))
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return true
  if (typeof value === 'boolean') return value
  return value !== null && value !== undefined
}

function getHandleValue(inputParams: Record<string, unknown>, handleId: string) {
  if (handleId.startsWith('video_')) {
    const index = Number(handleId.split('_')[1])
    const values = Array.isArray(inputParams.video_urls) ? inputParams.video_urls : []
    return values[index]
  }

  if (handleId === 'product_bundle') {
    const productUrls = Array.isArray(inputParams.product_urls)
      ? inputParams.product_urls.filter((value) => typeof value === 'string' && value.trim().length > 0)
      : []
    return productUrls.length > 0 ? productUrls : inputParams.product_url
  }

  return inputParams[handleId]
}

function getConnectedInputLabels(asset: StudioAsset, handles: Array<{ id: string; label: string }>) {
  return handles.filter((handle) => hasMeaningfulValue(getHandleValue(asset.input_params, handle.id))).map((handle) => handle.label)
}

function getSummaryTokens(asset: StudioAsset, handles: Array<{ id: string; label: string }>) {
  const tokens = new Set<string>()

  getConnectedInputLabels(asset, handles).forEach((label) => tokens.add(label))

  for (const summary of FIELD_SUMMARIES[asset.type] ?? []) {
    if (hasMeaningfulValue(asset.input_params[summary.field])) {
      tokens.add(summary.label)
    }
  }

  if (asset.status === 'done' && asset.result_url) tokens.add('Preview pronto')
  if (asset.status === 'processing') tokens.add('Em progresso')
  if (asset.status === 'error' && asset.error_msg) tokens.add('Falha detectada')

  return Array.from(tokens).slice(0, 4)
}

function getTalkingVideoContinuationDraft(inputParams: Record<string, unknown>) {
  const remainingText = typeof inputParams.speech_text_remaining === 'string'
    ? inputParams.speech_text_remaining.trim()
    : typeof inputParams.speech_text_remaining_normalized === 'string'
      ? inputParams.speech_text_remaining_normalized.trim()
      : ''

  if (!remainingText) return null

  const continuationIdea = typeof inputParams.continuation_idea_prompt === 'string' && inputParams.continuation_idea_prompt.trim().length > 0
    ? inputParams.continuation_idea_prompt.trim()
    : buildTalkingVideoIdeaFromParts({
        speechText: remainingText,
        expressionDirection: typeof inputParams.expression_direction === 'string' ? inputParams.expression_direction : '',
        visualPrompt: typeof inputParams.visual_prompt_raw === 'string'
          ? inputParams.visual_prompt_raw
          : typeof inputParams.visual_prompt === 'string'
            ? inputParams.visual_prompt
            : '',
      })

  return {
    ...inputParams,
    idea_prompt: continuationIdea,
    idea_prompt_raw: continuationIdea,
    speech_text: '',
    speech_text_full: '',
    speech_text_input_raw: '',
    speech_text_raw: '',
    speech_text_normalized: '',
    speech_text_full_normalized: '',
    speech_text_chunk: '',
    speech_text_chunk_normalized: '',
    speech_text_remaining: '',
    speech_text_remaining_normalized: '',
    estimated_chunk_seconds: 0,
    estimated_remaining_speech_seconds: 0,
    actual_speech_seconds: null,
    generated_voice_asset_id: '',
    generated_voice_url: '',
    continuation_available: false,
    continuation_idea_prompt: '',
    talking_video_chunked: false,
    pipeline_stage: 'validating',
    pipeline_attempts: {},
  }
}

function getProvadorContinuationDraft(inputParams: Record<string, unknown>) {
  if (!inputParams.continuation_params || typeof inputParams.continuation_params !== 'object' || Array.isArray(inputParams.continuation_params)) {
    return null
  }

  const continuationParams = inputParams.continuation_params as Record<string, unknown>
  const productUrl = typeof continuationParams.product_url === 'string' ? continuationParams.product_url.trim() : ''
  if (!productUrl) return null

  return continuationParams
}

function AssetNode({ data, selected }: NodeProps) {
  const {
    asset,
    userPlan,
    onDelete,
    onGenerate,
    onUpdateParams,
    onDuplicate,
  } = data as AssetNodeData

  const isVideoLocked = VIDEO_LOCKED_TYPES.includes(asset.type) && !PAID_PLANS.includes(userPlan ?? '')
  const meta = TYPE_META[asset.type]
  const composeVariant = asset.type === 'compose' ? String(asset.input_params.compose_variant ?? 'fitting') : ''
  const displayMeta =
    asset.type === 'compose'
      ? {
          ...meta,
          label: composeVariant === 'product' ? 'Modelo + Produto' : 'Provador',
          hint:
            composeVariant === 'product'
              ? 'Hero product em fundo branco com pose clean.'
              : 'Auto-detecta roupa, calcado e acessorios com fidelidade de prova.',
        }
      : meta

  const inputHandles = useMemo(() => INPUT_HANDLES[asset.type] ?? [], [asset.type])
  const [collapsed, setCollapsed] = useState(() => asset.status === 'done' || (!asset.isLocal && asset.status === 'idle'))
  const [doneEditorOpen, setDoneEditorOpen] = useState(false)
  const hasDoneResult = asset.status === 'done' && Boolean(asset.result_url)
  const isDonePreview = hasDoneResult && !doneEditorOpen
  const isDoneEditing = hasDoneResult && doneEditorOpen
  const effectiveCollapsed =
    isDoneEditing
      ? false
      : isDonePreview
      ? true
      : selected || asset.status === 'processing' || asset.status === 'error'
      ? false
      : collapsed

  const connectedInputLabels = useMemo(() => getConnectedInputLabels(asset, inputHandles), [asset, inputHandles])
  const summaryTokens = useMemo(() => getSummaryTokens(asset, inputHandles), [asset, inputHandles])
  const talkingVideoContinuationDraft = useMemo(
    () => (asset.type === 'talking_video' ? getTalkingVideoContinuationDraft(asset.input_params) : null),
    [asset.type, asset.input_params],
  )
  const provadorContinuationDraft = useMemo(
    () => (asset.type === 'compose' ? getProvadorContinuationDraft(asset.input_params) : null),
    [asset.type, asset.input_params],
  )
  const provadorRemainingCategories = Array.isArray(asset.input_params.remaining_structural_categories)
    ? asset.input_params.remaining_structural_categories.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : []
  const cardWidth = getStudioNodeCardWidth(asset.type, {
    status: asset.status,
    collapsed: effectiveCollapsed,
    selected,
    donePreview: isDonePreview,
  })
  const showExpandedSummary = !LATERAL_EDITOR_TYPES.has(asset.type)
  return (
    <div
      className={`group/node overflow-visible rounded-[26px] border transition-[width,box-shadow,opacity,transform,border-color,background-color] duration-200 ${
        selected
          ? 'border-[#54D6F6]/34 bg-[#0E1011]/97 shadow-[0_24px_80px_rgba(0,173,204,0.16)]'
          : asset.isNew
            ? 'border-orange-400/35 bg-[#111111]/96 shadow-[0_22px_70px_rgba(249,115,22,0.18)]'
            : 'border-white/8 bg-[#101112]/94 shadow-[0_18px_52px_rgba(0,0,0,0.34)]'
      } opacity-100 ${
        selected ? 'translate-y-[-2px]' : ''
      }`}
      style={{ width: cardWidth }}
    >
      {inputHandles.map((handle, index) => (
        <HandleTag
          key={handle.id}
          id={handle.id}
          label={handle.label}
          side="left"
          top={64 + index * 26}
          selected={selected}
        />
      ))}

      <HandleTag
        id="output"
        label={displayMeta.output}
        side="right"
        top={Math.max(96, 64 + Math.floor(inputHandles.length / 2) * 24)}
        selected={selected}
      />

      <div className="flex items-start justify-between gap-3 border-b border-white/6 px-4 py-3">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] border ${displayMeta.chip}`}>
            {displayMeta.icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className={`truncate text-[14px] font-semibold tracking-tight ${displayMeta.color}`}>{displayMeta.label}</p>
              <StatusPill status={asset.status} />
            </div>
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-white/82">{displayMeta.hint}</p>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full border border-white/12 bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
            {asset.credits_cost} CR
          </span>
          <button
            type="button"
            onClick={() => onDuplicate(asset.id)}
            title="Duplicar card"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#54D6F6]/24 bg-[#0D171B] text-cyan-100 transition-colors hover:border-[#54D6F6]/40 hover:bg-[#112329] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#54D6F6]/45"
          >
            <CopyPlus size={15} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(asset.id)}
            title="Excluir card"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/82 transition-colors hover:border-red-500/24 hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
        {isVideoLocked ? (
          <LockedPlanState />
        ) : asset.status === 'processing' ? (
          <ProcessingCard
            type={asset.type}
            createdAt={asset.created_at}
            assetId={asset.id}
            pipelineStage={typeof asset.input_params.pipeline_stage === 'string' ? asset.input_params.pipeline_stage : undefined}
          />
        ) : asset.status === 'error' ? (
          <ErrorCard asset={asset} onGenerate={(paramsOverride) => onGenerate(asset.type, paramsOverride ?? asset.input_params, asset.id)} />
        ) : isDonePreview ? (
          <div className="space-y-3">
            <ResultPreview type={asset.type} url={asset.result_url!} params={asset.input_params} donePreview />
            {asset.type === 'talking_video' && talkingVideoContinuationDraft ? (
              <div className="rounded-[18px] border border-cyan-500/18 bg-[#0D171B] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">restante pronto para continuar</p>
                <p className="mt-1 text-[12px] leading-relaxed text-white/80">
                  Este primeiro video entregou a parte inicial da fala. Se quiser, criamos outro card ja com o texto restante preenchido.
                </p>
              </div>
            ) : null}
            {asset.type === 'compose' && provadorContinuationDraft ? (
              <div className="rounded-[18px] border border-cyan-500/18 bg-[#0D171B] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">proximo passo do look preparado</p>
                <p className="mt-1 text-[12px] leading-relaxed text-white/80">
                  Este resultado estabilizou a base principal do look. Se quiser, continuamos com {provadorRemainingCategories.join(', ') || 'a proxima peca'} em outro card ja preenchido.
                </p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDoneEditorOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/[0.08] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:border-white/24 hover:bg-white/[0.11] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                <Pencil size={12} />
                Editar
              </button>
              <button
                type="button"
                onClick={() => setDoneEditorOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/[0.08] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:border-white/24 hover:bg-white/[0.11] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                <RotateCcw size={12} />
                Regenerar
              </button>
              {asset.type !== 'script' && asset.type !== 'caption' ? (
                <button
                  type="button"
                  onClick={() => downloadAsset(asset)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#54D6F6]/24 bg-[#0D171B] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:border-[#54D6F6]/40 hover:bg-[#102025] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#54D6F6]/35"
              >
                  <Download size={12} />
                  Download
                </button>
              ) : null}
              {asset.type === 'talking_video' && talkingVideoContinuationDraft ? (
                <button
                  type="button"
                  onClick={() => onDuplicate(asset.id, talkingVideoContinuationDraft)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/24 bg-cyan-500/12 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100 transition-colors hover:border-cyan-400/40 hover:bg-cyan-500/16 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30"
              >
                  <ArrowRight size={12} />
                  Continuar restante
                </button>
              ) : null}
              {asset.type === 'compose' && provadorContinuationDraft ? (
                <button
                  type="button"
                  onClick={() => onDuplicate(asset.id, provadorContinuationDraft)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/24 bg-cyan-500/12 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100 transition-colors hover:border-cyan-400/40 hover:bg-cyan-500/16 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30"
              >
                  <ArrowRight size={12} />
                  Continuar look
                </button>
              ) : null}
            </div>
            {asset.type === 'model' ? <ModelDoneActions asset={asset} onRegenerate={() => onGenerate(asset.type, asset.input_params, asset.id)} /> : null}
          </div>
        ) : effectiveCollapsed ? (
          <CollapsedIdleShell
            summaryTokens={summaryTokens}
            connectedInputLabels={connectedInputLabels}
            onOpen={() => setCollapsed(false)}
          />
        ) : (
          <div className="space-y-4">
            {showExpandedSummary ? (
              <OpenCardSummary summaryTokens={summaryTokens} connectedInputLabels={connectedInputLabels} nextStep={NEXT_STEPS[asset.type]?.text} />
            ) : null}
            <FormForType
              type={asset.type}
              initialParams={asset.input_params}
              onGenerate={(params) => {
                setDoneEditorOpen(false)
                onUpdateParams(asset.id, params)
                onGenerate(asset.type, params, asset.id)
              }}
            />
          </div>
        )}
      </div>

      <div className="border-t border-white/6 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {isDoneEditing ? (
            <button
              type="button"
              onClick={() => setDoneEditorOpen(false)}
              className="rounded-full border border-white/14 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/92 transition-colors hover:border-white/24 hover:text-white"
            >
              Voltar ao preview
            </button>
          ) : !isDonePreview ? (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="rounded-full border border-white/14 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/92 transition-colors hover:border-white/24 hover:text-white"
            >
              Recolher
            </button>
          ) : <div />}
          <div className="flex items-center justify-center gap-2 text-white/74">
          <GripHorizontal size={15} />
          <span className="text-[11px] uppercase tracking-[0.2em]">drag node</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function HandleTag({
  id,
  label,
  side,
  top,
  selected,
}: {
  id: string
  label: string
  side: 'left' | 'right'
  top: number
  selected: boolean
}) {
  const isLeft = side === 'left'

  return (
    <div
      className="group/handle absolute z-[60]"
      style={{
        [isLeft ? 'left' : 'right']: -8,
        top,
        transform: 'translateY(-50%)',
      }}
    >
      <Handle
        type={isLeft ? 'target' : 'source'}
        position={isLeft ? Position.Left : Position.Right}
        id={id}
        title={label}
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          background: isLeft ? '#5FD2EA' : '#00ADCC',
          border: selected ? '3px solid rgba(255,255,255,0.65)' : '3px solid rgba(255,255,255,0.42)',
          boxShadow: selected
            ? '0 0 0 6px rgba(84,214,246,0.10)'
            : '0 0 0 4px rgba(84,214,246,0.04)',
          opacity: selected ? 1 : 0.84,
        }}
      />

      <span
        className={`pointer-events-none absolute top-1/2 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-all ${
          selected
            ? 'border-white/14 bg-[#0C1114] text-white/88 opacity-100'
            : 'border-white/10 bg-[#0C1114]/94 text-white/70 opacity-0 group-hover/handle:opacity-100'
        } ${isLeft ? 'right-[20px]' : 'left-[20px]'}`}
        style={{ transform: 'translateY(-50%)' }}
      >
        {label}
      </span>
    </div>
  )
}

function StatusPill({ status }: { status: StudioAsset['status'] }) {
  const meta = STATUS_META[status]

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${meta.className}`}>
      {meta.label}
    </span>
  )
}

function LockedPlanState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-8 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-black/20">
        <Lock size={18} className="text-white/50" />
      </div>
      <div>
        <p className="text-base font-semibold text-white/92">Disponivel em planos pagos</p>
        <p className="mt-1 text-[12px] leading-relaxed text-white/68">Video, animacao e lip sync ficam liberados a partir do plano Rookie.</p>
      </div>
      <a
        href="/#precos"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-[#54D6F6]/18 bg-[#0D171B] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8EDDED] transition-colors hover:border-[#54D6F6]/34 hover:text-white"
      >
        Ver planos
      </a>
    </div>
  )
}

function CollapsedIdleShell({
  summaryTokens,
  connectedInputLabels,
  onOpen,
}: {
  summaryTokens: string[]
  connectedInputLabels: string[]
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[22px] border border-dashed border-white/10 bg-white/[0.025] p-4 text-left transition-colors hover:border-[#54D6F6]/24 hover:bg-[#0D171B]"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/82">modo compacto</p>
          <p className="mt-1 text-sm font-medium text-white/92">
            {summaryTokens.length > 0 ? 'Card pronto para abrir e gerar.' : 'Abra para configurar este card.'}
          </p>
        </div>
        <span className="rounded-full border border-[#54D6F6]/24 bg-[#0D171B] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
          Abrir
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {summaryTokens.length > 0 ? (
          summaryTokens.map((token) => (
            <span key={token} className="rounded-full border border-white/12 bg-white/[0.08] px-2.5 py-1 text-[11px] text-white/92">
              {token}
            </span>
          ))
        ) : (
          <span className="rounded-full border border-white/12 bg-white/[0.08] px-2.5 py-1 text-[11px] text-white/74">
            Nenhum campo principal preenchido
          </span>
        )}
      </div>

      {connectedInputLabels.length > 0 ? (
        <p className="mt-3 text-[12px] text-white/82">Entradas prontas: {connectedInputLabels.join(', ')}</p>
      ) : null}
    </button>
  )
}

function OpenCardSummary({
  summaryTokens,
  connectedInputLabels,
  nextStep,
}: {
  summaryTokens: string[]
  connectedInputLabels: string[]
  nextStep?: string
}) {
  const chips = summaryTokens.slice(0, 5)

  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-3 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/82">configuracao ativa</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chips.length > 0 ? (
              chips.map((token) => (
                <span key={token} className="rounded-full border border-white/12 bg-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-white/92">
                  {token}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-white/12 bg-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-white/74">
                Campos principais ainda vazios
              </span>
            )}
          </div>
        </div>

        <div className="min-w-0 lg:max-w-[240px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">entradas</p>
          <p className="mt-1 text-[12px] leading-relaxed text-white/82">
            {connectedInputLabels.length > 0 ? connectedInputLabels.join(', ') : 'Sem entradas conectadas no momento.'}
          </p>
          {nextStep ? <p className="mt-2 text-[11px] leading-relaxed text-white/92">{nextStep}</p> : null}
        </div>
      </div>
    </div>
  )
}

function ResultPreview({
  type,
  url,
  params,
  donePreview = false,
}: {
  type: AssetType
  url: string
  params: Record<string, unknown>
  donePreview?: boolean
}) {
  const visualFrameClass = donePreview
    ? 'mx-auto overflow-hidden rounded-[22px] border border-white/10 bg-black/30'
    : 'overflow-hidden rounded-[22px] border border-white/8 bg-black/20'
  const imageAspectClass = donePreview ? 'aspect-[4/5] w-full' : ''
  const videoAspectClass = donePreview ? 'aspect-[9/16] w-full' : ''

  if (type === 'model') {
    return (
      <div className="space-y-3">
        <div className={visualFrameClass}>
          <div className={imageAspectClass}>
            <img src={url} alt="Modelo UGC" className={`w-full ${donePreview ? 'h-full object-contain' : 'max-h-[360px] object-contain'}`} />
          </div>
        </div>
        {typeof params.model_text === 'string' && params.model_text.trim() ? (
          <div className="rounded-[18px] border border-indigo-500/14 bg-indigo-500/8 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-200">descricao</p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/80">{String(params.model_text)}</p>
          </div>
        ) : null}
      </div>
    )
  }

  if (type === 'image' || type === 'upscale' || type === 'compose' || type === 'face' || type === 'angles' || type === 'scene') {
    return (
      <div className={visualFrameClass}>
        <div className={imageAspectClass}>
          <img src={url} alt={TYPE_META[type].label} className={`w-full ${donePreview ? 'h-full object-contain' : 'max-h-[360px] object-contain'}`} />
        </div>
      </div>
    )
  }

  if (type === 'look_split') {
    const references = Array.isArray(params.split_references)
      ? (params.split_references as Array<{ category?: string; url?: string; rank?: number }>)
        .filter((item) => typeof item?.url === 'string' && item.url.trim().length > 0)
        .slice(0, 3)
      : []

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2 rounded-[22px] border border-white/8 bg-black/10 p-2">
          {references.map((reference, index) => (
            <div key={`${reference.url}-${index}`} className="overflow-hidden rounded-[16px] border border-white/8 bg-black/20">
              <div className="aspect-[4/5] overflow-hidden">
                <img src={reference.url} alt={`Referencia ${index + 1}`} className="h-full w-full object-contain" />
              </div>
              <div className="border-t border-white/8 px-2 py-1.5">
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${index === 0 ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200' : 'border-white/10 bg-white/[0.05] text-white/58'}`}>
                  {index === 0 ? 'Principal' : `Ref ${index + 1}`}
                </span>
                <p className="mt-1 truncate text-[10px] text-white/52">{String(reference.category ?? 'Referencia')}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-[18px] border border-cyan-500/12 bg-cyan-500/8 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200">bundle pronto</p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/58">
            Uma unica conexao deste card para o Provador preenche automaticamente a referencia principal e as referencias extras.
          </p>
        </div>
      </div>
    )
  }

  if (type === 'video' || type === 'talking_video' || type === 'render' || type === 'animate' || type === 'lipsync' || type === 'join') {
    return (
      <div className={visualFrameClass}>
        <div className={videoAspectClass}>
          <video src={url} controls className={`w-full ${donePreview ? 'h-full object-contain' : 'max-h-[360px] object-contain'}`} playsInline />
        </div>
      </div>
    )
  }

  if (type === 'voice' || type === 'music') {
    return (
      <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-3">
        <audio src={url} controls className="w-full" />
      </div>
    )
  }

  if (type === 'script') {
    return <ScriptPreview text={String(params.script_text ?? '')} url={url} />
  }

  if (type === 'caption') {
    return <CaptionPreview url={url} />
  }

  if (type === 'ugc_bundle') {
    const bundle = Array.isArray(params.ugc_bundle)
      ? (params.ugc_bundle as Array<{ position: string; url: string }>)
      : []

    return (
      <div className="grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto rounded-[22px] border border-white/8 bg-black/10 p-2">
        {bundle.map((item, index) => (
          <button
            key={`${item.position}-${index}`}
            type="button"
            onClick={() => window.open(item.url, '_blank')}
            className="group relative overflow-hidden rounded-[16px] border border-white/8"
          >
            <img src={item.url} alt={item.position} className="aspect-[9/16] w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
              <Download size={14} className="text-white" />
            </div>
          </button>
        ))}
      </div>
    )
  }

  return null
}

function ScriptPreview({ text, url }: { text: string; url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const content = text || (await fetch(url).then((response) => response.text()).catch(() => ''))
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div className="max-h-[280px] overflow-y-auto rounded-[18px] border border-white/8 bg-white/[0.03] p-3 text-[12px] leading-relaxed text-white/72">
        {text || <span className="italic text-white/36">Carregando script...</span>}
      </div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70 transition-colors hover:border-white/18 hover:text-white"
      >
        {copied ? <Check size={12} className="text-emerald-300" /> : <Copy size={12} />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}

function CaptionPreview({ url }: { url: string }) {
  const [srt, setSrt] = useState('')

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          if (!srt) {
            fetch(url)
              .then((response) => response.text())
              .then(setSrt)
              .catch(() => {})
          }
        }}
        className="max-h-[220px] w-full overflow-y-auto rounded-[18px] border border-white/8 bg-white/[0.03] p-3 text-left text-[12px] leading-relaxed text-white/68"
      >
        {srt || <span className="italic text-white/36">Clique para visualizar a legenda.</span>}
      </button>
      <a
        href={url}
        download
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70 transition-colors hover:border-white/18 hover:text-white"
      >
        <Download size={12} />
        Baixar .srt
      </a>
    </div>
  )
}

function ModelDoneActions({ asset, onRegenerate }: { asset: StudioAsset; onRegenerate: () => void }) {
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    const text = String(asset.input_params.model_text ?? '')
    if (!text) return

    const response = await fetch('/api/studio/save-model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text }),
    })

    if (response.ok) setSaved(true)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onRegenerate}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70 transition-colors hover:border-white/18 hover:text-white"
      >
        <RotateCcw size={12} />
        Variar
      </button>
      <button
        type="button"
        onClick={handleSave}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] transition-colors ${
          saved
            ? 'border-emerald-500/24 bg-emerald-500/10 text-emerald-200'
            : 'border-indigo-500/20 bg-indigo-500/10 text-indigo-200 hover:border-indigo-500/36 hover:text-white'
        }`}
      >
        {saved ? <Check size={12} /> : <ArrowRight size={12} />}
        {saved ? 'Modelo salvo' : 'Salvar modelo'}
      </button>
    </div>
  )
}

function FormForType({
  type,
  initialParams,
  onGenerate,
}: {
  type: AssetType
  initialParams: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}) {
  if (type === 'face') return <FaceGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'join') return <JoinGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'image') return <ImageGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'script') return <ScriptGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'voice') return <VoiceGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'video') return <VideoGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'talking_video') return <TalkingVideoGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'caption') return <CaptionGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'upscale') return <UpscaleCard initial={initialParams} onGenerate={onGenerate} />
  if (type === 'model') return <ModelGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'render') return <RenderCard initial={initialParams} onGenerate={onGenerate} />
  if (type === 'animate') return <AnimateGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'compose') return <ComposeCard initial={initialParams} onGenerate={onGenerate} />
  if (type === 'lipsync') return <LipsyncGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'angles') return <AngleGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'music') return <MusicGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'scene') return <SceneGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'ugc_bundle') return <UGCBundleGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'look_split') return <LookSplitGenerator initial={initialParams} onGenerate={onGenerate} />
  return null
}

type GuidedSplitReferenceView = {
  category?: string
  role?: 'vertex-core' | 'overlay-only'
  image_url?: string
}

type GuidedNextAction = {
  type?: string
  label?: string
  references?: GuidedSplitReferenceView[]
  regenerate_params?: Record<string, unknown>
}

function ErrorCard({ asset, onGenerate }: { asset: StudioAsset; onGenerate: (paramsOverride?: Record<string, unknown>) => void }) {
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')
  const hasPrediction = !!(asset.input_params as { prediction_id?: unknown }).prediction_id
  const canSync = SYNC_TYPES.includes(asset.type) && hasPrediction
  const failureState = typeof asset.input_params.failure_state === 'string' ? asset.input_params.failure_state : ''
  const publicError = resolveStudioPublicError({
    code: asset.input_params.public_error_code,
    title: asset.input_params.public_error_title,
    message: asset.input_params.public_error_message,
    supportDebugId: asset.input_params.support_debug_id,
    fallbackCode: asset.type === 'compose' ? 'nao_conseguimos_vestir_esse_look' : 'falha_na_geracao',
  })
  const garmentPriorityApplied = Boolean(asset.input_params.single_photo_garment_priority_applied)
  const primaryProductType = typeof asset.input_params.single_photo_primary_product_type === 'string'
    ? asset.input_params.single_photo_primary_product_type
    : ''
  const overlayOnlyCategories = Array.isArray(asset.input_params.single_photo_overlay_only_categories)
    ? asset.input_params.single_photo_overlay_only_categories.filter((value): value is string => typeof value === 'string')
    : []
  const nextAction = (
    asset.input_params.next_action
    && typeof asset.input_params.next_action === 'object'
    && !Array.isArray(asset.input_params.next_action)
      ? asset.input_params.next_action as GuidedNextAction
      : null
  )
  const guidedReferences = Array.isArray(nextAction?.references)
    ? nextAction.references.filter((reference): reference is GuidedSplitReferenceView => Boolean(reference) && typeof reference === 'object')
    : []
  const preparedCoreReferences = guidedReferences.filter((reference) => reference.role === 'vertex-core')
  const preparedOverlayReferences = guidedReferences.filter((reference) => reference.role === 'overlay-only')
  const canRunGuidedSplitRetry = (
    (failureState === 'split_required_after_outerwear_failure' || failureState === 'split_required_after_garment_priority')
    && nextAction?.type === 'regenerate_with_guided_split'
    && nextAction.regenerate_params
    && typeof nextAction.regenerate_params === 'object'
    && !Array.isArray(nextAction.regenerate_params)
  )

  async function handleSync() {
    setSyncing(true)
    setMessage('')

    try {
      const response = await fetch(`/api/studio/assets/${asset.id}/sync`, { method: 'POST' })
      const data = await response.json()

      if (data.status === 'done') {
        setMessage('Resultado encontrado. Recarregando...')
        setTimeout(() => window.location.reload(), 1200)
      } else if (data.status === 'error') {
        setMessage(data.error ?? 'Falha ao sincronizar')
      } else {
        setMessage('Ainda em processamento no provedor.')
      }
    } catch {
      setMessage('Nao foi possivel consultar o status agora.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-3 rounded-[22px] border border-red-500/18 bg-red-500/8 p-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-200">{publicError.title}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-red-100/92">{publicError.message}</p>
      </div>
      {failureState === 'split_required_after_outerwear_failure' || failureState === 'split_required_after_garment_priority' ? (
        <div className="rounded-[18px] border border-cyan-500/18 bg-cyan-500/8 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100">look preparado automaticamente</p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/86">
            {failureState === 'split_required_after_garment_priority'
              ? 'Separamos a roupa principal do restante para seguir por um caminho mais estavel, sem voce precisar remontar tudo.'
              : 'Preparamos as pecas principais do look para seguir com mais fidelidade e menos risco de falha.'}
          </p>
          {preparedCoreReferences.length > 0 ? (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/72">pecas preparadas</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {preparedCoreReferences.map((reference, index) => (
                  <span key={`${reference.category ?? 'core'}-${index}`} className="rounded-full border border-cyan-500/20 bg-[#0D171B] px-2.5 py-1 text-[10px] font-medium text-cyan-100">
                    {reference.category ?? 'Referencia'}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {preparedOverlayReferences.length > 0 || overlayOnlyCategories.length > 0 ? (
            <p className="mt-3 text-[11px] leading-relaxed text-white/76">
              {failureState === 'split_required_after_garment_priority'
                ? `Os detalhes extras${overlayOnlyCategories.length > 0 ? ` como ${overlayOnlyCategories.join(', ')}` : ''} entram depois sem atrapalhar a roupa principal.`
                : 'Os acessorios entram depois como refinamento, sem bloquear a roupa principal.'}
            </p>
          ) : null}
          {garmentPriorityApplied && primaryProductType === 'matching_set' ? (
            <p className="mt-2 text-[11px] leading-relaxed text-white/76">
              Tratamos esta referencia como roupa principal, nao como detalhe secundario.
            </p>
          ) : null}
        </div>
      ) : null}
      {failureState === 'manual_split_required' ? (
        <div className="rounded-[18px] border border-amber-500/18 bg-amber-500/8 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-100">foto mais limpa ajuda</p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/86">
            Nao conseguimos separar o look com seguranca nessa imagem. Uma foto mais limpa ou referencias separadas das pecas principais ajudam bastante.
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {canSync ? (
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-100 transition-colors hover:border-amber-500/34 hover:text-white disabled:opacity-60"
          >
            <RotateCcw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Verificando' : 'Buscar resultado'}
          </button>
        ) : null}
        {canRunGuidedSplitRetry ? (
          <button
            type="button"
            onClick={() => onGenerate(nextAction?.regenerate_params)}
            className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/24 bg-cyan-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-100 transition-colors hover:border-cyan-400/40 hover:text-white"
          >
            <RotateCcw size={12} />
            Usar look preparado
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onGenerate()}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/78 transition-colors hover:border-white/18 hover:text-white"
          >
            <RotateCcw size={12} />
            {publicError.code === 'precisamos_de_uma_foto_mais_limpa' ? 'Tentar com outra foto' : 'Tentar de novo'}
          </button>
        )}
      </div>
      {message ? <p className="text-[11px] text-white/76">{message}</p> : null}
    </div>
  )
}

function ProcessingCard({
  type,
  createdAt,
  assetId,
  pipelineStage,
}: {
  type: AssetType
  createdAt: string
  assetId: string
  pipelineStage?: string
}) {
  const estimated = ESTIMATED[type] ?? 30
  const baseLabel = PROCESSING_LABELS[type] ?? 'Gerando com IA...'
  const [elapsed, setElapsed] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  useEffect(() => {
    const start = new Date(createdAt).getTime()
    setElapsed(Math.floor((Date.now() - start) / 1000))

    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)

    return () => clearInterval(timer)
  }, [createdAt])

  const progress = Math.round(Math.min((elapsed / estimated) * 100, 90))
  const remaining = Math.max(estimated - elapsed, 0)
  const isStuck = elapsed > estimated + 60

  const formatSeconds = (seconds: number) =>
    seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`

  const stageLabelMap: Record<string, string> = {
    validating: 'Validando texto, politicas e limites de fala...',
    voice_generating: 'Gerando a voz base da performance...',
    voice_duration_check: 'Ajustando o primeiro trecho para caber no take...',
    veo_generating: 'Gerando o take falado no Veo...',
    lipsyncing: 'Sincronizando labios e audio final...',
    finalizing: 'Finalizando o video e consolidando saidas...',
    completed: 'Pipeline concluido.',
    failed: 'Pipeline falhou.',
  }
  const label = pipelineStage ? (stageLabelMap[pipelineStage] ?? baseLabel) : baseLabel

  async function syncNow() {
    setSyncing(true)
    setSyncMessage('')

    try {
      const response = await fetch(`/api/studio/assets/${assetId}/sync`, { method: 'POST' })
      const data = await response.json()

      if (data.status === 'done') {
        setSyncMessage('Pronto. Recarregando...')
        setTimeout(() => window.location.reload(), 1400)
      } else if (data.status === 'error') {
        setSyncMessage(data.error ?? 'Erro ao sincronizar')
        setTimeout(() => window.location.reload(), 2200)
      } else {
        setSyncMessage(`Status atual: ${data.status}`)
      }
    } catch {
      setSyncMessage('Nao foi possivel atualizar agora.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-4 rounded-[22px] border border-[#54D6F6]/14 bg-[#0D171B] p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#54D6F6]/16 bg-[#091116] text-[#8EDDED]">
          <Loader2 size={15} className="animate-spin" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8EDDED]">processing</p>
          <p className="mt-1 text-[12px] leading-relaxed text-white/78">{label}</p>
          {pipelineStage ? <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40">{pipelineStage.replace(/_/g, ' ')}</p> : null}
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#54D6F6_0%,#00ADCC_55%,#9B8CFF_100%)] transition-[width] duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-white/42">
          <span>{progress}%</span>
          <span>{remaining > 0 ? `~${formatSeconds(remaining)} restantes` : 'Aguardando retorno do provedor'}</span>
        </div>
      </div>

      {isStuck ? (
        <div className="space-y-2 rounded-[18px] border border-amber-500/18 bg-amber-500/8 p-3">
          <p className="text-[11px] leading-relaxed text-amber-100/88">
            Esta geracao esta demorando mais do que o esperado. Voce pode verificar o status sem custo extra.
          </p>
          <button
            type="button"
            onClick={syncNow}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/24 bg-amber-500/12 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-100 transition-colors hover:border-amber-500/36 hover:text-white disabled:opacity-60"
          >
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            {syncing ? 'Verificando' : 'Forcar atualizacao'}
          </button>
          {syncMessage ? <p className="text-[11px] text-white/56">{syncMessage}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

function downloadAsset(asset: StudioAsset) {
  if (!asset.result_url) return

  const anchor = document.createElement('a')
  anchor.href = asset.result_url
  anchor.download = `studio-${asset.type}-${asset.id.slice(0, 8)}`
  anchor.target = '_blank'
  anchor.click()
}

export default memo(AssetNode)

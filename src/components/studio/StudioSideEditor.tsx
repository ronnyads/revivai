'use client'

import { useState } from 'react'
import { ArrowRight, Download, Pencil, RotateCcw, X } from 'lucide-react'
import { AssetType, StudioAsset } from '@/types'
import {
  TYPE_META,
  StatusPill,
  FormForType,
  ProcessingCard,
  ResultPreview,
  ErrorCard,
  downloadAsset,
} from './nodes/AssetNode'

const VIDEO_LOCKED_TYPES: AssetType[] = ['video', 'talking_video', 'animate', 'lipsync']
const PAID_PLANS = ['rookie', 'pro', 'elite', 'agency']

function getTalkingVideoContinuationDraft(inputParams: Record<string, unknown>) {
  const remaining =
    typeof inputParams.speech_text_remaining === 'string'
      ? inputParams.speech_text_remaining.trim()
      : typeof inputParams.speech_text_remaining_normalized === 'string'
        ? inputParams.speech_text_remaining_normalized.trim()
        : ''
  if (!remaining) return null
  return inputParams
}

function getProvadorContinuationDraft(inputParams: Record<string, unknown>) {
  if (
    !inputParams.continuation_params ||
    typeof inputParams.continuation_params !== 'object' ||
    Array.isArray(inputParams.continuation_params)
  ) return null
  const p = inputParams.continuation_params as Record<string, unknown>
  const productUrl = typeof p.product_url === 'string' ? p.product_url.trim() : ''
  return productUrl ? p : null
}

interface StudioSideEditorProps {
  asset: StudioAsset | null
  userPlan: string
  onGenerate: (type: AssetType, params: Record<string, unknown>, assetId: string) => void
  onUpdateParams: (assetId: string, params: Record<string, unknown>) => void
  onDelete: (assetId: string) => void
  onDuplicate: (assetId: string, overrides?: Record<string, unknown>) => void
  onRefreshAsset: (assetId: string, fallback?: Partial<StudioAsset>) => Promise<void>
}

export default function StudioSideEditor({
  asset,
  userPlan,
  onGenerate,
  onUpdateParams,
  onDelete,
  onDuplicate,
  onRefreshAsset,
}: StudioSideEditorProps) {
  const [editingDone, setEditingDone] = useState(false)

  if (!asset) {
    return (
      <div className="flex w-[380px] shrink-0 flex-col items-center justify-center border-l border-white/8 bg-[#0C0E10] px-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/28">Editor</p>
        <p className="mt-2 text-sm text-white/42">Selecione um card no board para editar</p>
      </div>
    )
  }

  const meta = TYPE_META[asset.type]
  const composeVariant = asset.type === 'compose' ? String(asset.input_params.compose_variant ?? 'fitting') : ''
  const displayMeta =
    asset.type === 'compose'
      ? {
          ...meta,
          label: composeVariant === 'product' ? 'Modelo + Produto' : 'Provador',
        }
      : meta

  const isVideoLocked = VIDEO_LOCKED_TYPES.includes(asset.type) && !PAID_PLANS.includes(userPlan ?? '')
  const chainIndex = typeof asset.input_params.chain_index === 'number' ? asset.input_params.chain_index : null
  const chainTotal = typeof asset.input_params.chain_total === 'number' ? asset.input_params.chain_total : null
  const isChained = chainTotal !== null && chainTotal > 1
  const chainLabel = isChained ? `Parte ${(chainIndex ?? 0) + 1}/${chainTotal}` : null
  const isChainWaiting = asset.status === 'idle' && asset.input_params.pipeline_stage === 'chain_waiting'
  const hasDoneResult = asset.status === 'done' && Boolean(asset.result_url)
  const isDonePreview = hasDoneResult && !editingDone
  const talkingVideoContinuationDraft =
    asset.type === 'talking_video' ? getTalkingVideoContinuationDraft(asset.input_params) : null
  const provadorContinuationDraft =
    asset.type === 'compose' ? getProvadorContinuationDraft(asset.input_params) : null
  const provadorRemainingCategories = Array.isArray(asset.input_params.remaining_structural_categories)
    ? (asset.input_params.remaining_structural_categories as unknown[]).filter(
        (v): v is string => typeof v === 'string' && v.trim().length > 0,
      )
    : []

  return (
    <div className="flex w-[380px] shrink-0 flex-col border-l border-white/8 bg-[#0C0E10]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/6 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px] border ${displayMeta.chip}`}>
            {displayMeta.icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className={`truncate text-[13px] font-semibold tracking-tight ${displayMeta.color}`}>
                {displayMeta.label}
              </p>
              <StatusPill status={asset.status} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {chainLabel ? (
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
              {chainLabel}
            </span>
          ) : null}
          <span className="rounded-full border border-white/12 bg-white/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
            {asset.credits_cost} CR
          </span>
          <button
            type="button"
            onClick={() => onDelete(asset.id)}
            title="Excluir"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 transition-colors hover:border-red-500/24 hover:bg-red-500/10 hover:text-red-300"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isVideoLocked ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-8 text-center">
            <p className="text-base font-semibold text-white/92">Disponivel em planos pagos</p>
            <p className="text-[12px] leading-relaxed text-white/68">
              Video, animacao e lip sync ficam liberados a partir do plano Rookie.
            </p>
            <a
              href="/#precos"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#54D6F6]/18 bg-[#0D171B] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8EDDED] transition-colors hover:border-[#54D6F6]/34 hover:text-white"
            >
              Ver planos
            </a>
          </div>
        ) : isChainWaiting ? (
          <div className="rounded-[16px] border border-cyan-500/14 bg-[#0A1419] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400/80">{chainLabel}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-white/60">
              Aguardando a parte anterior concluir para gerar automaticamente...
            </p>
          </div>
        ) : asset.status === 'processing' ? (
          <ProcessingCard
            type={asset.type}
            createdAt={asset.created_at}
            assetId={asset.id}
            pipelineStage={
              typeof asset.input_params.pipeline_stage === 'string' ? asset.input_params.pipeline_stage : undefined
            }
            onRefreshAsset={onRefreshAsset}
          />
        ) : asset.status === 'error' ? (
          <ErrorCard
            asset={asset}
            onGenerate={(paramsOverride) => onGenerate(asset.type, paramsOverride ?? asset.input_params, asset.id)}
            onRefreshAsset={onRefreshAsset}
          />
        ) : isDonePreview ? (
          <div className="space-y-3">
            <ResultPreview type={asset.type} url={asset.result_url!} params={asset.input_params} donePreview />

            {asset.type === 'talking_video' && isChained ? (
              <div className="rounded-[18px] border border-cyan-500/18 bg-[#0D171B] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  {chainLabel} concluída
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-white/80">
                  A próxima parte está sendo gerada automaticamente.
                </p>
              </div>
            ) : asset.type === 'talking_video' && talkingVideoContinuationDraft ? (
              <div className="rounded-[18px] border border-cyan-500/18 bg-[#0D171B] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">
                  restante pronto para continuar
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-white/80">
                  Este primeiro vídeo entregou a parte inicial da fala. Crie outro card com o texto restante preenchido.
                </p>
              </div>
            ) : null}

            {asset.type === 'compose' && provadorContinuationDraft ? (
              <div className="rounded-[18px] border border-cyan-500/18 bg-[#0D171B] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">
                  próximo passo do look preparado
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-white/80">
                  Continue com {provadorRemainingCategories.join(', ') || 'a próxima peça'} em outro card.
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditingDone(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/[0.08] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:border-white/24 hover:bg-white/[0.11]"
              >
                <Pencil size={12} />
                Editar
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingDone(true)
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/14 bg-white/[0.08] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:border-white/24 hover:bg-white/[0.11]"
              >
                <RotateCcw size={12} />
                Regenerar
              </button>
              {asset.type !== 'script' && asset.type !== 'caption' ? (
                <button
                  type="button"
                  onClick={() => downloadAsset(asset)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#54D6F6]/24 bg-[#0D171B] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:border-[#54D6F6]/40 hover:bg-[#102025]"
                >
                  <Download size={12} />
                  Download
                </button>
              ) : null}
              {asset.type === 'talking_video' && !isChained && talkingVideoContinuationDraft ? (
                <button
                  type="button"
                  onClick={() => onDuplicate(asset.id, talkingVideoContinuationDraft)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/24 bg-cyan-500/12 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100 transition-colors hover:border-cyan-400/40 hover:bg-cyan-500/16 hover:text-white"
                >
                  <ArrowRight size={12} />
                  Continuar restante
                </button>
              ) : null}
              {asset.type === 'compose' && provadorContinuationDraft ? (
                <button
                  type="button"
                  onClick={() => onDuplicate(asset.id, provadorContinuationDraft)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/24 bg-cyan-500/12 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100 transition-colors hover:border-cyan-400/40 hover:bg-cyan-500/16 hover:text-white"
                >
                  <ArrowRight size={12} />
                  Continuar look
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {editingDone ? (
              <button
                type="button"
                onClick={() => setEditingDone(false)}
                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50 transition-colors hover:text-white/80"
              >
                ← Voltar ao preview
              </button>
            ) : null}
            <FormForType
              type={asset.type}
              initialParams={asset.input_params}
              onGenerate={(params) => {
                setEditingDone(false)
                onUpdateParams(asset.id, params)
                onGenerate(asset.type, params, asset.id)
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

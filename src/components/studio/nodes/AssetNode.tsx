'use client'

import { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Trash2, Download, RotateCcw, Loader2, Image, Video, Mic, ZoomIn, FileText, Captions, Copy, Check, ArrowRight, User } from 'lucide-react'
import { useState } from 'react'
import { StudioAsset, AssetType } from '@/types'
import ImageGenerator from '../ImageGenerator'
import ScriptGenerator from '../ScriptGenerator'
import VoiceGenerator from '../VoiceGenerator'
import VideoGenerator from '../VideoGenerator'
import CaptionGenerator from '../CaptionGenerator'
import UpscaleCard from '../UpscaleCard'
import ModelGenerator from '../ModelGenerator'

const TYPE_META: Record<AssetType, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  model:   { icon: <User size={14} />,     label: 'Modelo UGC', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' },
  image:   { icon: <Image size={14} />,    label: 'Imagem',     color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/30' },
  video:   { icon: <Video size={14} />,    label: 'Vídeo',      color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30' },
  voice:   { icon: <Mic size={14} />,      label: 'Voz',        color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/30' },
  upscale: { icon: <ZoomIn size={14} />,   label: 'Upscale',    color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/30' },
  script:  { icon: <FileText size={14} />, label: 'Script',     color: 'text-pink-400',   bg: 'bg-pink-500/10 border-pink-500/30' },
  caption: { icon: <Captions size={14} />, label: 'Legenda',    color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/30' },
}

// Handles de entrada por tipo de nó
const INPUT_HANDLES: Partial<Record<AssetType, Array<{ id: string; label: string }>>> = {
  image:   [{ id: 'model_prompt',     label: 'Modelo' }],
  video:   [{ id: 'source_image_url', label: 'Imagem' }, { id: 'model_prompt', label: 'Modelo' }],
  upscale: [{ id: 'source_url',       label: 'Imagem' }],
  voice:   [{ id: 'script',           label: 'Script' }],
  caption: [{ id: 'audio_url',        label: 'Áudio'  }],
}

export interface AssetNodeData {
  asset: StudioAsset
  onDelete: (id: string) => void
  onGenerate: (type: AssetType, params: Record<string, unknown>, existingId: string) => void
  onUpdateParams: (id: string, params: Record<string, unknown>) => void
  [key: string]: unknown
}

function AssetNode({ data }: NodeProps) {
  const { asset, onDelete, onGenerate, onUpdateParams } = data as AssetNodeData
  const meta = TYPE_META[asset.type]
  const inputHandles = INPUT_HANDLES[asset.type] ?? []
  const [collapsed, setCollapsed] = useState(asset.status === 'done')

  function handleDownload() {
    if (!asset.result_url) return
    const a = document.createElement('a')
    a.href = asset.result_url
    a.download = `studio-${asset.type}-${asset.id.slice(0, 8)}`
    a.target = '_blank'
    a.click()
  }

  return (
    <div className={`${asset.type === 'model' ? 'w-[360px]' : 'w-[300px]'} bg-zinc-900 border border-zinc-700 rounded-2xl overflow-visible shadow-2xl shadow-black/40`}>

      {/* INPUT handles — esquerda */}
      {inputHandles.map((h, i) => (
        <Handle
          key={h.id}
          type="target"
          position={Position.Left}
          id={h.id}
          style={{ top: `${48 + i * 28}px`, background: '#3b82f6', width: 14, height: 14, border: '2px solid #1e40af', zIndex: 50, cursor: 'crosshair' }}
          title={h.label}
        />
      ))}

      {/* OUTPUT handle — direita */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#f97316', width: 14, height: 14, border: '2px solid #c2410c', zIndex: 50, cursor: 'crosshair' }}
      />

      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 rounded-t-2xl ${meta.bg}`}>
        <button
          onClick={() => setCollapsed(v => !v)}
          className={`flex items-center gap-2 text-sm font-semibold ${meta.color}`}
        >
          {meta.icon}
          {meta.label}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded-full">{asset.credits_cost}cr</span>
          <button onClick={() => onDelete(asset.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 nodrag">
        {asset.status === 'processing' && (
          <div className="flex flex-col items-center py-6 gap-2">
            <Loader2 size={24} className="animate-spin text-accent" />
            <p className="text-xs text-zinc-400">Gerando com IA...</p>
            {asset.type === 'video'  && <p className="text-[10px] text-zinc-600">Vídeos levam até 3 min</p>}
            {asset.type === 'model'  && <p className="text-[10px] text-zinc-600">Foto pode levar ~30 segundos</p>}
          </div>
        )}

        {asset.status === 'error' && (
          <div className="flex flex-col items-center py-4 gap-2">
            <p className="text-xs text-red-400 text-center">{asset.error_msg || 'Erro ao gerar'}</p>
            <button
              onClick={() => onGenerate(asset.type, asset.input_params, asset.id)}
              className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-white border border-zinc-700 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <RotateCcw size={11} /> Tentar novamente
            </button>
          </div>
        )}

        {asset.status === 'done' && asset.result_url && (
          <div className="flex flex-col gap-2">
            <ResultPreview type={asset.type} url={asset.result_url} params={asset.input_params} />
            {asset.type === 'model' && (
              <ModelDoneActions
                asset={asset}
                onRegenerate={() => onGenerate(asset.type, asset.input_params, asset.id)}
              />
            )}
            {asset.type !== 'script' && asset.type !== 'caption' && asset.type !== 'model' && (
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 hover:text-white border border-zinc-700 px-3 py-1.5 rounded-xl transition-colors w-full"
              >
                <Download size={12} /> Download
              </button>
            )}
          </div>
        )}

        {asset.status === 'idle' && !collapsed && (
          <FormForType
            type={asset.type}
            initialParams={asset.input_params}
            onGenerate={(params) => {
              onUpdateParams(asset.id, params)
              onGenerate(asset.type, params, asset.id)
            }}
          />
        )}

        {asset.status === 'idle' && collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full text-[11px] text-zinc-500 hover:text-accent border border-dashed border-zinc-700 rounded-xl py-3 transition-colors"
          >
            Configurar e gerar
          </button>
        )}
      </div>
    </div>
  )
}

export default memo(AssetNode)

// ── Result previews ───────────────────────────────────────────────────────
function ResultPreview({ type, url, params }: { type: AssetType; url: string; params: Record<string, unknown> }) {
  if (type === 'model') return (
    <div className="flex flex-col gap-2">
      <img src={url} alt="Modelo UGC" className="w-full rounded-xl object-cover max-h-72" />
      {!!params.model_text && (
        <div className="bg-zinc-800 border border-indigo-500/20 rounded-xl p-2.5">
          <p className="text-[10px] text-indigo-400 uppercase tracking-widest mb-1 font-medium">Descrição</p>
          <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-3">{String(params.model_text)}</p>
        </div>
      )}
    </div>
  )
  if (type === 'image' || type === 'upscale') return <img src={url} alt="" className="w-full rounded-xl object-cover max-h-48" />
  if (type === 'video') return <video src={url} controls className="w-full rounded-xl max-h-48" playsInline />
  if (type === 'voice') return <audio src={url} controls className="w-full" />
  if (type === 'script') return <ScriptPreview text={String(params.script_text ?? '')} url={url} />
  if (type === 'caption') return <CaptionPreview url={url} />
  return null
}

function ScriptPreview({ text, url }: { text: string; url: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    const c = text || await fetch(url).then(r => r.text()).catch(() => '')
    await navigator.clipboard.writeText(c)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="bg-zinc-800 rounded-xl p-2.5 text-[11px] text-zinc-300 whitespace-pre-wrap max-h-44 overflow-y-auto leading-relaxed">
        {text || <span className="text-zinc-500 italic">Carregando...</span>}
      </div>
      <button onClick={copy} className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 hover:text-white border border-zinc-700 px-3 py-1.5 rounded-xl transition-colors">
        {copied ? <><Check size={11} className="text-emerald-400" /> Copiado!</> : <><Copy size={11} /> Copiar</>}
      </button>
    </div>
  )
}

function CaptionPreview({ url }: { url: string }) {
  const [srt, setSrt] = useState('')
  return (
    <div className="flex flex-col gap-2">
      <div onClick={() => !srt && fetch(url).then(r => r.text()).then(setSrt)} className="bg-zinc-800 rounded-xl p-2.5 text-[11px] text-zinc-300 whitespace-pre-wrap max-h-36 overflow-y-auto cursor-pointer">
        {srt || <span className="text-zinc-500 italic">Clique para ver a legenda</span>}
      </div>
      <a href={url} download className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 hover:text-white border border-zinc-700 px-3 py-1.5 rounded-xl transition-colors">
        <Download size={11} /> Baixar .srt
      </a>
    </div>
  )
}

function ModelDoneActions({ asset, onRegenerate }: { asset: StudioAsset; onRegenerate: () => void }) {
  const [saved, setSaved] = useState(false)
  async function handleSave() {
    const text = String(asset.input_params.model_text ?? '')
    if (!text) return
    const res = await fetch('/api/studio/save-model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text }),
    })
    if (res.ok) setSaved(true)
  }
  return (
    <div className="flex gap-2">
      <button
        onClick={onRegenerate}
        className="flex items-center justify-center gap-1.5 flex-1 text-[11px] text-zinc-400 hover:text-white border border-zinc-700 py-2 rounded-xl transition-colors"
      >
        <RotateCcw size={11} /> Regenerar
      </button>
      <button
        onClick={handleSave}
        className={`flex items-center justify-center gap-1.5 flex-1 text-[11px] py-2 rounded-xl transition-colors border ${
          saved ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20'
        }`}
      >
        {saved ? <><Check size={11} /> Salvo!</> : <><ArrowRight size={11} /> Salvar Modelo</>}
      </button>
    </div>
  )
}

function FormForType({ type, initialParams, onGenerate }: { type: AssetType; initialParams: Record<string, unknown>; onGenerate: (p: Record<string, unknown>) => void }) {
  if (type === 'image')   return <ImageGenerator   initial={initialParams} onGenerate={onGenerate} />
  if (type === 'script')  return <ScriptGenerator  initial={initialParams} onGenerate={onGenerate} />
  if (type === 'voice')   return <VoiceGenerator   initial={initialParams} onGenerate={onGenerate} />
  if (type === 'video')   return <VideoGenerator   initial={initialParams} onGenerate={onGenerate} />
  if (type === 'caption') return <CaptionGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'upscale') return <UpscaleCard      initial={initialParams} onGenerate={onGenerate} />
  if (type === 'model')   return <ModelGenerator   initial={initialParams} onGenerate={onGenerate} />
  return null
}

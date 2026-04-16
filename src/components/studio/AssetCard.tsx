'use client'

import { useState } from 'react'
import { Trash2, Download, RotateCcw, Loader2, Image, Video, Mic, ZoomIn, FileText, Captions, Copy, Check, ArrowRight, Sparkles, Layers, Wand2, User } from 'lucide-react'
import { StudioAsset, AssetType } from '@/types'
import ImageGenerator from './ImageGenerator'
import ScriptGenerator from './ScriptGenerator'
import VoiceGenerator from './VoiceGenerator'
import VideoGenerator from './VideoGenerator'
import CaptionGenerator from './CaptionGenerator'
import UpscaleCard from './UpscaleCard'
import FaceGenerator from './FaceGenerator'

const TYPE_META: Record<AssetType, { icon: React.ReactNode; label: string; color: string }> = {
  face:    { icon: <User size={15} />,     label: 'Rosto Real',  color: 'text-indigo-400' },
  model:   { icon: <FileText size={15} />, label: 'Modelo UGC',  color: 'text-indigo-400' },
  render:  { icon: <Video size={15} />,    label: 'Vídeo Final', color: 'text-rose-400'   },
  image:   { icon: <Image size={15} />,    label: 'Imagem',      color: 'text-violet-400' },
  video:   { icon: <Video size={15} />,    label: 'Vídeo',      color: 'text-blue-400' },
  voice:   { icon: <Mic size={15} />,      label: 'Voz',        color: 'text-emerald-400' },
  upscale: { icon: <ZoomIn size={15} />,   label: 'Upscale',    color: 'text-amber-400' },
  script:  { icon: <FileText size={15} />, label: 'Script',     color: 'text-pink-400' },
  caption: { icon: <Captions size={15} />, label: 'Legenda',    color: 'text-cyan-400' },
  animate: { icon: <Sparkles size={15} />, label: 'Animar',      color: 'text-fuchsia-400' },
  compose: { icon: <Layers size={15} />,   label: 'Compor Cena', color: 'text-orange-400'  },
  lipsync: { icon: <Wand2 size={15} />,    label: 'Lip Sync',    color: 'text-cyan-400'    },
}

// Mapeamento: tipo de origem → ações "Usar em..."
const USE_AS_ACTIONS: Partial<Record<AssetType, Array<{ targetType: AssetType; label: string; getParams: (asset: StudioAsset) => Record<string, unknown> }>>> = {
  face: [
    { targetType: 'image',   label: 'Usar Rosto na Cena', getParams: a => ({ model_prompt: '', source_face_url: a.result_url }) },
  ],
  image: [
    { targetType: 'video',   label: 'Usar no Vídeo',   getParams: a => ({ source_image_url: a.result_url, motion_prompt: '', duration: 5 }) },
    { targetType: 'upscale', label: 'Fazer Upscale',   getParams: a => ({ source_url: a.result_url, scale: 4 }) },
  ],
  upscale: [
    { targetType: 'video',   label: 'Usar no Vídeo',   getParams: a => ({ source_image_url: a.result_url, motion_prompt: '', duration: 5 }) },
  ],
  script: [
    { targetType: 'voice',   label: 'Gerar Voz',       getParams: a => ({ script: String(a.input_params.script_text ?? ''), voice_id: 'EXAVITQu4vr4xnSDxMaL', speed: 1.0 }) },
  ],
  voice: [
    { targetType: 'caption', label: 'Gerar Legenda',   getParams: a => ({ audio_url: a.result_url }) },
  ],
}

interface Props {
  asset: StudioAsset
  stepNumber?: number
  onDelete: (id: string) => void
  onRetry: (id: string, type: AssetType, params: Record<string, unknown>) => void
  onGenerate: (type: AssetType, params: Record<string, unknown>, existingId: string) => void
  onUseAs: (targetType: AssetType, prefillParams: Record<string, unknown>) => void
}

export default function AssetCard({ asset, stepNumber, onDelete, onRetry, onGenerate, onUseAs }: Props) {
  const meta = TYPE_META[asset.type]
  const [collapsed, setCollapsed] = useState(asset.status === 'done')
  const useAsActions = USE_AS_ACTIONS[asset.type] ?? []

  function handleDownload() {
    if (!asset.result_url) return
    const a = document.createElement('a')
    a.href = asset.result_url
    a.download = `studio-${asset.type}-${asset.id.slice(0, 8)}`
    a.target = '_blank'
    a.click()
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <button
          onClick={() => setCollapsed(v => !v)}
          className={`flex items-center gap-2 text-sm font-medium ${meta.color}`}
        >
          {stepNumber !== undefined && (
            <span className="w-5 h-5 rounded-full bg-zinc-700 text-zinc-300 text-[10px] flex items-center justify-center font-bold shrink-0">
              {stepNumber}
            </span>
          )}
          {meta.icon}
          {meta.label}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
            {asset.credits_cost} cr
          </span>
          <button onClick={() => onDelete(asset.id)} className="text-zinc-600 hover:text-red-400 transition-colors p-1">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="flex-1 p-4">

        {/* Processing */}
        {asset.status === 'processing' && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 size={28} className="animate-spin text-accent" />
            <p className="text-sm text-zinc-400">Gerando com IA...</p>
            {asset.type === 'video' && (
              <p className="text-xs text-zinc-600 text-center">Vídeos levam até 3 minutos</p>
            )}
          </div>
        )}

        {/* Error */}
        {asset.status === 'error' && (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <p className="text-sm text-red-400 text-center">{asset.error_msg || 'Erro ao gerar'}</p>
            <button
              onClick={() => onRetry(asset.id, asset.type, asset.input_params)}
              className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white border border-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <RotateCcw size={13} /> Tentar novamente
            </button>
          </div>
        )}

        {/* Done — result preview */}
        {asset.status === 'done' && asset.result_url && (
          <div className="flex flex-col gap-3">
            <ResultPreview type={asset.type} url={asset.result_url} params={asset.input_params} />

            {/* Download (exceto script/caption que têm botões próprios) */}
            {asset.type !== 'script' && asset.type !== 'caption' && (
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-white border border-zinc-700 px-3 py-2 rounded-xl transition-colors w-full"
              >
                <Download size={13} /> Download
              </button>
            )}

            {/* Botões "Usar em..." */}
            {useAsActions.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-zinc-800 pt-3">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wide font-medium mb-1">Usar resultado em</p>
                {useAsActions.map(action => (
                  <button
                    key={action.targetType}
                    onClick={() => onUseAs(action.targetType, action.getParams(asset))}
                    className="flex items-center justify-between text-xs text-zinc-400 hover:text-accent border border-zinc-800 hover:border-accent/40 px-3 py-2 rounded-xl transition-all group"
                  >
                    {action.label}
                    <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Idle — show form */}
        {asset.status === 'idle' && !collapsed && (
          <FormForType
            type={asset.type}
            initialParams={asset.input_params}
            onGenerate={(params) => onGenerate(asset.type, params, asset.id)}
          />
        )}

        {/* Idle collapsed shortcut */}
        {asset.status === 'idle' && collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full text-xs text-zinc-500 hover:text-accent border border-dashed border-zinc-700 rounded-xl py-4 transition-colors"
          >
            Configurar e gerar
          </button>
        )}
      </div>
    </div>
  )
}

// ── Result preview by type ─────────────────────────────────────────────────
function ResultPreview({ type, url, params }: { type: AssetType; url: string; params: Record<string, unknown> }) {
  if (type === 'image' || type === 'upscale' || type === 'face') {
    return <img src={url} alt="Resultado" className="w-full rounded-xl object-cover max-h-64" />
  }
  if (type === 'video') {
    return <video src={url} controls className="w-full rounded-xl max-h-64" playsInline />
  }
  if (type === 'voice') {
    return <audio src={url} controls className="w-full" />
  }
  if (type === 'script') {
    return <ScriptPreview text={String(params.script_text ?? '')} url={url} />
  }
  if (type === 'caption') {
    return <CaptionPreview url={url} />
  }
  return null
}

// ── Script inline preview com copiar ──────────────────────────────────────
function ScriptPreview({ text, url }: { text: string; url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const content = text || await fetch(url).then(r => r.text()).catch(() => '')
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-zinc-800 rounded-xl p-3 text-xs text-zinc-300 whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
        {text || <span className="text-zinc-500 italic">Carregando script...</span>}
      </div>
      <button
        onClick={copy}
        className="flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-white border border-zinc-700 px-3 py-2 rounded-xl transition-colors w-full"
      >
        {copied ? <><Check size={13} className="text-emerald-400" /> Copiado!</> : <><Copy size={13} /> Copiar script</>}
      </button>
    </div>
  )
}

// ── Caption preview com download .srt ─────────────────────────────────────
function CaptionPreview({ url }: { url: string }) {
  const [srt, setSrt] = useState('')
  const [loaded, setLoaded] = useState(false)

  async function load() {
    if (loaded) return
    const text = await fetch(url).then(r => r.text()).catch(() => '')
    setSrt(text)
    setLoaded(true)
  }

  return (
    <div className="flex flex-col gap-2">
      <div onClick={load} className="bg-zinc-800 rounded-xl p-3 text-xs text-zinc-300 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed cursor-pointer">
        {srt || <span className="text-zinc-500 italic">Clique para visualizar a legenda</span>}
      </div>
      <a href={url} download className="flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-white border border-zinc-700 px-3 py-2 rounded-xl transition-colors w-full">
        <Download size={13} /> Baixar .srt
      </a>
    </div>
  )
}

// ── Form routing by type ───────────────────────────────────────────────────
function FormForType({ type, initialParams, onGenerate }: {
  type: AssetType
  initialParams: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}) {
  if (type === 'face')    return <FaceGenerator    initial={initialParams} onGenerate={onGenerate} />
  if (type === 'image')   return <ImageGenerator   initial={initialParams} onGenerate={onGenerate} />
  if (type === 'script')  return <ScriptGenerator  initial={initialParams} onGenerate={onGenerate} />
  if (type === 'voice')   return <VoiceGenerator   initial={initialParams} onGenerate={onGenerate} />
  if (type === 'video')   return <VideoGenerator   initial={initialParams} onGenerate={onGenerate} />
  if (type === 'caption') return <CaptionGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'upscale') return <UpscaleCard      initial={initialParams} onGenerate={onGenerate} />
  return null
}

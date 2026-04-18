'use client'

import { memo, useState, useEffect } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { Trash2, Download, RotateCcw, Loader2, Image, Video, Mic, ZoomIn, FileText, Captions, Copy, Check, ArrowRight, User, Film, Sparkles, Layers, Wand2, CopyPlus, Camera } from 'lucide-react'
import { StudioAsset, AssetType } from '@/types'
import FaceGenerator from '../FaceGenerator'
import JoinGenerator from '../JoinGenerator'
import ImageGenerator from '../ImageGenerator'
import ScriptGenerator from '../ScriptGenerator'
import VoiceGenerator from '../VoiceGenerator'
import VideoGenerator from '../VideoGenerator'
import CaptionGenerator from '../CaptionGenerator'
import UpscaleCard from '../UpscaleCard'
import ModelGenerator from '../ModelGenerator'
import RenderCard from '../RenderCard'
import AnimateGenerator from '../AnimateGenerator'
import ComposeCard from '../ComposeCard'
import LipsyncGenerator from '../LipsyncGenerator'
import AngleGenerator from '../AngleGenerator'

const TYPE_META: Record<AssetType, { icon: React.ReactNode; label: string; color: string; bg: string; hint: string; output: string }> = {
  face:    { icon: <User size={14} />,     label: 'Rosto Real (Upload)', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30', hint: 'Faça upload de uma foto', output: 'Foto salva →' },
  join:    { icon: <Film size={14} />,     label: 'Exportar MP4 Master', color: 'text-rose-400',   bg: 'bg-rose-500/10 border-rose-500/30',   hint: '← Conecte vídeos em ordem', output: 'MP4 Master →' },
  model:   { icon: <User size={14} />,     label: 'Modelo UGC',  color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30', hint: 'Gera foto do modelo', output: 'Foto do modelo →' },
  image:   { icon: <Image size={14} />,    label: 'Imagem',      color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/30', hint: 'Gera imagem com IA', output: 'Imagem gerada →' },
  video:   { icon: <Video size={14} />,    label: 'Vídeo',       color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30',   hint: '← Conecte imagem + áudio', output: 'Vídeo animado →' },
  voice:   { icon: <Mic size={14} />,      label: 'Voz',         color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/30', hint: '← Conecte o Script aqui', output: 'Áudio da voz →' },
  upscale: { icon: <ZoomIn size={14} />,   label: 'Upscale',     color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/30',  hint: '← Conecte imagem para melhorar', output: 'Imagem 4K →' },
  script:  { icon: <FileText size={14} />, label: 'Script',      color: 'text-pink-400',   bg: 'bg-pink-500/10 border-pink-500/30',    hint: 'Escreve a fala do modelo', output: 'Texto do script →' },
  caption: { icon: <Captions size={14} />, label: 'Legenda',     color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/30',    hint: '← Conecte o Áudio aqui', output: 'Legendas →' },
  render:  { icon: <Film size={14} />,     label: 'Vídeo Final', color: 'text-rose-400',   bg: 'bg-rose-500/10 border-rose-500/30',    hint: '← Conecte Vídeo + Voz → resultado final', output: '🎬 Vídeo com voz →' },
  animate: { icon: <Sparkles size={14} />, label: 'Imitar Movimentos', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10 border-fuchsia-500/30', hint: '← Envie foto do modelo + vídeo de referência', output: 'Vídeo animado →' },
  compose: { icon: <Layers size={14} />,   label: 'Fusão UGC',   color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30',   hint: '← Conecte Modelo + foto do produto → IA gera cena integrada', output: 'Cena gerada →' },
  lipsync: { icon: <Wand2 size={14} />,    label: 'Lip Sync',    color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/30',        hint: '← Conecte Vídeo + Voz', output: 'Vídeo sincronizado →' },
  angles:  { icon: <Camera size={14} />,   label: 'Ângulos (Trocar Posição)', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', hint: '← Conecte a Modelo ou Fusão', output: 'Novo Ângulo →' },
}

const INPUT_HANDLES: Partial<Record<AssetType, Array<{ id: string; label: string }>>> = {
  image:   [
    { id: 'model_prompt',      label: 'Modelo'    },
    { id: 'source_face_url',   label: 'Rosto'     }
  ],
  video:   [
    { id: 'source_image_url',   label: 'Imagem'    },
    { id: 'continuation_frame', label: 'Continuar' },
    { id: 'model_prompt',       label: 'Modelo'    },
    { id: 'audio_url',          label: 'Áudio'     },
  ],
  upscale: [{ id: 'source_url',       label: 'Imagem'    }],
  voice:   [{ id: 'script',           label: 'Script'    }],
  caption: [{ id: 'audio_url',        label: 'Áudio'     }],
  render:  [
    { id: 'source_image_url',   label: 'Vídeo'     },
    { id: 'audio_url',          label: 'Voz'       },
  ],
  animate: [
    { id: 'portrait_image_url', label: 'Retrato'      },
  ],
  compose: [
    { id: 'portrait_url',       label: 'Cena/Modelo'  },
  ],
  lipsync: [
    { id: 'face_url',           label: 'Vídeo/Rosto'  },
    { id: 'audio_url',          label: 'Áudio'        },
  ],
  join: [
    { id: 'video_0', label: 'Cena 1' },
    { id: 'video_1', label: 'Cena 2' },
    { id: 'video_2', label: 'Cena 3' },
    { id: 'video_3', label: 'Cena 4' },
    { id: 'video_4', label: 'Cena 5' },
    { id: 'video_5', label: 'Cena 6' },
  ],
  angles:  [{ id: 'source_url', label: 'Imagem/Modelo' }],
}

export interface AssetNodeData {
  asset: StudioAsset
  onDelete:       (id: string) => void
  onGenerate:     (type: AssetType, params: Record<string, unknown>, existingId: string) => void
  onUpdateParams: (id: string, params: Record<string, unknown>) => void
  onDuplicate:    (id: string) => void
  [key: string]: unknown
}

function AssetNode({ data }: NodeProps) {
  const { asset, onDelete, onGenerate, onUpdateParams, onDuplicate } = data as AssetNodeData
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
    <div className={`w-[360px] bg-zinc-950/90 backdrop-blur-md border ${asset.type === 'render' ? 'border-rose-500/40' : 'border-white/5'} rounded-[1.5rem] overflow-visible shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] group/node hover:ring-2 hover:ring-accent/20 transition-all duration-300 ${
      asset.isNew ? 'ring-4 ring-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.5)] animate-fire-pulse scale-[1.02]' : ''
    }`}>
      
      {/* Estilos para o Efeito de Fogo (Fire Highlight) */}
      <style jsx>{`
        @keyframes firePulse {
          0% { box-shadow: 0 0 20px rgba(249, 115, 22, 0.4); border-color: rgba(249, 115, 22, 0.6); }
          50% { box-shadow: 0 0 50px rgba(249, 115, 22, 0.8), 0 0 80px rgba(255, 69, 0, 0.3); border-color: rgba(255, 149, 0, 1); }
          100% { box-shadow: 0 0 20px rgba(249, 115, 22, 0.4); border-color: rgba(249, 115, 22, 0.6); }
        }
        .animate-fire-pulse {
          animation: firePulse 2s infinite ease-in-out;
          z-index: 100;
        }
      `}</style>

      {/* INPUT handles — esquerda com label visível */}
      {inputHandles.map((h, i) => (
        <div
          key={h.id}
          style={{ position: 'absolute', left: 0, top: `${48 + i * 28}px`, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', zIndex: 50, pointerEvents: 'none' }}
        >
          <Handle
            type="target"
            position={Position.Left}
            id={h.id}
            style={{ position: 'relative', left: 0, top: 0, transform: 'none', background: '#8b5cf6', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.2)', cursor: 'crosshair', pointerEvents: 'auto', boxShadow: '0 0 10px rgba(139, 92, 246, 0.4)' }}
            title={h.label}
          />
          <span className="ml-2 text-[10px] font-bold text-zinc-500 uppercase tracking-tighter bg-zinc-900/90 backdrop-blur px-2 py-0.5 rounded-md border border-white/5 pointer-events-none">
            {h.label}
          </span>
        </div>
      ))}

      {/* OUTPUT handle — direita */}
      <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', zIndex: 50, pointerEvents: 'none' }}>
        <span className="mr-2 text-[10px] font-bold text-orange-500/80 uppercase tracking-tighter bg-zinc-900/90 backdrop-blur px-2 py-0.5 rounded-md border border-orange-500/20 pointer-events-none">
          {meta.output}
        </span>
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{ position: 'relative', right: 0, top: 0, transform: 'none', background: '#f97316', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.2)', cursor: 'crosshair', pointerEvents: 'auto', boxShadow: '0 0 10px rgba(249, 115, 22, 0.4)' }}
          title={meta.output}
        />
      </div>

      {/* Header */}
      <div className={`relative flex items-center justify-between px-5 py-3 border-b border-white/5 rounded-t-[1.5rem] overflow-hidden`}>
        {/* Background Glow */}
        <div className={`absolute inset-0 opacity-20 bg-gradient-to-br from-zinc-800 via-transparent to-transparent`} />
        
        <button
          onClick={() => setCollapsed(v => !v)}
          className="relative flex flex-col items-start text-left z-10"
        >
          <span className={`flex items-center gap-2 text-[13px] font-bold tracking-tight ${meta.color}`}>
            <div className={`p-1.5 rounded-lg bg-white/5 border border-white/10`}>{meta.icon}</div>
            {meta.label}
          </span>
          <span className="text-[10px] text-zinc-500 font-medium mt-1 pl-9 opacity-70">{meta.hint}</span>
        </button>
        <div className="relative flex items-center gap-3 z-10">
          <span className="text-[10px] font-bold text-zinc-100 bg-white/5 border border-white/10 px-2 py-1 rounded-lg tabular-nums">{asset.credits_cost} CR</span>
          <div className="flex items-center gap-1.5 ml-1">
            <button onClick={() => onDuplicate(asset.id)} title="Duplicar card" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-all">
              <CopyPlus size={14} />
            </button>
            <button onClick={() => onDelete(asset.id)} title="Deletar card" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-all">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 nodrag">
        {asset.status === 'processing' && (
          <ProcessingCard type={asset.type} createdAt={asset.created_at} assetId={asset.id} />
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
            {asset.type === 'lipsync' && <LipsyncGenerator initial={asset.input_params} onGenerate={(p: any) => { onUpdateParams(asset.id, p); onGenerate(asset.type, p, asset.id) }} />}
            {asset.type !== 'script' && asset.type !== 'caption' && asset.type !== 'model' && asset.type !== 'lipsync' && (
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 hover:text-white border border-zinc-700 px-3 py-1.5 rounded-xl transition-colors w-full"
              >
                <Download size={12} /> Download
              </button>
            )}
            <NextStepHint type={asset.type} />
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

// ── Next Step Hint ────────────────────────────────────────────────────────────
const NEXT_STEPS: Partial<Record<AssetType, { icon: string; text: string; sub: string }>> = {
  model:   { icon: '🖼️', text: 'Adicione "Compor Cena"',    sub: 'Para incluir seu produto na imagem da modelo' },
  compose: { icon: '📝', text: 'Adicione "Script" + "Voz"', sub: 'Escreva o que ela vai falar e gere o áudio' },
  video:   { icon: '🎙️', text: 'Conecte uma "Voz" aqui',    sub: 'Arraste o ponto azul "Áudio" até a saída da Voz' },
  script:  { icon: '🎙️', text: 'Conecte ao card "Voz"',     sub: 'Arraste a saída deste Script para a entrada da Voz' },
  voice:   { icon: '🎬', text: 'Adicione "Vídeo Final"',    sub: 'Conecte Vídeo + Voz para gerar o anúncio completo' },
}

function NextStepHint({ type }: { type: AssetType }) {
  const hint = NEXT_STEPS[type]
  if (!hint) return null
  return (
    <div className="flex items-start gap-2 mt-1 px-2 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-xl">
      <span className="text-sm shrink-0 mt-0.5">{hint.icon}</span>
      <div>
        <p className="text-[10px] font-semibold text-zinc-300">{hint.text}</p>
        <p className="text-[9px] text-zinc-500 leading-relaxed mt-0.5">{hint.sub}</p>
      </div>
    </div>
  )
}

// ── Result previews ───────────────────────────────────────────────────────
function ResultPreview({ type, url, params }: { type: AssetType; url: string; params: Record<string, unknown> }) {
  if (type === 'model') return (
    <div className="flex flex-col gap-2">
      <img src={url} alt="Modelo UGC" className="w-full rounded-xl object-contain" />
      {!!params.model_text && (
        <div className="bg-zinc-800 border border-indigo-500/20 rounded-xl p-2.5">
          <p className="text-[10px] text-indigo-400 uppercase tracking-widest mb-1 font-medium">Descrição</p>
          <p className="text-[10px] text-zinc-400 leading-relaxed line-clamp-3">{String(params.model_text)}</p>
        </div>
      )}
    </div>
  )
  if (type === 'image' || type === 'upscale' || type === 'compose' || type === 'face') return <img src={url} alt="" className="w-full rounded-xl object-contain bg-black/20" />
  if (type === 'video' || type === 'render' || type === 'animate' || type === 'lipsync' || type === 'join') return <video src={url} controls className="w-full rounded-xl object-contain bg-black/20" playsInline />
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
  if (type === 'face')    return <FaceGenerator    initial={initialParams} onGenerate={onGenerate} />
  if (type === 'join')    return <JoinGenerator    initial={initialParams} onGenerate={onGenerate} />
  if (type === 'image')   return <ImageGenerator   initial={initialParams} onGenerate={onGenerate} />
  if (type === 'script')  return <ScriptGenerator  initial={initialParams} onGenerate={onGenerate} />
  if (type === 'voice')   return <VoiceGenerator   initial={initialParams} onGenerate={onGenerate} />
  if (type === 'video')   return <VideoGenerator   initial={initialParams} onGenerate={onGenerate} />
  if (type === 'caption') return <CaptionGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'upscale') return <UpscaleCard      initial={initialParams} onGenerate={onGenerate} />
  if (type === 'model')   return <ModelGenerator   initial={initialParams} onGenerate={onGenerate} />
  if (type === 'render')  return <RenderCard       initial={initialParams} onGenerate={onGenerate} />
  if (type === 'animate') return <AnimateGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'compose') return <ComposeCard      initial={initialParams} onGenerate={onGenerate} />
  if (type === 'lipsync') return <LipsyncGenerator initial={initialParams} onGenerate={onGenerate} />
  if (type === 'angles')  return <AngleGenerator   initial={initialParams} onGenerate={onGenerate} />
  return null
}
// ── Processing card com barra de progresso e timer ──────────────────────────────
const ESTIMATED: Partial<Record<AssetType, number>> = {
  video:   180, // 3 min
  animate: 90,  // 1.5 min
  model:   35,
  image:   20,
  voice:   10,
  script:  8,
  upscale: 25,
  caption: 15,
  compose: 20,
  render:  30,
  lipsync: 90,
}

const LABELS: Partial<Record<AssetType, string>> = {
  video:   'Animador Neural gerando movimentos...',
  animate: 'Reanimando características da modelo...',
  model:   'Fotógrafo Virtual criando modelo UGC...',
  image:   'Renderizando cena em alta definição...',
  voice:   'Sintetizando locução humana natural...',
  script:  'Roteirista de Alta Conversão redigindo...',
  upscale: 'Elevando nitidez para Ultra Resolução...',
  caption: 'Transcrevendo áudio em legendas dinâmicas...',
  compose: 'Integrando seu produto ao ambiente...',
  render:  'Processando corte final e áudio...',
  lipsync: 'Motor de Mapeamento sincronizando lábios...',
}

function ProcessingCard({ type, createdAt, assetId }: { type: AssetType; createdAt: string; assetId: string }) {
  const estimated = ESTIMATED[type] ?? 30
  const label     = LABELS[type] ?? 'Gerando com IA...'

  const [elapsed, setElapsed] = useState(() => {
    const start = new Date(createdAt).getTime()
    return Math.floor((Date.now() - start) / 1000)
  })
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  useEffect(() => {
    const t = setInterval(() => {
      const start = new Date(createdAt).getTime()
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [createdAt])

  // Progresso falso: vai até 90% suavemente, nunca termina antes do webhook
  const rawProgress = Math.min((elapsed / estimated) * 100, 90)
  const progress    = Math.round(rawProgress)
  const isStuck     = elapsed > estimated + 60 // +1 min de tolerância

  const remaining = Math.max(estimated - elapsed, 0)
  const fmt = (s: number) => s >= 60
    ? `${Math.floor(s / 60)}m ${s % 60}s`
    : `${s}s`

  async function syncNow() {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch(`/api/studio/assets/${assetId}/sync`, { method: 'POST' })
      const data = await res.json()
      if (data.status === 'done') {
        setSyncMsg('✅ Pronto! Recarregando...')
        setTimeout(() => window.location.reload(), 1500)
      } else if (data.status === 'error') {
        setSyncMsg(`❌ ${data.error}`)
        setTimeout(() => window.location.reload(), 2500)
      } else {
        setSyncMsg(`⏳ Status: ${data.status}`)
      }
    } catch {
      setSyncMsg('Erro ao verificar')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex items-center gap-2.5">
        <Loader2 size={15} className="animate-spin text-accent shrink-0" />
        <p className="text-[11px] text-zinc-300 font-medium leading-tight">{label}</p>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-fuchsia-500 rounded-full transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
        {/* Shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-600">{progress}%</span>
        <span className="text-[10px] text-zinc-600">
          {remaining > 0
            ? `~${fmt(remaining)} restante`
            : 'Aguardando confirmação...'}
        </span>
      </div>

      {/* Botão de sync manual quando travado */}
      {isStuck && (
        <div className="flex flex-col gap-1.5">
          <button
            onClick={syncNow}
            disabled={syncing}
            className="flex items-center justify-center gap-1.5 text-[10px] text-amber-400 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            {syncing
              ? <><Loader2 size={10} className="animate-spin" /> Verificando...</>
              : <><RotateCcw size={10} /> Forçar atualização de status</>}
          </button>
          {syncMsg && (
            <p className="text-[10px] text-zinc-400 text-center">{syncMsg}</p>
          )}
        </div>
      )}
    </div>
  )
}


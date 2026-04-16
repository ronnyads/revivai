'use client'

import { BookOpen, ShoppingBag, Film, Zap, Clock, X, User, FileText, Mic, Video, Wand2, Layers, Sparkles } from 'lucide-react'

// ── Definição dos Templates ──────────────────────────────────────────────────

export interface TemplateNode {
  type: string
  x: number
  y: number
  params: Record<string, unknown>
}

export interface TemplateEdge {
  source: number
  target: number
  sourceHandle: string
  targetHandle: string
}

export interface WorkflowTemplate {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  badge: string
  badgeColor: string
  estimatedTime: string
  credits: number
  nodes: TemplateNode[]
  edges: TemplateEdge[]
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // ── Template 1: Short de 30 Segundos ──────────────────────────────────────
  {
    id: 'story_30s',
    label: 'Série Viral (30s)',
    description: 'Workflow completo: Rosto + 3 Cenas (10s cada) + Voz + Edição Final. Costura tudo no automático.',
    icon: <Film size={20} />,
    badge: '🎬 Mais popular',
    badgeColor: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    estimatedTime: '~15 min',
    credits: 12,
    nodes: [
      // Coluna 0 — Rosto
      { type: 'face',   x: 60,   y: 100, params: { face_image_url: '' } },
      // Coluna 1 — Script & Voice
      { type: 'script', x: 460,  y: 100, params: { product: '', audience: '', format: 'reels', hook_style: 'problema', _placeholder: 'Descreva seu produto e público-alvo para a série...' } },
      { type: 'voice',  x: 460,  y: 560, params: { script: '', voice_id: 'EXAVITQu4vr4xnSDxMaL', speed: 1.0 } },
      // Coluna 2 — 3 Cenas de Imagem
      { type: 'image',  x: 860,  y: 100, params: { prompt: '', style: 'ugc', aspect_ratio: '9:16', _placeholder: 'Cena 1: O personagem aparece em um local incrível...' } },
      { type: 'image',  x: 860,  y: 560, params: { prompt: '', style: 'ugc', aspect_ratio: '9:16', _placeholder: 'Cena 2: Perto do produto, expressão de surpresa...' } },
      { type: 'image',  x: 860,  y: 1020, params: { prompt: '', style: 'ugc', aspect_ratio: '9:16', _placeholder: 'Cena 3: Fechamento, sorriso, chama para ação...' } },
      // Coluna 3 — 3 Vídeos (um por cena)
      { type: 'video',  x: 1260, y: 100,  params: { source_image_url: '', motion_prompt: 'câmera suave e natural, expressão animada', duration: 10 } },
      { type: 'video',  x: 1260, y: 560,  params: { source_image_url: '', motion_prompt: 'zoom suave no produto, iluminação dramática', duration: 10 } },
      { type: 'video',  x: 1260, y: 1020, params: { source_image_url: '', motion_prompt: 'personagem gesticula, aponta para câmera', duration: 10 } },
      // Coluna 4 — Costura (Join)
      { type: 'join',   x: 1660, y: 560,  params: { video_urls: [] } },
    ],
    edges: [
      // Face → 3 imagens
      { source: 0, target: 3, sourceHandle: 'output', targetHandle: 'source_face_url' },
      { source: 0, target: 4, sourceHandle: 'output', targetHandle: 'source_face_url' },
      { source: 0, target: 5, sourceHandle: 'output', targetHandle: 'source_face_url' },
      // Script → Voice
      { source: 1, target: 2, sourceHandle: 'output', targetHandle: 'script' },
      // Imagens → Vídeos
      { source: 3, target: 6, sourceHandle: 'output', targetHandle: 'source_image_url' },
      { source: 4, target: 7, sourceHandle: 'output', targetHandle: 'source_image_url' },
      { source: 5, target: 8, sourceHandle: 'output', targetHandle: 'source_image_url' },
      // Vídeos → Join
      { source: 6, target: 9, sourceHandle: 'output', targetHandle: 'video_0' },
      { source: 7, target: 9, sourceHandle: 'output', targetHandle: 'video_1' },
      { source: 8, target: 9, sourceHandle: 'output', targetHandle: 'video_2' },
    ],
  },

  // ── Template 2: Anúncio de Produto ────────────────────────────────────────
  {
    id: 'product_ad',
    label: 'Anúncio de Produto',
    description: 'Modelo UGC gerado por IA segurando seu produto. Script + Voz + Vídeo em linha reta.',
    icon: <ShoppingBag size={20} />,
    badge: '🛍️ E-commerce',
    badgeColor: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    estimatedTime: '~8 min',
    credits: 8,
    nodes: [
      { type: 'model',   x: 60,   y: 240, params: { gender: 'feminino', age_range: '25-35', skin_tone: 'media', body_type: 'normal', style: 'casual' } },
      { type: 'script',  x: 460,  y: 60,  params: { product: '', audience: '', format: 'reels', hook_style: 'beneficio', _placeholder: 'Descreva seu produto (ex: Whey Protein sabor morango)...' } },
      { type: 'image',   x: 460,  y: 520, params: { prompt: '', style: 'ugc', aspect_ratio: '9:16', _placeholder: 'Modelo segurando o produto com sorriso natural...' } },
      { type: 'voice',   x: 860,  y: 60,  params: { script: '', voice_id: 'EXAVITQu4vr4xnSDxMaL', speed: 1.0 } },
      { type: 'compose', x: 860,  y: 520, params: { portrait_url: '', product_url: '', position: 'southeast', product_scale: 0.35 } },
      { type: 'video',   x: 1260, y: 280, params: { source_image_url: '', motion_prompt: 'movimento suave, exibe produto com confiança', duration: 5 } },
      { type: 'render',  x: 1660, y: 280, params: { source_image_url: '', audio_url: '' } },
    ],
    edges: [
      { source: 0, target: 2, sourceHandle: 'output', targetHandle: 'model_prompt' },
      { source: 1, target: 3, sourceHandle: 'output', targetHandle: 'script' },
      { source: 2, target: 4, sourceHandle: 'output', targetHandle: 'portrait_url' },
      { source: 4, target: 5, sourceHandle: 'output', targetHandle: 'source_image_url' },
      { source: 5, target: 6, sourceHandle: 'output', targetHandle: 'source_image_url' },
      { source: 3, target: 6, sourceHandle: 'output', targetHandle: 'audio_url' },
    ],
  },

  // ── Template 3: Lip Sync Rápido ───────────────────────────────────────────
  {
    id: 'lipsync_quick',
    label: 'Lip Sync Expresso',
    description: 'Gere um vídeo com Lip Sync em 3 passos: Modelo → Voz → Sincroniza.',
    icon: <Wand2 size={20} />,
    badge: '⚡ Mais rápido',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    estimatedTime: '~5 min',
    credits: 5,
    nodes: [
      { type: 'face',    x: 60,   y: 280, params: { face_image_url: '' } },
      { type: 'script',  x: 460,  y: 60,  params: { product: '', audience: '', format: 'reels', hook_style: 'problema', _placeholder: 'Escreva o que o personagem vai falar...' } },
      { type: 'voice',   x: 460,  y: 520, params: { script: '', voice_id: 'EXAVITQu4vr4xnSDxMaL', speed: 1.0 } },
      { type: 'lipsync', x: 860,  y: 280, params: { face_url: '', audio_url: '' } },
    ],
    edges: [
      { source: 1, target: 2, sourceHandle: 'output', targetHandle: 'script' },
      { source: 0, target: 3, sourceHandle: 'output', targetHandle: 'face_url' },
      { source: 2, target: 3, sourceHandle: 'output', targetHandle: 'audio_url' },
    ],
  },
]

// ── Ícone por tipo ────────────────────────────────────────────────────────────
const TYPE_ICON: Record<string, React.ReactNode> = {
  face:    <User size={10} />,
  model:   <User size={10} />,
  script:  <FileText size={10} />,
  voice:   <Mic size={10} />,
  image:   <Film size={10} />,
  video:   <Video size={10} />,
  lipsync: <Wand2 size={10} />,
  compose: <Layers size={10} />,
  animate: <Sparkles size={10} />,
  render:  <Film size={10} />,
}

const TYPE_COLOR: Record<string, string> = {
  face:    'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  model:   'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  script:  'bg-pink-500/20 text-pink-400 border-pink-500/30',
  voice:   'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  image:   'bg-violet-500/20 text-violet-400 border-violet-500/30',
  video:   'bg-blue-500/20 text-blue-400 border-blue-500/30',
  lipsync: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  compose: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  animate: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
  render:  'bg-rose-500/20 text-rose-400 border-rose-500/30',
}

// ── Componente da Galeria ────────────────────────────────────────────────────
interface Props {
  onSelect: (template: WorkflowTemplate) => void
  onFree:   () => void
  onWizard: () => void
}

export default function TemplateGallery({ onSelect, onFree, onWizard }: Props) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm z-30 p-6 overflow-auto">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent text-xs px-3 py-1 rounded-full mb-3">
            <Zap size={11} /> Escolha como quer criar
          </div>
          <h2 className="text-2xl font-bold text-white">O que você quer fazer hoje?</h2>
          <p className="text-sm text-zinc-500 mt-1">Escolha um template ou monte do zero</p>
        </div>

        {/* Templates grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {WORKFLOW_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl)}
              className="group relative bg-zinc-900 border border-zinc-700 hover:border-accent/50 rounded-2xl p-5 text-left transition-all hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-0.5 flex flex-col"
            >
              {/* Badge */}
              <span className={`self-start text-[10px] font-semibold px-2 py-0.5 rounded-full border mb-3 ${tpl.badgeColor}`}>
                {tpl.badge}
              </span>

              {/* Icon + label */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-accent">{tpl.icon}</span>
                <span className="text-sm font-bold text-white">{tpl.label}</span>
              </div>

              {/* Description */}
              <p className="text-xs text-zinc-500 leading-relaxed mb-4 flex-1">{tpl.description}</p>

              {/* Node preview chips */}
              <div className="flex flex-wrap gap-1 mb-4">
                {tpl.nodes.map((n, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border font-medium ${TYPE_COLOR[n.type] ?? 'bg-zinc-700 text-zinc-400'}`}
                  >
                    {TYPE_ICON[n.type]}
                    {n.type}
                  </span>
                ))}
              </div>

              {/* Footer stats */}
              <div className="flex items-center justify-between text-[10px] text-zinc-600 border-t border-zinc-800 pt-3">
                <span className="flex items-center gap-1"><Clock size={10} /> {tpl.estimatedTime}</span>
                <span>{tpl.credits} créditos estimados</span>
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl bg-accent/0 group-hover:bg-accent/3 transition-all pointer-events-none" />
            </button>
          ))}
        </div>

        {/* Manual options */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-xs text-zinc-600">ou comece do zero</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>
        <div className="flex items-center justify-center gap-3 mt-3">
          <button
            onClick={onWizard}
            className="flex items-center gap-2 text-xs text-fuchsia-400 hover:text-fuchsia-300 border border-fuchsia-500/30 hover:border-fuchsia-500/60 bg-fuchsia-500/5 px-4 py-2.5 rounded-xl transition-all"
          >
            <Wand2 size={13} /> Campaign Builder guiado
          </button>
          <button
            onClick={onFree}
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 bg-zinc-800/50 px-4 py-2.5 rounded-xl transition-all"
          >
            <BookOpen size={13} /> Canvas em branco
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import {
  BookOpen,
  Clock,
  Film,
  FileText,
  Layers,
  Mic,
  ShoppingBag,
  Sparkles,
  User,
  Video,
  Wand2,
  Zap,
} from 'lucide-react'

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
  {
    id: 'story_60s',
    label: 'Serie Viral (60s)',
    description: 'Workflow grande: rosto, seis cenas, voz e edicao final em um unico fluxo vertical.',
    icon: <Film size={20} />,
    badge: 'Blockbuster',
    badgeColor: 'border-orange-500/20 bg-orange-500/10 text-orange-300',
    estimatedTime: '~25 min',
    credits: 24,
    nodes: [
      { type: 'face', x: 60, y: 100, params: { face_image_url: '' } },
      { type: 'script', x: 460, y: 100, params: { product: '', audience: '', format: 'reels', hook_style: 'problema', _placeholder: 'Descreva seu produto e publico-alvo para a serie...' } },
      { type: 'voice', x: 460, y: 1020, params: { script: '', voice_id: 'EXAVITQu4vr4xnSDxMaL', speed: 1.0 } },
      { type: 'image', x: 860, y: 100, params: { prompt: '', style: 'ugc', aspect_ratio: '9:16', _placeholder: 'Cena 1: introducao...' } },
      { type: 'image', x: 860, y: 560, params: { prompt: '', style: 'ugc', aspect_ratio: '9:16', _placeholder: 'Cena 2: ponto de dor...' } },
      { type: 'image', x: 860, y: 1020, params: { prompt: '', style: 'ugc', aspect_ratio: '9:16', _placeholder: 'Cena 3: virada...' } },
      { type: 'image', x: 860, y: 1480, params: { prompt: '', style: 'ugc', aspect_ratio: '9:16', _placeholder: 'Cena 4: apresentando solucao...' } },
      { type: 'image', x: 860, y: 1940, params: { prompt: '', style: 'ugc', aspect_ratio: '9:16', _placeholder: 'Cena 5: beneficio claro...' } },
      { type: 'image', x: 860, y: 2400, params: { prompt: '', style: 'ugc', aspect_ratio: '9:16', _placeholder: 'Cena 6: call to action...' } },
      { type: 'video', x: 1260, y: 100, params: { source_image_url: '', motion_prompt: 'camera suave e natural', duration: 10 } },
      { type: 'video', x: 1260, y: 560, params: { source_image_url: '', motion_prompt: 'zoom in no rosto', duration: 10 } },
      { type: 'video', x: 1260, y: 1020, params: { source_image_url: '', motion_prompt: 'gesticula levemente', duration: 10 } },
      { type: 'video', x: 1260, y: 1480, params: { source_image_url: '', motion_prompt: 'sorriso de confianca', duration: 10 } },
      { type: 'video', x: 1260, y: 1940, params: { source_image_url: '', motion_prompt: 'mostrando o ambiente ao redor', duration: 10 } },
      { type: 'video', x: 1260, y: 2400, params: { source_image_url: '', motion_prompt: 'apontando para baixo', duration: 10 } },
      { type: 'join', x: 1660, y: 1020, params: { video_urls: [] } },
    ],
    edges: [
      { source: 0, target: 3, sourceHandle: 'output', targetHandle: 'source_face_url' },
      { source: 0, target: 4, sourceHandle: 'output', targetHandle: 'source_face_url' },
      { source: 0, target: 5, sourceHandle: 'output', targetHandle: 'source_face_url' },
      { source: 0, target: 6, sourceHandle: 'output', targetHandle: 'source_face_url' },
      { source: 0, target: 7, sourceHandle: 'output', targetHandle: 'source_face_url' },
      { source: 0, target: 8, sourceHandle: 'output', targetHandle: 'source_face_url' },
      { source: 1, target: 2, sourceHandle: 'output', targetHandle: 'script' },
      { source: 3, target: 9, sourceHandle: 'output', targetHandle: 'source_image_url' },
      { source: 4, target: 10, sourceHandle: 'output', targetHandle: 'source_image_url' },
      { source: 5, target: 11, sourceHandle: 'output', targetHandle: 'source_image_url' },
      { source: 6, target: 12, sourceHandle: 'output', targetHandle: 'source_image_url' },
      { source: 7, target: 13, sourceHandle: 'output', targetHandle: 'source_image_url' },
      { source: 8, target: 14, sourceHandle: 'output', targetHandle: 'source_image_url' },
      { source: 9, target: 15, sourceHandle: 'output', targetHandle: 'video_0' },
      { source: 10, target: 15, sourceHandle: 'output', targetHandle: 'video_1' },
      { source: 11, target: 15, sourceHandle: 'output', targetHandle: 'video_2' },
      { source: 12, target: 15, sourceHandle: 'output', targetHandle: 'video_3' },
      { source: 13, target: 15, sourceHandle: 'output', targetHandle: 'video_4' },
      { source: 14, target: 15, sourceHandle: 'output', targetHandle: 'video_5' },
    ],
  },
  {
    id: 'product_ad',
    label: 'Anuncio de Produto',
    description: 'Modelo UGC gerado por IA segurando seu produto, com script, voz e video em linha reta.',
    icon: <ShoppingBag size={20} />,
    badge: 'E-commerce',
    badgeColor: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
    estimatedTime: '~8 min',
    credits: 8,
    nodes: [
      { type: 'model', x: 60, y: 240, params: { gender: 'feminino', age_range: '25-35', skin_tone: 'media', body_type: 'normal', style: 'casual' } },
      { type: 'script', x: 460, y: 60, params: { product: '', audience: '', format: 'reels', hook_style: 'beneficio', _placeholder: 'Descreva seu produto...' } },
      { type: 'image', x: 460, y: 520, params: { prompt: '', style: 'ugc', aspect_ratio: '9:16', _placeholder: 'Modelo segurando o produto com sorriso natural...' } },
      { type: 'voice', x: 860, y: 60, params: { script: '', voice_id: 'EXAVITQu4vr4xnSDxMaL', speed: 1.0 } },
      { type: 'compose', x: 860, y: 520, params: { portrait_url: '', product_url: '', position: 'southeast', product_scale: 0.35 } },
      { type: 'video', x: 1260, y: 280, params: { source_image_url: '', motion_prompt: 'movimento suave, exibe produto com confianca', duration: 5 } },
      { type: 'render', x: 1660, y: 280, params: { source_image_url: '', audio_url: '' } },
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
  {
    id: 'lipsync_quick',
    label: 'Lip Sync Expresso',
    description: 'Video falado em tres passos: modelo, voz e sincronizacao final.',
    icon: <Wand2 size={20} />,
    badge: 'Mais rapido',
    badgeColor: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    estimatedTime: '~5 min',
    credits: 5,
    nodes: [
      { type: 'face', x: 60, y: 280, params: { face_image_url: '' } },
      { type: 'script', x: 460, y: 60, params: { product: '', audience: '', format: 'reels', hook_style: 'problema', _placeholder: 'Escreva o que o personagem vai falar...' } },
      { type: 'voice', x: 460, y: 520, params: { script: '', voice_id: 'EXAVITQu4vr4xnSDxMaL', speed: 1.0 } },
      { type: 'lipsync', x: 860, y: 280, params: { face_url: '', audio_url: '' } },
    ],
    edges: [
      { source: 1, target: 2, sourceHandle: 'output', targetHandle: 'script' },
      { source: 0, target: 3, sourceHandle: 'output', targetHandle: 'face_url' },
      { source: 2, target: 3, sourceHandle: 'output', targetHandle: 'audio_url' },
    ],
  },
]

const TYPE_ICON: Record<string, React.ReactNode> = {
  face: <User size={10} />,
  model: <User size={10} />,
  script: <FileText size={10} />,
  voice: <Mic size={10} />,
  image: <Film size={10} />,
  video: <Video size={10} />,
  lipsync: <Wand2 size={10} />,
  compose: <Layers size={10} />,
  animate: <Sparkles size={10} />,
  render: <Film size={10} />,
  join: <Layers size={10} />,
}

const TYPE_COLOR: Record<string, string> = {
  face: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
  model: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
  script: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  voice: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  image: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
  video: 'border-blue-500/20 bg-blue-500/10 text-blue-300',
  lipsync: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
  compose: 'border-orange-500/20 bg-orange-500/10 text-orange-300',
  animate: 'border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-300',
  render: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
  join: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-300',
}

interface Props {
  onSelect: (template: WorkflowTemplate) => void
  onFree: () => void
  onWizard: () => void
}

export default function TemplateGallery({ onSelect, onFree, onWizard }: Props) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center overflow-auto bg-[#090909]/92 p-6 backdrop-blur-md">
      <div className="w-full max-w-5xl">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#54D6F6]/20 bg-[#0C171A] px-3 py-1 font-label text-[10px] uppercase tracking-[0.24em] text-[#54D6F6]">
            <Zap size={11} /> escolha como quer criar
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-white">O que voce quer fazer hoje?</h2>
          <p className="mt-2 text-sm text-[#8FA7AD]">Escolha um template premium ou comece um canvas em branco.</p>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {WORKFLOW_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="group relative flex flex-col rounded-[28px] border border-white/10 bg-[#111111] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[#54D6F6]/30 hover:shadow-[0_24px_60px_rgba(84,214,246,0.10)]"
            >
              <span className={`mb-3 self-start rounded-full border px-2 py-0.5 text-[10px] font-medium ${template.badgeColor}`}>
                {template.badge}
              </span>

              <div className="mb-2 flex items-center gap-2">
                <span className="text-[#54D6F6]">{template.icon}</span>
                <span className="text-sm font-semibold text-white">{template.label}</span>
              </div>

              <p className="mb-4 flex-1 text-xs leading-relaxed text-[#8FA7AD]">{template.description}</p>

              <div className="mb-4 flex flex-wrap gap-1">
                {template.nodes.map((node, index) => (
                  <span
                    key={`${template.id}-${index}`}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium ${TYPE_COLOR[node.type] ?? 'border-zinc-500/20 bg-zinc-500/10 text-zinc-300'}`}
                  >
                    {TYPE_ICON[node.type]}
                    {node.type}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-white/6 pt-3 text-[10px] text-[#65757A]">
                <span className="flex items-center gap-1"><Clock size={10} /> {template.estimatedTime}</span>
                <span>{template.credits} creditos estimados</span>
              </div>

              <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[#54D6F6]/0 transition-all group-hover:bg-[#54D6F6]/[0.03]" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/8" />
          <span className="font-label text-[10px] uppercase tracking-[0.24em] text-[#65757A]">ou comece do zero</span>
          <div className="h-px flex-1 bg-white/8" />
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            onClick={onWizard}
            className="flex items-center gap-2 rounded-xl border border-[#54D6F6]/20 bg-[#0C171A] px-4 py-2.5 text-xs text-[#54D6F6] transition-all hover:border-[#54D6F6]/40 hover:text-white"
          >
            <Wand2 size={13} /> Campaign Builder guiado
          </button>
          <button
            onClick={onFree}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-zinc-300 transition-all hover:border-white/20 hover:text-white"
          >
            <BookOpen size={13} /> Canvas em branco
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useRef } from 'react'
import { Sparkles, MapPin, Image as ImageIcon, Camera, Maximize, Upload, Loader2 } from 'lucide-react'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const SCENE_PRESETS = [
  { id: 'eiffel_paris',    label: 'Torre Eiffel',   prompt: 'standing in front of the Eiffel Tower in Paris, golden hour light, iconic landmark clearly visible, romantic Parisian atmosphere' },
  { id: 'times_square',    label: 'Times Square',   prompt: 'walking through Times Square New York at night, iconic neon billboards and city lights bokeh, vibrant urban energy' },
  { id: 'dubai_burj',      label: 'Dubai Burj',     prompt: 'on a luxury rooftop in Dubai with the Burj Khalifa visible in the background, golden sunset, panoramic skyline' },
  { id: 'santorini',       label: 'Santorini',      prompt: 'in Santorini Greece, white-washed buildings with blue domes, crystal blue Aegean Sea, golden Mediterranean light' },
  { id: 'tokyo_shibuya',   label: 'Tóquio',         prompt: 'at Shibuya crossing in Tokyo at night, colorful neon lights, dynamic Japanese street atmosphere' },
  { id: 'london_big_ben',  label: 'Londres',        prompt: 'near Big Ben and the Thames River in London, classic British architecture, cloudy dramatic sky, elegant European setting' },
  { id: 'maldives_beach',  label: 'Maldivas',       prompt: 'standing on a pristine white sand beach in the Maldives, crystal turquoise water, overwater bungalows in background, tropical paradise' },
  { id: 'rome_colosseum',  label: 'Roma',           prompt: 'near the Colosseum in Rome Italy, ancient architecture, warm afternoon Mediterranean light, historical atmosphere' },
  { id: 'cafe_paris',      label: 'Café Paris',     prompt: 'sitting at a cozy Parisian café terrace, golden hour sunlight, Eiffel Tower softly visible in the background' },
  { id: 'luxury_hotel',    label: 'Hotel Luxo',     prompt: 'in a luxury 5-star hotel lobby, marble floors, chandelier lighting, elegant and sophisticated atmosphere' },
  { id: 'studio_clean',    label: 'Fundo Limpo',    prompt: 'in a clean minimal photo studio, soft studio lighting, neutral grey gradient background, professional shoot' },
  { id: 'nature_forest',   label: 'Natureza',       prompt: 'standing in a lush green forest, dappled sunlight through trees, fresh natural environment' },
]

export default function SceneGenerator({ initial, onGenerate }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [customScene, setCustomScene]       = useState(String(initial.scene_prompt ?? ''))
  const [aspectRatio, setAspectRatio]       = useState(String(initial.aspect_ratio ?? '9:16'))
  const [uploadedUrl, setUploadedUrl]       = useState<string | null>(null)
  const [uploading, setUploading]           = useState(false)
  const fileRef                             = useRef<HTMLInputElement>(null)

  const sourceUrl = (uploadedUrl || initial.source_url) as string
  const resultUrl = initial.url as string

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('bucket', 'studio')
      const res = await fetch('/api/studio/upload', { method: 'POST', body: form })
      const { url } = await res.json()
      if (url) setUploadedUrl(url)
    } catch { /* silencioso */ } finally {
      setUploading(false)
    }
  }

  const activePrompt = selectedPreset
    ? (SCENE_PRESETS.find(p => p.id === selectedPreset)?.prompt ?? customScene)
    : customScene

  if (resultUrl) {
    return (
      <div className="flex flex-col gap-4">
        <div className="relative group">
          <div className="absolute -top-2 -left-2 z-10 bg-violet-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-violet-400/50 flex items-center gap-1">
            <Sparkles size={10} /> CENA GERADA
          </div>
          <div className={`${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'} w-full rounded-2xl overflow-hidden border-2 border-violet-500/30 bg-zinc-900 shadow-2xl`}>
            <img src={resultUrl} alt="Result" className="w-full h-full object-cover" />
          </div>
        </div>
        <a href={resultUrl} download target="_blank"
          className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 transition-all">
          <Maximize size={14} /> ABRIR EM TELA CHEIA
        </a>
        <button
          onClick={() => onGenerate({ source_url: sourceUrl, scene_prompt: activePrompt, aspect_ratio: aspectRatio })}
          className="text-[10px] text-zinc-500 hover:text-violet-400 font-bold transition-colors uppercase tracking-widest text-center">
          Gerar outra variação
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Source preview */}
      <div className="relative group">
        <div className="absolute -top-2 -left-2 z-10 bg-violet-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-violet-400/50 flex items-center gap-1">
          <ImageIcon size={10} /> MODELO FONTE
        </div>
        {sourceUrl ? (
          <div className={`${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'} w-full rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/50 shadow-inner group-hover:border-violet-500/30 transition-all`}>
            <img src={sourceUrl} alt="Source" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
              <span className="text-[10px] text-zinc-400 font-medium">Pronta para nova cena</span>
            </div>
          </div>
        ) : (
          <div className={`${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'} w-full rounded-2xl border-2 border-dashed border-white/5 bg-white/5 flex flex-col items-center justify-center gap-3 p-6 text-center`}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-zinc-600">
              <Camera size={24} />
            </div>
            <p className="text-xs font-semibold text-zinc-400">Conecte um Modelo ou Fusão</p>
            <p className="text-[10px] text-zinc-600">Arraste a saída do card para cá</p>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/30 text-[10px] font-bold text-zinc-400 hover:text-white transition-all disabled:opacity-50"
            >
              {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
              {uploading ? 'Enviando...' : 'Upload do PC / Celular'}
            </button>
          </div>
        )}
      </div>

      {/* Aspect ratio */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
          <Maximize size={10} className="text-violet-500" /> Proporção
        </label>
        <div className="flex bg-zinc-900 border border-white/5 p-0.5 rounded-lg gap-0.5">
          {[{ id: '9:16', label: '9:16' }, { id: '1:1', label: '1:1' }, { id: '4:5', label: '4:5' }].map(opt => (
            <button key={opt.id} onClick={() => setAspectRatio(opt.id)}
              className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${aspectRatio === opt.id ? 'bg-zinc-800 text-white border border-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preset scenes */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
          <MapPin size={10} className="text-violet-500" /> Cenários Prontos
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {SCENE_PRESETS.map(preset => (
            <button key={preset.id}
              onClick={() => { setSelectedPreset(selectedPreset === preset.id ? null : preset.id); if (selectedPreset !== preset.id) setCustomScene('') }}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-center transition-all ${
                selectedPreset === preset.id
                  ? 'bg-violet-500/10 border-violet-500/50 ring-1 ring-violet-500/20'
                  : 'bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/10'
              }`}>
              <span className={`text-[9px] font-bold leading-tight text-center ${selectedPreset === preset.id ? 'text-white' : 'text-zinc-400'}`}>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom scene */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
          <Sparkles size={10} className="text-violet-500" /> Cena Personalizada
        </label>
        <textarea
          value={customScene}
          onChange={e => { setCustomScene(e.target.value); setSelectedPreset(null) }}
          placeholder="Ex: numa cobertura em Dubai ao entardecer, vista panorâmica da cidade iluminada..."
          rows={3}
          className="nodrag w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
        />
      </div>

      {/* Generate */}
      <button
        disabled={!sourceUrl || !activePrompt.trim()}
        onClick={() => onGenerate({ source_url: sourceUrl, scene_prompt: activePrompt, aspect_ratio: aspectRatio })}
        className={`relative mt-1 w-full py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all overflow-hidden group/btn ${
          !sourceUrl || !activePrompt.trim()
            ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            : 'bg-violet-600 text-white hover:bg-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-95'
        }`}>
        <Sparkles size={14} />
        COLOCAR NA CENA
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
      </button>
      <p className="text-[9px] text-zinc-600 text-center font-medium">Preserva identidade, rosto e roupa 100%</p>
    </div>
  )
}

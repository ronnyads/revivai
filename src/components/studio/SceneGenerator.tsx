'use client'

import { useState, useId } from 'react'
import { Sparkles, MapPin, Image as ImageIcon, Camera, Maximize, Upload, Loader2, X, Plus } from 'lucide-react'

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

const MAX_EXTRA = 5

export default function SceneGenerator({ initial, onGenerate }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [customScene, setCustomScene]       = useState(String(initial.scene_prompt ?? ''))
  const [aspectRatio, setAspectRatio]       = useState(String(initial.aspect_ratio ?? '9:16'))
  const [uploadedUrl, setUploadedUrl]       = useState<string | null>(null)
  const [extraUrls, setExtraUrls]           = useState<string[]>([])
  const [uploading, setUploading]           = useState(false)
  const [uploadingExtra, setUploadingExtra] = useState(false)
  const primaryUploadId                     = useId()
  const extraUploadId                       = useId()

  const sourceUrl = (uploadedUrl || initial.source_url) as string
  const resultUrl = initial.url as string

  async function uploadFile(file: File, onDone: (url: string) => void, setLoading: (v: boolean) => void) {
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('bucket', 'studio')
      const res = await fetch('/api/studio/upload', { method: 'POST', body: form })
      const { url } = await res.json()
      if (url) onDone(url)
    } catch { /* silencioso */ } finally {
      setLoading(false)
    }
  }

  const activePrompt = selectedPreset
    ? (SCENE_PRESETS.find(p => p.id === selectedPreset)?.prompt ?? customScene)
    : customScene

  const allSourceUrls = [sourceUrl, ...extraUrls].filter(Boolean)

  function handleGenerate() {
    onGenerate({
      source_url: sourceUrl,
      extra_source_urls: extraUrls,
      scene_prompt: activePrompt,
      aspect_ratio: aspectRatio,
    })
  }

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
          onClick={handleGenerate}
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
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-zinc-600">
              <Camera size={24} />
            </div>
            <p className="text-xs font-semibold text-zinc-400">Conecte um Modelo ou Fusão</p>
            <p className="text-[10px] text-zinc-600">Arraste a saída do card para cá</p>
            <label
              htmlFor={primaryUploadId}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/30 text-[10px] font-bold text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
              {uploading ? 'Enviando...' : 'Upload do PC / Celular'}
            </label>
            <input
              id={primaryUploadId}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0], setUploadedUrl, setUploading)}
            />
          </div>
        )}
      </div>

      {/* Extra references — always visible when source exists */}
      {sourceUrl && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
            <Plus size={10} className="text-violet-500" /> Fotos Extras de Referência
            <span className="ml-auto text-zinc-600 normal-case font-normal">{extraUrls.length}/{MAX_EXTRA} · melhora fidelidade</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {extraUrls.map((url, i) => (
              <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-white/10">
                <img src={url} alt={`ref ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => setExtraUrls(prev => prev.filter((_, j) => j !== i))}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                >
                  <X size={8} />
                </button>
              </div>
            ))}
            {extraUrls.length < MAX_EXTRA && (
              <>
                <label
                  htmlFor={extraUploadId}
                  className="w-14 h-14 rounded-lg border-2 border-dashed border-white/10 hover:border-violet-500/40 bg-white/3 flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors"
                >
                  {uploadingExtra
                    ? <Loader2 size={14} className="text-zinc-500 animate-spin" />
                    : <><Plus size={14} className="text-zinc-500" /><span className="text-[8px] text-zinc-600 font-bold">ADD</span></>
                  }
                </label>
                <input
                  id={extraUploadId}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && uploadFile(
                    e.target.files[0],
                    url => setExtraUrls(prev => [...prev, url]),
                    setUploadingExtra
                  )}
                />
              </>
            )}
          </div>
        </div>
      )}

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
        onClick={handleGenerate}
        className={`relative mt-1 w-full py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all overflow-hidden group/btn ${
          !sourceUrl || !activePrompt.trim()
            ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            : 'bg-violet-600 text-white hover:bg-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-95'
        }`}>
        <Sparkles size={14} />
        {allSourceUrls.length > 1 ? `COLOCAR NA CENA · ${allSourceUrls.length} REFERÊNCIAS` : 'COLOCAR NA CENA'}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
      </button>
      <p className="text-[9px] text-zinc-600 text-center font-medium">Preserva identidade, rosto e roupa 100%</p>
    </div>
  )
}

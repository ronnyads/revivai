'use client'

import { useState, useId } from 'react'
import { Sparkles, MapPin, Image as ImageIcon, Camera, Maximize, Upload, Loader2, X, Plus } from 'lucide-react'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const SCENE_PRESETS = [
  { id: 'eiffel_paris', label: 'Torre Eiffel', prompt: 'standing in front of the Eiffel Tower in Paris, golden hour light, iconic landmark clearly visible, romantic Parisian atmosphere' },
  { id: 'times_square', label: 'Times Square', prompt: 'walking through Times Square New York at night, iconic neon billboards and city lights bokeh, vibrant urban energy' },
  { id: 'dubai_burj', label: 'Dubai Burj', prompt: 'on a luxury rooftop in Dubai with the Burj Khalifa visible in the background, golden sunset, panoramic skyline' },
  { id: 'santorini', label: 'Santorini', prompt: 'in Santorini Greece, white-washed buildings with blue domes, crystal blue Aegean Sea, golden Mediterranean light' },
  { id: 'tokyo_shibuya', label: 'Tóquio', prompt: 'at Shibuya crossing in Tokyo at night, colorful neon lights, dynamic Japanese street atmosphere' },
  { id: 'london_big_ben', label: 'Londres', prompt: 'near Big Ben and the Thames River in London, classic British architecture, cloudy dramatic sky, elegant European setting' },
  { id: 'maldives_beach', label: 'Maldivas', prompt: 'standing on a pristine white sand beach in the Maldives, crystal turquoise water, overwater bungalows in background, tropical paradise' },
  { id: 'rome_colosseum', label: 'Roma', prompt: 'near the Colosseum in Rome Italy, ancient architecture, warm afternoon Mediterranean light, historical atmosphere' },
  { id: 'cafe_paris', label: 'Café Paris', prompt: 'sitting at a cozy Parisian café terrace, golden hour sunlight, Eiffel Tower softly visible in the background' },
  { id: 'luxury_hotel', label: 'Hotel Luxo', prompt: 'in a luxury 5-star hotel lobby, marble floors, chandelier lighting, elegant and sophisticated atmosphere' },
  { id: 'studio_clean', label: 'Fundo Limpo', prompt: 'in a clean minimal photo studio, soft studio lighting, neutral grey gradient background, professional shoot' },
  { id: 'nature_forest', label: 'Natureza', prompt: 'standing in a lush green forest, dappled sunlight through trees, fresh natural environment' },
]

const MAX_EXTRA = 5

export default function SceneGenerator({ initial, onGenerate }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [customScene, setCustomScene] = useState(String(initial.scene_prompt ?? ''))
  const [aspectRatio, setAspectRatio] = useState(String(initial.aspect_ratio ?? '9:16'))
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [extraUrls, setExtraUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadingExtra, setUploadingExtra] = useState(false)
  const primaryUploadId = useId()
  const extraUploadId = useId()

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
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }

  const activePrompt = selectedPreset
    ? (SCENE_PRESETS.find((p) => p.id === selectedPreset)?.prompt ?? customScene)
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
      <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="relative group">
          <div className="absolute -top-2 -left-2 z-10 flex items-center gap-1 rounded-full border border-violet-400/50 bg-violet-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-lg">
            <Sparkles size={10} /> CENA GERADA
          </div>
          <div className={`${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'} w-full overflow-hidden rounded-2xl border-2 border-violet-500/30 bg-zinc-900 shadow-2xl`}>
            <img src={resultUrl} alt="Result" className="h-full w-full object-cover" />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Cena pronta</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              Sua cena foi gerada e esta pronta para abrir, baixar ou criar outra variacao com a mesma base.
            </p>
          </div>

          <a
            href={resultUrl}
            download
            target="_blank"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-bold text-white transition-all hover:bg-white/10"
          >
            <Maximize size={14} /> ABRIR EM TELA CHEIA
          </a>

          <button
            onClick={handleGenerate}
            className="text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-violet-400"
          >
            Gerar outra variacao
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="relative group">
          <div className="absolute -top-2 -left-2 z-10 flex items-center gap-1 rounded-full border border-violet-400/50 bg-violet-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-lg">
            <ImageIcon size={10} /> MODELO FONTE
          </div>
          {sourceUrl ? (
            <div className={`${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'} w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 shadow-inner transition-all group-hover:border-violet-500/30`}>
              <img src={sourceUrl} alt="Source" className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100" />
              <div className="absolute inset-x-0 bottom-0 flex h-16 items-end bg-gradient-to-t from-black/80 to-transparent p-3">
                <span className="text-[10px] font-medium text-zinc-400">Pronta para nova cena</span>
              </div>
            </div>
          ) : (
            <div className={`${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'} flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/5 bg-white/5 p-6 text-center`}>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-zinc-600">
                <Camera size={24} />
              </div>
              <p className="text-xs font-semibold text-zinc-400">Conecte um Modelo ou Fusão</p>
              <p className="text-[10px] text-zinc-600">Arraste a saída do card para cá</p>
              <label
                htmlFor={primaryUploadId}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-zinc-400 transition-all hover:border-violet-500/30 hover:bg-white/10 hover:text-white"
              >
                {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                {uploading ? 'Enviando...' : 'Upload do PC / Celular'}
              </label>
              <input
                id={primaryUploadId}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], setUploadedUrl, setUploading)}
              />
            </div>
          )}
        </div>

        {sourceUrl ? (
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <Plus size={10} className="text-violet-500" /> Fotos Extras de Referência
              <span className="ml-auto text-zinc-600 normal-case font-normal">{extraUrls.length}/{MAX_EXTRA} · melhora fidelidade</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {extraUrls.map((url, i) => (
                <div key={i} className="relative h-14 w-14 overflow-hidden rounded-lg border border-white/10">
                  <img src={url} alt={`ref ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    onClick={() => setExtraUrls((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-red-500"
                  >
                    <X size={8} />
                  </button>
                </div>
              ))}
              {extraUrls.length < MAX_EXTRA ? (
                <>
                  <label
                    htmlFor={extraUploadId}
                    className="flex h-14 w-14 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-white/10 bg-white/3 transition-colors hover:border-violet-500/40"
                  >
                    {uploadingExtra ? (
                      <Loader2 size={14} className="animate-spin text-zinc-500" />
                    ) : (
                      <>
                        <Plus size={14} className="text-zinc-500" />
                        <span className="text-[8px] font-bold text-zinc-600">ADD</span>
                      </>
                    )}
                  </label>
                  <input
                    id={extraUploadId}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] &&
                      uploadFile(
                        e.target.files[0],
                        (url) => setExtraUrls((prev) => [...prev, url]),
                        setUploadingExtra,
                      )
                    }
                  />
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            <Maximize size={10} className="text-violet-500" /> Proporção
          </label>
          <div className="flex gap-0.5 rounded-lg border border-white/5 bg-zinc-900 p-0.5">
            {[{ id: '9:16', label: '9:16' }, { id: '1:1', label: '1:1' }, { id: '4:5', label: '4:5' }].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setAspectRatio(opt.id)}
                className={`flex-1 rounded-md py-1 text-[10px] font-bold transition-all ${aspectRatio === opt.id ? 'border border-white/10 bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            <MapPin size={10} className="text-violet-500" /> Cenários Prontos
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {SCENE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedPreset(selectedPreset === preset.id ? null : preset.id)
                  if (selectedPreset !== preset.id) setCustomScene('')
                }}
                className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition-all ${
                  selectedPreset === preset.id
                    ? 'border-violet-500/50 bg-violet-500/10 ring-1 ring-violet-500/20'
                    : 'border-white/5 bg-white/2 hover:border-white/10 hover:bg-white/5'
                }`}
              >
                <span className={`text-center text-[9px] font-bold leading-tight ${selectedPreset === preset.id ? 'text-white' : 'text-zinc-400'}`}>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            <Sparkles size={10} className="text-violet-500" /> Cena Personalizada
          </label>
          <textarea
            value={customScene}
            onChange={(e) => {
              setCustomScene(e.target.value)
              setSelectedPreset(null)
            }}
            placeholder="Ex: numa cobertura em Dubai ao entardecer, vista panorâmica da cidade iluminada..."
            rows={6}
            className="nodrag w-full resize-none rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 transition-colors focus:border-violet-500/50 focus:outline-none"
          />
        </div>

        <button
          disabled={!sourceUrl || !activePrompt.trim()}
          onClick={handleGenerate}
          className={`group/btn relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 text-xs font-bold transition-all ${
            !sourceUrl || !activePrompt.trim()
              ? 'cursor-not-allowed bg-zinc-800 text-zinc-600'
              : 'bg-violet-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:bg-violet-500 active:scale-95'
          }`}
        >
          <Sparkles size={14} />
          {allSourceUrls.length > 1 ? `COLOCAR NA CENA · ${allSourceUrls.length} REFERÊNCIAS` : 'COLOCAR NA CENA'}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover/btn:animate-shimmer" />
        </button>
        <p className="text-center text-[9px] font-medium text-zinc-600">Preserva identidade, rosto e roupa 100%</p>
      </div>
    </div>
  )
}

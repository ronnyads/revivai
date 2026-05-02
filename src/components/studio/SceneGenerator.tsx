'use client'

import { useState, useId } from 'react'
import { Sparkles, Camera, Maximize, Upload, Loader2, X, Plus, ChevronDown } from 'lucide-react'
import {
  StudioFieldLabel,
  StudioFormShell,
  StudioHint,
  StudioPanel,
  StudioPrimaryButton,
} from './StudioFormShell'
import { CREDIT_COST } from '@/constants/studio'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

const SCENE_PRESETS = [
  { id: 'podcast', label: 'Podcast', prompt: 'in a premium podcast studio, visible microphone, clean desk, warm controlled lighting, intimate speaking atmosphere' },
  { id: 'office', label: 'Escritorio', prompt: 'in a contemporary office, organized desk, soft window light, premium professional atmosphere' },
  { id: 'beach', label: 'Praia', prompt: 'on a sunny beach, soft ocean breeze, natural golden light, relaxed coastal atmosphere' },
  { id: 'eiffel_paris', label: 'Torre Eiffel', prompt: 'standing in front of the Eiffel Tower in Paris, golden hour light, iconic landmark clearly visible, romantic Parisian atmosphere' },
  { id: 'times_square', label: 'Times Square', prompt: 'walking through Times Square New York at night, iconic neon billboards and city lights bokeh, vibrant urban energy' },
  { id: 'dubai_burj', label: 'Dubai Burj', prompt: 'on a luxury rooftop in Dubai with the Burj Khalifa visible in the background, golden sunset, panoramic skyline' },
  { id: 'santorini', label: 'Santorini', prompt: 'in Santorini Greece, white-washed buildings with blue domes, crystal blue Aegean Sea, golden Mediterranean light' },
  { id: 'tokyo_shibuya', label: 'Toquio', prompt: 'at Shibuya crossing in Tokyo at night, colorful neon lights, dynamic Japanese street atmosphere' },
  { id: 'london_big_ben', label: 'Londres', prompt: 'near Big Ben and the Thames River in London, classic British architecture, cloudy dramatic sky, elegant European setting' },
  { id: 'maldives_beach', label: 'Maldivas', prompt: 'standing on a pristine white sand beach in the Maldives, crystal turquoise water, overwater bungalows in background, tropical paradise' },
  { id: 'rome_colosseum', label: 'Roma', prompt: 'near the Colosseum in Rome Italy, ancient architecture, warm afternoon Mediterranean light, historical atmosphere' },
  { id: 'cafe_paris', label: 'Cafe Paris', prompt: 'sitting at a cozy Parisian cafe terrace, golden hour sunlight, Eiffel Tower softly visible in the background' },
  { id: 'luxury_hotel', label: 'Hotel Luxo', prompt: 'in a luxury 5-star hotel lobby, marble floors, chandelier lighting, elegant and sophisticated atmosphere' },
  { id: 'studio_clean', label: 'Fundo Limpo', prompt: 'in a clean minimal photo studio, soft studio lighting, neutral grey gradient background, professional shoot' },
  { id: 'nature_forest', label: 'Natureza', prompt: 'standing in a lush green forest, dappled sunlight through trees, fresh natural environment' },
]

const MAX_EXTRA = 5
const ASPECT_RATIO_OPTIONS = [
  { id: '9:16', label: '9:16 - Stories' },
  { id: '1:1', label: '1:1 - Catalogo' },
  { id: '4:5', label: '4:5 - Feed' },
]

function CompactSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-[16px] border border-white/8 bg-[#0B0D0F] px-3 py-2.5 pr-9 text-[11px] text-white outline-none transition-colors focus:border-violet-400/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/38" />
    </div>
  )
}

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
  const selectedPresetConfig = SCENE_PRESETS.find((preset) => preset.id === selectedPreset) ?? null

  async function uploadFile(file: File, onDone: (url: string) => void, setLoading: (value: boolean) => void) {
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('bucket', 'studio')
      const response = await fetch('/api/studio/upload', { method: 'POST', body: form })
      const { url } = await response.json()
      if (url) onDone(url)
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }

  const promptRefinement = customScene.trim()
  const activePrompt = selectedPresetConfig
    ? [selectedPresetConfig.prompt, promptRefinement].filter(Boolean).join(', ')
    : promptRefinement

  const allSourceUrls = [sourceUrl, ...extraUrls].filter(Boolean)
  const selectedPresetLabel = selectedPresetConfig?.label

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
      <StudioFormShell
        accent="violet"
        icon={<Sparkles size={18} />}
        title="Cena pronta"
        hideHeader
        layout="split"
        chips={[
          { label: selectedPresetLabel ?? 'Cena custom', tone: 'violet' },
          { label: aspectRatio, tone: 'neutral' },
        ]}
        media={
          <StudioPanel title="Preview" compact>
            <div className={`${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'} overflow-hidden rounded-[16px] border border-white/8 bg-black/20`}>
              <img src={resultUrl} alt="Cena gerada" className="h-full w-full object-cover" />
            </div>
          </StudioPanel>
        }
        controls={
          <>
            <StudioPanel title="Saida" compact>
              <a
                href={resultUrl}
                download
                target="_blank"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-[16px] border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72 transition-colors hover:text-white"
              >
                <Maximize size={13} />
                Abrir arquivo
              </a>
            </StudioPanel>

            <StudioPrimaryButton accent="violet" onClick={handleGenerate}>
              <Sparkles size={16} />
              Gerar variacao - {CREDIT_COST.scene} CR
            </StudioPrimaryButton>
          </>
        }
      />
    )
  }

  return (
    <StudioFormShell
      accent="violet"
      icon={<Camera size={18} />}
      title="Cena Livre"
      hideHeader
      layout="split"
      chips={[
        { label: selectedPresetLabel ?? 'Cena custom', tone: 'violet' },
        { label: `${allSourceUrls.length} refs`, tone: 'neutral' },
      ]}
      media={
        <>
          <StudioPanel title="Base" compact>
            {sourceUrl ? (
              <div className={`${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'} relative overflow-hidden rounded-[16px] border border-white/8 bg-black/20`}>
                <img src={sourceUrl} alt="Fonte principal" className="h-full w-full object-cover opacity-90" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/78">Fonte pronta</span>
                </div>
              </div>
            ) : (
              <div className={`${aspectRatio === '9:16' ? 'aspect-[9/16]' : aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'} flex flex-col items-center justify-center gap-2.5 rounded-[16px] border border-dashed border-white/10 bg-[#0B0D0F] p-4 text-center`}>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-white/34">
                  <Camera size={18} />
                </div>
                <p className="text-[10px] font-semibold text-white/64">Conecte um modelo ou fusao</p>
                <label
                  htmlFor={primaryUploadId}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/72 transition-colors hover:text-white"
                >
                  {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {uploading ? 'Enviando' : 'Upload'}
                </label>
                <input
                  id={primaryUploadId}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => event.target.files?.[0] && uploadFile(event.target.files[0], setUploadedUrl, setUploading)}
                />
              </div>
            )}
          </StudioPanel>

          <StudioPanel title="Refs" compact>
            <div className="flex flex-wrap gap-2">
              {extraUrls.map((url, index) => (
                <div key={url} className="relative h-12 w-12 overflow-hidden rounded-[14px] border border-white/8 bg-black/20">
                  <img src={url} alt={`ref ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setExtraUrls((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}
                    className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white"
                  >
                    <X size={9} />
                  </button>
                </div>
              ))}
              {extraUrls.length < MAX_EXTRA ? (
                <>
                  <label
                    htmlFor={extraUploadId}
                    className="flex h-12 w-12 cursor-pointer flex-col items-center justify-center gap-1 rounded-[14px] border border-dashed border-white/10 bg-[#0B0D0F] text-white/40 transition-colors hover:border-violet-400/30 hover:text-white"
                  >
                    {uploadingExtra ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    <span className="text-[8px] font-semibold uppercase tracking-[0.16em]">Add</span>
                  </label>
                  <input
                    id={extraUploadId}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) =>
                      event.target.files?.[0]
                      && uploadFile(event.target.files[0], (url) => setExtraUrls((previous) => [...previous, url]), setUploadingExtra)
                    }
                  />
                </>
              ) : null}
            </div>
          </StudioPanel>
        </>
      }
      controls={
        <>
          <StudioPanel title="Configuracao" compact>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <StudioFieldLabel>Proporcao</StudioFieldLabel>
                <CompactSelect
                  value={aspectRatio}
                  onChange={setAspectRatio}
                  options={ASPECT_RATIO_OPTIONS.map((option) => ({ value: option.id, label: option.label }))}
                />
              </div>

              <div>
                <StudioFieldLabel>Cenario base</StudioFieldLabel>
                <CompactSelect
                  value={selectedPreset ?? 'custom'}
                  onChange={(value) => {
                    const nextPreset = value === 'custom' ? null : value
                    setSelectedPreset(nextPreset)
                    if (nextPreset && nextPreset !== selectedPreset) setCustomScene('')
                  }}
                  options={[
                    { value: 'custom', label: 'Personalizado' },
                    ...SCENE_PRESETS.map((preset) => ({ value: preset.id, label: preset.label })),
                  ]}
                />
              </div>
            </div>

            {selectedPresetConfig ? (
              <div className="mt-3 rounded-[16px] border border-violet-500/14 bg-violet-500/[0.06] px-3 py-2.5">
                <p className="text-[10px] font-semibold text-violet-200">{selectedPresetConfig.label}</p>
                <p className="mt-1 text-[9px] leading-relaxed text-white/50">
                  Preset fixo aplicado. Use o campo abaixo apenas para pequenos ajustes de luz, camera ou atmosfera.
                </p>
              </div>
            ) : null}
          </StudioPanel>

          <StudioPanel title={selectedPresetConfig ? 'Ajustes finos' : 'Cena'} compact>
            <StudioFieldLabel>{selectedPresetConfig ? 'Complemento opcional' : 'Prompt'}</StudioFieldLabel>
            <textarea
              value={customScene}
              onChange={(event) => {
                setCustomScene(event.target.value)
                if (!selectedPresetConfig) setSelectedPreset(null)
              }}
              placeholder={
                selectedPresetConfig
                  ? 'Ex: luz mais dourada, camera um pouco mais aberta, vibe editorial.'
                  : 'Ex: cobertura em Dubai ao entardecer, skyline ao fundo, luz dourada.'
              }
              rows={selectedPresetConfig ? 3 : 4}
              className="w-full resize-none rounded-[18px] border border-white/8 bg-[#0B0D0F] px-3.5 py-3 text-[12px] leading-relaxed text-white outline-none transition-colors placeholder:text-white/24 focus:border-violet-400/30"
            />
            <div className="mt-2">
              <StudioHint>
                {selectedPresetConfig
                  ? 'O preset cuida do cenario principal; este campo refina o resultado sem ocupar espaco com muitos botoes.'
                  : 'Descreva o ambiente final. Se quiser agilizar, escolha um preset fixo no dropdown acima.'}
              </StudioHint>
            </div>
          </StudioPanel>

          <StudioPrimaryButton accent="violet" disabled={!sourceUrl || !activePrompt.trim()} onClick={handleGenerate}>
            <Sparkles size={16} />
            Gerar cena - {CREDIT_COST.scene} CR
          </StudioPrimaryButton>
        </>
      }
    />
  )
}


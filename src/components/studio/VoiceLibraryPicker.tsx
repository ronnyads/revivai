'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronDown, Loader2, Mic, Trash2, Upload } from 'lucide-react'

export interface VoiceEntry {
  voice_id: string
  name: string
  gender?: string
  /** true = clone do usuário (tem id no banco) */
  is_clone?: boolean
  /** id na tabela studio_user_voices (para deletar) */
  clone_db_id?: string
}

interface VoiceLibraryPickerProps {
  value: string
  onChange: (voice_id: string) => void
  accentClass?: string // ex: 'emerald' | 'violet' | 'cyan'
  onCloneAdded?: (entry: VoiceEntry) => void
  showCloneUpload?: boolean
}

const MAX_VOICE_CLONE_FILE_BYTES = 4 * 1024 * 1024

function accentColors(accent: string) {
  return {
    border: `focus:border-${accent}-500/50`,
    ring: `ring-${accent}-500/20`,
    bg: `bg-${accent}-500`,
    text: `text-${accent}-400`,
    badge: `bg-${accent}-500/10 border-${accent}-500/20 text-${accent}-400`,
  }
}

export default function VoiceLibraryPicker({
  value,
  onChange,
  accentClass = 'emerald',
  onCloneAdded,
  showCloneUpload = true,
}: VoiceLibraryPickerProps) {
  const [platformVoices, setPlatformVoices] = useState<VoiceEntry[]>([])
  const [userVoices, setUserVoices] = useState<VoiceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [cloning, setCloning] = useState(false)
  const [cloneMsg, setCloneMsg] = useState('')
  const [cloneName, setCloneName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const ac = accentColors(accentClass)

  const loadVoices = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/studio/voices')
      if (!res.ok) return
      const data = await res.json() as {
        platform_voices: Array<{ voice_id: string; name: string; gender: string }>
        user_voices: Array<{ id: string; voice_id: string; name: string }>
      }
      setPlatformVoices(data.platform_voices.map(v => ({
        voice_id: v.voice_id,
        name: `${v.name} (${v.gender})`,
        gender: v.gender,
      })))
      setUserVoices(data.user_voices.map(v => ({
        voice_id: v.voice_id,
        name: v.name,
        is_clone: true,
        clone_db_id: v.id,
      })))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadVoices() }, [loadVoices])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (file.size > MAX_VOICE_CLONE_FILE_BYTES) {
      setCloneMsg('Arquivo maior que 4 MB. Envie um arquivo menor.')
      return
    }
    setPendingFile(file)
    setCloneName('')
    setShowNameInput(true)
    setCloneMsg('')
  }

  async function handleCloneSubmit() {
    if (!pendingFile) return
    const name = cloneName.trim() || 'Minha Voz'

    setCloning(true)
    setCloneMsg('')
    setShowNameInput(false)

    try {
      const form = new FormData()
      form.append('audio', pendingFile)
      form.append('name', name)
      const res = await fetch('/api/studio/voice-clone', { method: 'POST', body: form })
      const body = await res.json().catch(() => ({} as { error?: string; voice_id?: string; name?: string }))

      if (!res.ok) {
        if (res.status === 413) {
          setCloneMsg('Arquivo muito grande para upload. Envie menor que 4 MB.')
        } else {
          setCloneMsg(body.error ?? 'Erro ao clonar voz')
        }
        return
      }

      if (body.voice_id) {
        const newEntry: VoiceEntry = { voice_id: body.voice_id, name: body.name ?? name, is_clone: true }
        setUserVoices(prev => [newEntry, ...prev])
        onChange(body.voice_id)
        onCloneAdded?.(newEntry)
        setCloneMsg('Voz clonada com sucesso!')
        setPendingFile(null)
      } else {
        setCloneMsg(body.error ?? 'Erro ao clonar voz')
      }
    } catch {
      setCloneMsg('Não foi possível clonar agora. Tente novamente.')
    } finally {
      setCloning(false)
    }
  }

  async function handleDeleteClone(entry: VoiceEntry) {
    setDeleting(entry.voice_id)
    try {
      await fetch('/api/studio/voice-clone', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ voice_id: entry.voice_id }),
      })
      setUserVoices(prev => prev.filter(v => v.voice_id !== entry.voice_id))
      if (value === entry.voice_id) {
        onChange(platformVoices[0]?.voice_id ?? '')
      }
    } finally {
      setDeleting(null)
    }
  }

  const allVoices = [...userVoices, ...platformVoices]
  const selected = allVoices.find(v => v.voice_id === value)

  return (
    <div className="flex flex-col gap-3">
      {/* Seletor */}
      <div className="relative">
        {loading ? (
          <div className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 flex items-center gap-2 text-[12px] text-zinc-500">
            <Loader2 size={14} className="animate-spin" /> Carregando vozes...
          </div>
        ) : (
          <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className={`w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-[13px] text-white outline-none ${ac.border} appearance-none cursor-pointer transition-all font-medium`}
          >
            {userVoices.length > 0 && (
              <optgroup label="── Minhas Vozes Clonadas">
                {userVoices.map(v => (
                  <option key={v.voice_id} value={v.voice_id}>{v.name} 👤</option>
                ))}
              </optgroup>
            )}
            <optgroup label="── Vozes da Plataforma">
              {platformVoices.map(v => (
                <option key={v.voice_id} value={v.voice_id}>{v.name}</option>
              ))}
            </optgroup>
            {value && !allVoices.find(v => v.voice_id === value) && (
              <option value={value}>Voz personalizada</option>
            )}
          </select>
        )}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
          <ChevronDown size={12} strokeWidth={3} />
        </div>
      </div>

      {/* Badge do clone selecionado com botão de deletar */}
      {selected?.is_clone && (
        <div className={`flex items-center justify-between rounded-xl px-3 py-2 border text-[11px] ${ac.badge}`}>
          <span className="font-medium">Clone: {selected.name}</span>
          <button
            onClick={() => handleDeleteClone(selected)}
            disabled={deleting === selected.voice_id}
            className="ml-2 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
            title="Remover clone"
          >
            {deleting === selected.voice_id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        </div>
      )}

      {/* Upload de clone */}
      {showCloneUpload && (
        <>
          {showNameInput && pendingFile ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-zinc-700 bg-zinc-900/60 p-4">
              <p className="text-[11px] text-zinc-400">
                Arquivo: <span className="text-white font-medium">{pendingFile.name}</span>
              </p>
              <input
                type="text"
                placeholder="Nome para esta voz (ex: Minha Voz, João)"
                value={cloneName}
                onChange={e => setCloneName(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-[12px] text-white placeholder-zinc-600 outline-none focus:border-zinc-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCloneSubmit}
                  className={`flex-1 ${ac.bg} text-white text-[11px] font-bold py-2 rounded-xl transition-all hover:opacity-90`}
                >
                  Clonar Voz
                </button>
                <button
                  onClick={() => { setShowNameInput(false); setPendingFile(null) }}
                  className="px-3 py-2 rounded-xl border border-zinc-700 text-[11px] text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <label className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border transition-all duration-500 cursor-pointer ${
              cloning
                ? 'bg-zinc-900/60 border-zinc-600 ring-2 ' + ac.ring
                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-600'
            }`}>
              {cloning && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              )}
              <div className="relative flex items-center gap-4 p-4 w-full">
                <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                  cloning
                    ? `${ac.bg} text-white shadow-lg animate-pulse`
                    : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-white'
                }`}>
                  {cloning ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`block font-black text-[10px] uppercase tracking-widest ${cloning ? ac.text : 'text-zinc-300'}`}>
                    {cloning ? 'Clonando sua voz...' : 'Clonar minha voz'}
                  </span>
                  <span className="block text-[9px] text-zinc-500 mt-0.5">
                    {cloning ? 'Aguarde 15-30s...' : 'Suba 30s-1min de áudio limpo · max 4 MB'}
                  </span>
                </div>
                <Mic size={14} className="text-zinc-600 shrink-0" />
              </div>
              <input type="file" accept="audio/*" className="hidden" onChange={handleFileSelect} disabled={cloning} />
            </label>
          )}

          {cloneMsg && (
            <div className={`rounded-xl px-3 py-2 text-[10px] font-bold text-center animate-in fade-in ${
              cloneMsg.includes('sucesso')
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {cloneMsg}
            </div>
          )}
        </>
      )}
    </div>
  )
}

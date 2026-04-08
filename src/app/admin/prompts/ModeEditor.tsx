'use client'
import { useState, useRef } from 'react'
import { updateMode, deleteMode as deleteModeAction } from './actions'

interface Mode {
  id: string; name: string; description: string; icon: string
  prompt: string; model: string; is_active: boolean; sort_order: number
  example_before_url?: string | null; example_after_url?: string | null
  persona?: string | null; retry_prompt?: string | null; qc_threshold?: number
}

function ImageUploadField({ name, label, currentUrl }: {
  name: string; label: string; currentUrl?: string | null
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const display = preview || currentUrl || null

  return (
    <div>
      <label className="text-xs text-white/40 mb-1 block">{label}</label>
      <input type="hidden" name={`${name}_url`} value={currentUrl ?? ''} />
      <div
        onClick={() => inputRef.current?.click()}
        className="relative rounded-lg overflow-hidden aspect-[4/3] bg-white/5 border border-white/10 border-dashed cursor-pointer hover:border-white/30 transition-colors flex items-center justify-center"
      >
        {display ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={display} alt={label} className="w-full h-full object-cover absolute inset-0" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium">Trocar imagem</span>
            </div>
          </>
        ) : (
          <span className="text-white/20 text-xs text-center px-3">Clique para enviar<br />{label}</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        name={`${name}_file`}
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) setPreview(URL.createObjectURL(f))
        }}
      />
    </div>
  )
}

export default function ModeEditor({ mode, models, deleteMode }: {
  mode: Mode
  models: { value: string; label: string }[]
  deleteMode: (id: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4">
        <span className="text-2xl">{mode.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{mode.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${mode.is_active ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/30'}`}>
              {mode.is_active ? 'ativo' : 'inativo'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/30">
              QC {mode.qc_threshold ?? 70}
            </span>
          </div>
          <p className="text-xs text-white/40">{mode.description}</p>
          <p className="text-[11px] text-white/20 font-mono mt-0.5">{mode.model}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(o => !o)} className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/60 rounded-lg transition-colors">
            {open ? 'Fechar' : 'Editar'}
          </button>
          <button onClick={() => { if (confirm('Deletar este modo?')) deleteMode(mode.id) }}
            className="text-xs px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors">
            Deletar
          </button>
        </div>
      </div>

      {/* Edit form */}
      {open && (
        <form action={async (fd) => { await updateMode(mode.id, fd); setOpen(false) }}
          className="border-t border-white/10 px-6 py-5 flex flex-col gap-4 bg-white/[0.03]">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Ícone</label>
              <input name="icon" defaultValue={mode.icon} className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-white/40 mb-1 block">Nome</label>
              <input name="name" defaultValue={mode.name} required className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-white/40 mb-1 block">Descrição</label>
              <input name="description" defaultValue={mode.description} className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Limiar QC <span className="text-white/20">(0–100)</span></label>
              <input name="qc_threshold" type="number" min={0} max={100} step={5} defaultValue={mode.qc_threshold ?? 70} className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Modelo Gemini</label>
              <select name="model" defaultValue={mode.model} className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30">
                {models.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Status</label>
              <select name="is_active" defaultValue={String(mode.is_active)} className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30">
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Persona do Agente <span className="text-white/20">(system instruction)</span></label>
            <textarea name="persona" defaultValue={mode.persona ?? ''} rows={5} placeholder="Ex: Você é um restaurador de fotos com 30 anos de experiência..." className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 resize-y font-mono" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Prompt Gemini <span className="text-white/20">(tarefa)</span></label>
            <textarea name="prompt" defaultValue={mode.prompt} rows={8} required className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 resize-y font-mono" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Prompt de Retry <span className="text-white/20">(usado se QC score abaixo do limiar)</span></label>
            <textarea name="retry_prompt" defaultValue={mode.retry_prompt ?? ''} rows={4} placeholder="Prompt conservador para segunda tentativa..." className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 resize-y font-mono" />
          </div>
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-white/40 mb-3 uppercase tracking-widest">Exemplo de Restauração</p>
            <div className="grid grid-cols-2 gap-4">
              <ImageUploadField name="example_before" label="Antes" currentUrl={mode.example_before_url} />
              <ImageUploadField name="example_after"  label="Depois" currentUrl={mode.example_after_url} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="bg-accent text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors">Salvar</button>
            <button type="button" onClick={() => setOpen(false)} className="text-white/40 px-4 py-2 rounded-lg text-sm hover:text-white transition-colors">Cancelar</button>
          </div>
        </form>
      )}
    </div>
  )
}

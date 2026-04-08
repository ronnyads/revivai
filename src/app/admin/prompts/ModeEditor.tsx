'use client'
import { useState } from 'react'
import { updateMode, deleteMode as deleteModeAction } from './actions'

interface Mode {
  id: string; name: string; description: string; icon: string
  prompt: string; model: string; is_active: boolean; sort_order: number
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
              <input name="icon" defaultValue={mode.icon} className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-white/40 mb-1 block">Nome</label>
              <input name="name" defaultValue={mode.name} required className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Descrição</label>
            <input name="description" defaultValue={mode.description} className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Modelo Gemini</label>
              <select name="model" defaultValue={mode.model} className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30">
                {models.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Status</label>
              <select name="is_active" defaultValue={String(mode.is_active)} className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30">
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Prompt Gemini</label>
            <textarea name="prompt" defaultValue={mode.prompt} rows={8} required className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 resize-y font-mono" />
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

'use client'

import { useActionState } from 'react'
import { upsertFaq, deleteFaq } from './actions'

type Faq = { id: string; question: string; answer: string; order: number }

function FaqRow({ f }: { f: Faq }) {
  const [state, action, pending] = useActionState(upsertFaq, null)

  return (
    <form action={action} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 flex flex-col gap-3">
      <input type="hidden" name="id" value={f.id} />
      <div>
        <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Pergunta</label>
        <input name="question" defaultValue={f.question} required
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C0DF2]/60 transition-colors" />
      </div>
      <div>
        <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Resposta</label>
        <textarea name="answer" defaultValue={f.answer} required rows={3}
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C0DF2]/60 transition-colors resize-none" />
      </div>
      <div className="flex items-center gap-3">
        <div className="w-20">
          <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Ordem</label>
          <input name="order" type="number" defaultValue={f.order}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C0DF2]/60 transition-colors" />
        </div>
        <div className="flex-1" />
        {state?.ok === true && <span className="text-xs text-green-400">✓ Salvo</span>}
        {state?.ok === false && <span className="text-xs text-red-400">✗ {state.error}</span>}
        <button type="button" disabled={pending} onClick={async () => { if (confirm('Excluir esta pergunta?')) await deleteFaq(f.id) }}
          className="px-3 py-2 rounded-lg text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors">
          Excluir
        </button>
        <button type="submit" disabled={pending}
          className="px-5 py-2 rounded-lg text-white text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: '#7C0DF2' }}>
          {pending ? '...' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}

function NewFaqForm() {
  const [state, action, pending] = useActionState(upsertFaq, null)

  return (
    <form action={action} className="bg-white/[0.02] border border-dashed border-white/[0.1] rounded-xl p-5 flex flex-col gap-3">
      <p className="text-xs text-white/40 uppercase tracking-widest font-medium">+ Nova pergunta</p>
      <div>
        <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Pergunta</label>
        <input name="question" required placeholder="Ex: Como funciona?"
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C0DF2]/60 transition-colors placeholder:text-white/20" />
      </div>
      <div>
        <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Resposta</label>
        <textarea name="answer" required rows={3} placeholder="Resposta completa..."
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C0DF2]/60 transition-colors resize-none placeholder:text-white/20" />
      </div>
      <div className="flex items-center gap-3">
        <div className="w-20">
          <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Ordem</label>
          <input name="order" type="number" defaultValue={99}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C0DF2]/60 transition-colors" />
        </div>
        <div className="flex-1" />
        {state?.ok === true && <span className="text-xs text-green-400">✓ Adicionado</span>}
        {state?.ok === false && <span className="text-xs text-red-400">✗ {state.error}</span>}
        <button type="submit" disabled={pending}
          className="px-5 py-2 rounded-lg text-white text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity"
          style={{ backgroundColor: '#7C0DF2' }}>
          {pending ? '...' : 'Adicionar'}
        </button>
      </div>
    </form>
  )
}

export { FaqRow, NewFaqForm }

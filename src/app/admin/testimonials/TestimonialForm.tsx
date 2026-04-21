'use client'

import { useActionState } from 'react'
import { upsertTestimonial, deleteTestimonial } from './actions'

type Testimonial = { id: string; name: string; role: string; quote: string; order: number }

function TestimonialRow({ t }: { t: Testimonial }) {
  const [state, action, pending] = useActionState(upsertTestimonial, null)

  return (
    <form action={action} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 flex flex-col gap-3">
      <input type="hidden" name="id" value={t.id} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Nome</label>
          <input name="name" defaultValue={t.name} required
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C0DF2]/60 transition-colors" />
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Cargo/Descrição</label>
          <input name="role" defaultValue={t.role} required
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C0DF2]/60 transition-colors" />
        </div>
      </div>
      <div>
        <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Depoimento</label>
        <textarea name="quote" defaultValue={t.quote} required rows={3}
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C0DF2]/60 transition-colors resize-none" />
      </div>
      <div className="flex items-center gap-3">
        <div className="w-20">
          <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Ordem</label>
          <input name="order" type="number" defaultValue={t.order}
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C0DF2]/60 transition-colors" />
        </div>
        <div className="flex-1" />
        {state?.ok === true && <span className="text-xs text-green-400">✓ Salvo</span>}
        {state?.ok === false && <span className="text-xs text-red-400">✗ {state.error}</span>}
        <button type="button" disabled={pending} onClick={async () => { if (confirm('Excluir este depoimento?')) await deleteTestimonial(t.id) }}
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

function NewTestimonialForm() {
  const [state, action, pending] = useActionState(upsertTestimonial, null)

  return (
    <form action={action} className="bg-white/[0.02] border border-dashed border-white/[0.1] rounded-xl p-5 flex flex-col gap-3">
      <p className="text-xs text-white/40 uppercase tracking-widest font-medium">+ Novo depoimento</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Nome</label>
          <input name="name" required placeholder="Nome do cliente"
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C0DF2]/60 transition-colors placeholder:text-white/20" />
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Cargo/Descrição</label>
          <input name="role" required placeholder="ex: Cliente desde 2024"
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#7C0DF2]/60 transition-colors placeholder:text-white/20" />
        </div>
      </div>
      <div>
        <label className="text-xs text-white/40 mb-1 block uppercase tracking-wide">Depoimento</label>
        <textarea name="quote" required rows={3} placeholder="O que o cliente disse..."
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

export { TestimonialRow, NewTestimonialForm }

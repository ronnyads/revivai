'use client'

import { useActionState } from 'react'
import { saveMultipleSettings } from './actions'

type Props = {
  photos: string
  models: string
  satisfaction: string
  avgTime: string
  pixDiscount: string
}

export default function StatsForm({ photos, models, satisfaction, avgTime, pixDiscount }: Props) {
  const [state, action, pending] = useActionState(saveMultipleSettings, null)

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-white/40 mb-1.5 block uppercase tracking-wide">Fotos restauradas</label>
          <input name="stat_photos" defaultValue={photos} placeholder="48000"
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#D94F2E]/60 transition-colors placeholder:text-white/20" />
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block uppercase tracking-wide">Modelos de IA</label>
          <input name="stat_models" defaultValue={models} placeholder="4"
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#D94F2E]/60 transition-colors placeholder:text-white/20" />
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block uppercase tracking-wide">Satisfação (%)</label>
          <input name="stat_satisfaction" defaultValue={satisfaction} placeholder="98"
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#D94F2E]/60 transition-colors placeholder:text-white/20" />
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block uppercase tracking-wide">Tempo médio (segundos)</label>
          <input name="stat_avg_time" defaultValue={avgTime} placeholder="30"
            className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#D94F2E]/60 transition-colors placeholder:text-white/20" />
        </div>
      </div>

      <div className="border-t border-white/[0.06] pt-4">
        <label className="text-xs text-white/40 mb-1.5 block uppercase tracking-wide">Desconto PIX (%)</label>
        <input name="pix_discount" defaultValue={pixDiscount} placeholder="5"
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#D94F2E]/60 transition-colors placeholder:text-white/20" />
        <p className="text-xs text-white/25 mt-1.5">Ex: 5 = 5% de desconto no checkout via PIX</p>
      </div>

      {state?.ok === true && (
        <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
          ✓ Configurações salvas com sucesso
        </p>
      )}
      {state?.ok === false && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          ✗ Erro: {state.error}
        </p>
      )}

      <button type="submit" disabled={pending}
        className="w-full py-2.5 rounded-lg text-white text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
        style={{ backgroundColor: '#D94F2E' }}>
        {pending ? 'Salvando...' : 'Salvar Configurações'}
      </button>
    </form>
  )
}

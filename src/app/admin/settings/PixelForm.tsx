'use client'

import { useActionState } from 'react'
import { saveSetting } from './actions'

export default function PixelForm({ pixelId }: { pixelId: string }) {
  const [state, action, pending] = useActionState(saveSetting, null)

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="key" value="meta_pixel_id" />

      <div>
        <label className="text-xs text-white/40 mb-1.5 block uppercase tracking-wide">Pixel ID</label>
        <input
          name="value"
          defaultValue={pixelId}
          placeholder="123456789012345"
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#1877F2]/60 transition-colors placeholder:text-white/20"
        />
        <p className="text-xs text-white/25 mt-1.5">
          Encontre em Meta Business Suite → Gerenciador de Eventos → Pixels
        </p>
      </div>

      {state?.ok === true && (
        <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
          ✓ Pixel ID salvo com sucesso
        </p>
      )}
      {state?.ok === false && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          ✗ Erro: {state.error}
        </p>
      )}

      <button type="submit" disabled={pending}
        className="w-full py-2.5 rounded-lg text-white text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
        style={{ backgroundColor: '#1877F2' }}>
        {pending ? 'Salvando...' : 'Salvar Pixel ID'}
      </button>
    </form>
  )
}

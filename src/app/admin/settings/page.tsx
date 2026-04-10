export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { saveSetting } from './actions'

export default async function SettingsPage() {
  const supabase = createAdminClient()
  const { data: rows } = await supabase.from('settings').select('key, value')
  const settings: Record<string, string> = {}
  rows?.forEach((r: { key: string; value: string }) => { settings[r.key] = r.value })

  const pixelId = settings['meta_pixel_id'] || ''

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-white/40 mt-1">Configure integrações e rastreamento da plataforma.</p>
      </div>

      {/* Meta Pixel */}
      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1877F2' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Meta Pixel (Facebook Ads)</h2>
            <p className="text-xs text-white/30">Rastreamento de conversões para campanhas</p>
          </div>
        </div>

        <form
          action={async (fd: FormData) => {
            'use server'
            const { saveSetting } = await import('./actions')
            await saveSetting('meta_pixel_id', fd.get('meta_pixel_id') as string)
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="text-xs text-white/40 mb-1.5 block uppercase tracking-wide">Pixel ID</label>
            <input
              name="meta_pixel_id"
              defaultValue={pixelId}
              placeholder="123456789012345"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#1877F2]/60 transition-colors placeholder:text-white/20"
            />
            <p className="text-xs text-white/25 mt-1.5">
              Encontre em Meta Business Suite → Gerenciador de Eventos → Pixels
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg text-white text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#1877F2' }}
          >
            Salvar Pixel ID
          </button>
        </form>

        {pixelId && (
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <p className="text-xs text-white/30 mb-3">Eventos configurados:</p>
            <div className="flex flex-wrap gap-2">
              {['PageView', 'InitiateCheckout', 'AddPaymentInfo', 'Purchase'].map(ev => (
                <span key={ev} className="text-[10px] px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 font-mono">
                  ✓ {ev}
                </span>
              ))}
            </div>
          </div>
        )}

        {!pixelId && (
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <p className="text-xs text-white/25">
              Nenhum pixel configurado. Os eventos abaixo serão ativados automaticamente após salvar o ID:
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {['PageView', 'InitiateCheckout', 'AddPaymentInfo', 'Purchase'].map(ev => (
                <span key={ev} className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-white/20 border border-white/10 font-mono">
                  {ev}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

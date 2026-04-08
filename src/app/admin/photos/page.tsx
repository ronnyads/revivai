export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

export default async function AdminPhotos() {
  const supabase = await createClient()
  const { data: photos, count } = await supabase
    .from('photos')
    .select('*, users(email)', { count: 'exact' })
    .order('created_at', { ascending: false })

  const done  = photos?.filter(p => p.status === 'done').length  ?? 0
  const error = photos?.filter(p => p.status === 'error').length ?? 0
  const processing = photos?.filter(p => p.status === 'processing').length ?? 0

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-normal tracking-tight mb-1">Fotos</h1>
          <p className="text-white/40 text-sm">
            {count ?? 0} total · {done} concluídas · {processing} processando · {error} com erro
          </p>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Concluídas', value: done, color: 'text-green-400' },
          { label: 'Processando', value: processing, color: 'text-[#D94F2E]' },
          { label: 'Com erro', value: error, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-xs text-white/30 uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`font-display text-3xl font-normal ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-white/30 uppercase tracking-widest border-b border-white/10">
              <th className="text-left px-6 py-4">Foto</th>
              <th className="text-left px-6 py-4">Cliente</th>
              <th className="text-left px-6 py-4">Modelo IA</th>
              <th className="text-left px-6 py-4">Diagnóstico</th>
              <th className="text-left px-6 py-4">Status</th>
              <th className="text-left px-6 py-4">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {photos?.map(p => (
              <tr key={p.id} className="hover:bg-white/[0.04] transition-colors">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden flex-shrink-0">
                      {p.original_url && <img src={p.original_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    {p.restored_url && (
                      <a href={p.restored_url} target="_blank" rel="noreferrer"
                        className="text-[10px] text-[#D94F2E] hover:underline">Ver restaurada →</a>
                    )}
                  </div>
                </td>
                <td className="px-6 py-3 text-white/60 text-xs">{(p as any).users?.email ?? '—'}</td>
                <td className="px-6 py-3 text-white/40 text-[11px] font-mono">{p.model_used?.split('/')[1]}</td>
                <td className="px-6 py-3 text-white/60 text-xs">{p.diagnosis ?? '—'}</td>
                <td className="px-6 py-3">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
                    p.status === 'done'       ? 'bg-green-500/20 text-green-400'
                    : p.status === 'processing' ? 'bg-[#D94F2E]/20 text-[#D94F2E]'
                    : p.status === 'error'      ? 'bg-red-500/20 text-red-400'
                    : 'bg-white/10 text-white/40'
                  }`}>{p.status}</span>
                </td>
                <td className="px-6 py-3 text-white/30 text-xs">{formatDate(p.created_at)}</td>
              </tr>
            ))}
            {(!photos || photos.length === 0) && (
              <tr><td colSpan={6} className="text-center py-16 text-white/20">Nenhuma foto ainda</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

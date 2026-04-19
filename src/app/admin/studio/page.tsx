export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/utils'

const TYPE_COLORS: Record<string, string> = {
  compose:    'bg-orange-500/20 text-orange-400',
  image:      'bg-blue-500/20 text-blue-400',
  video:      'bg-purple-500/20 text-purple-400',
  voice:      'bg-pink-500/20 text-pink-400',
  script:     'bg-yellow-500/20 text-yellow-400',
  model:      'bg-cyan-500/20 text-cyan-400',
  lipsync:    'bg-indigo-500/20 text-indigo-400',
  animate:    'bg-teal-500/20 text-teal-400',
  ugc_bundle: 'bg-rose-500/20 text-rose-400',
}

export default async function AdminStudioDebug() {
  const supabase = createAdminClient()

  const { data: assets, count } = await supabase
    .from('studio_assets')
    .select('*, users(email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(100)

  const done       = assets?.filter(a => a.status === 'done').length       ?? 0
  const error      = assets?.filter(a => a.status === 'error').length      ?? 0
  const processing = assets?.filter(a => a.status === 'processing').length ?? 0
  const idle       = assets?.filter(a => a.status === 'idle').length       ?? 0

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-normal tracking-tight mb-1">Studio Debug</h1>
          <p className="text-white/40 text-sm">
            {count ?? 0} assets · {done} ok · {processing} processando · {error} erros · {idle} idle
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Concluídos',   value: done,       color: 'text-green-400' },
          { label: 'Processando',  value: processing, color: 'text-orange-400' },
          { label: 'Erros',        value: error,      color: 'text-red-400' },
          { label: 'Idle',         value: idle,       color: 'text-white/30' },
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
              <th className="text-left px-4 py-4">Resultado</th>
              <th className="text-left px-4 py-4">Cliente</th>
              <th className="text-left px-4 py-4">Tipo</th>
              <th className="text-left px-4 py-4">Modo</th>
              <th className="text-left px-4 py-4">Status</th>
              <th className="text-left px-4 py-4">Erro / Prompt</th>
              <th className="text-left px-4 py-4">Créditos</th>
              <th className="text-left px-4 py-4">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {assets?.map(a => {
              const params = (a.input_params ?? {}) as Record<string, any>
              const mode   = params.compose_mode ?? params.engine ?? '—'
              const prompt = params.smart_prompt ?? params.prompt ?? params.costume_prompt ?? ''

              return (
                <tr key={a.id} className="hover:bg-white/[0.04] transition-colors align-top">
                  {/* Thumbnail */}
                  <td className="px-4 py-3">
                    <div className="w-12 h-12 rounded-lg bg-white/10 overflow-hidden flex-shrink-0">
                      {a.result_url
                        ? <img src={a.result_url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-white/20 text-[10px]">—</div>
                      }
                    </div>
                    {a.result_url && (
                      <a href={a.result_url} target="_blank" rel="noreferrer"
                        className="block text-[10px] text-orange-400 hover:underline mt-1">
                        abrir →
                      </a>
                    )}
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 text-white/50 text-xs max-w-[120px] truncate">
                    {(a as any).users?.email ?? '—'}
                  </td>

                  {/* Tipo */}
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${TYPE_COLORS[a.type] ?? 'bg-white/10 text-white/40'}`}>
                      {a.type}
                    </span>
                  </td>

                  {/* Modo */}
                  <td className="px-4 py-3 text-white/40 text-[11px] font-mono">{mode}</td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
                      a.status === 'done'       ? 'bg-green-500/20 text-green-400'
                      : a.status === 'processing' ? 'bg-orange-500/20 text-orange-400'
                      : a.status === 'error'      ? 'bg-red-500/20 text-red-400'
                      : 'bg-white/10 text-white/30'
                    }`}>{a.status}</span>
                  </td>

                  {/* Erro / Prompt */}
                  <td className="px-4 py-3 max-w-[260px]">
                    {a.error_msg && (
                      <details>
                        <summary className="text-[11px] text-red-400 cursor-pointer font-mono leading-tight">
                          {String(a.error_msg).slice(0, 80)}…
                        </summary>
                        <pre className="mt-2 text-[10px] text-red-300/70 bg-red-950/30 rounded p-2 whitespace-pre-wrap break-all leading-relaxed">
                          {a.error_msg}
                        </pre>
                      </details>
                    )}
                    {!a.error_msg && prompt && (
                      <p className="text-[11px] text-white/30 italic leading-snug line-clamp-2">
                        "{prompt}"
                      </p>
                    )}
                    {!a.error_msg && !prompt && (
                      <details>
                        <summary className="text-[10px] text-white/20 cursor-pointer">ver params</summary>
                        <pre className="mt-2 text-[10px] text-white/40 bg-white/5 rounded p-2 whitespace-pre-wrap break-all leading-relaxed">
                          {JSON.stringify(params, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>

                  {/* Créditos */}
                  <td className="px-4 py-3 text-white/30 text-xs">{a.credits_cost ?? 0} cr</td>

                  {/* Data */}
                  <td className="px-4 py-3 text-white/30 text-xs whitespace-nowrap">{formatDate(a.created_at)}</td>
                </tr>
              )
            })}
            {(!assets || assets.length === 0) && (
              <tr><td colSpan={8} className="text-center py-16 text-white/20">Nenhum asset ainda</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

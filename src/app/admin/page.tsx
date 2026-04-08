export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function AdminDashboard() {
  const supabase = createAdminClient()

  const [
    { count: totalUsers },
    { count: totalPhotos },
    { count: donePhotos },
    { data: orders },
    { data: recentPhotos },
    { data: recentUsers },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('photos').select('*', { count: 'exact', head: true }),
    supabase.from('photos').select('*', { count: 'exact', head: true }).eq('status', 'done'),
    supabase.from('orders').select('*').eq('status', 'paid').order('created_at', { ascending: false }),
    supabase.from('photos').select('*, users(email)').order('created_at', { ascending: false }).limit(10),
    supabase.from('users').select('*').order('created_at', { ascending: false }).limit(10),
  ])

  const totalRevenue = orders?.reduce((sum, o) => sum + (o.amount ?? 0), 0) ?? 0
  const successRate  = totalPhotos ? Math.round(((donePhotos ?? 0) / totalPhotos) * 100) : 0

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="font-display text-4xl font-normal tracking-tight mb-1">Dashboard</h1>
        <p className="text-white/40 text-sm">Visão geral do reviv.ai</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Receita total', value: formatCurrency(totalRevenue), sub: `${orders?.length ?? 0} pedidos pagos`, color: 'text-accent' },
          { label: 'Usuários', value: String(totalUsers ?? 0), sub: 'cadastros', color: 'text-white' },
          { label: 'Fotos processadas', value: String(totalPhotos ?? 0), sub: `${successRate}% taxa de sucesso`, color: 'text-white' },
          { label: 'Concluídas', value: String(donePhotos ?? 0), sub: 'restaurações ok', color: 'text-green-400' },
        ].map(k => (
          <div key={k.label} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/8 transition-colors">
            <p className="text-xs text-white/40 mb-2 uppercase tracking-widest">{k.label}</p>
            <div className={`font-display text-4xl font-normal tracking-tight mb-1 ${k.color}`}>{k.value}</div>
            <p className="text-xs text-white/30">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Orders */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="text-sm font-semibold">Pedidos recentes</h2>
            <a href="/admin/orders" className="text-xs text-accent hover:underline">Ver todos →</a>
          </div>
          <div className="divide-y divide-white/5">
            {orders?.slice(0, 8).map(o => (
              <div key={o.id} className="flex items-center justify-between px-6 py-3.5">
                <div>
                  <p className="text-sm font-medium">{o.type === 'per_photo' ? 'Pay-per-foto' : o.type === 'subscription' ? 'Assinatura' : 'Pacote'}</p>
                  <p className="text-xs text-white/30">{formatDate(o.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-accent">{formatCurrency(o.amount)}</p>
                  <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">pago</span>
                </div>
              </div>
            ))}
            {(!orders || orders.length === 0) && (
              <p className="text-white/30 text-sm text-center py-8">Nenhum pedido ainda</p>
            )}
          </div>
        </div>

        {/* Recent Photos */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="text-sm font-semibold">Fotos recentes</h2>
            <a href="/admin/photos" className="text-xs text-accent hover:underline">Ver todas →</a>
          </div>
          <div className="divide-y divide-white/5">
            {recentPhotos?.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-6 py-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 overflow-hidden flex-shrink-0">
                  {p.original_url && (
                    <img src={p.original_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/50 truncate">{(p as any).users?.email ?? '—'}</p>
                  <p className="text-[11px] font-mono text-white/30 truncate">{p.model_used}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                  p.status === 'done'       ? 'bg-green-500/20 text-green-400'
                  : p.status === 'processing' ? 'bg-accent/20 text-accent'
                  : p.status === 'error'      ? 'bg-red-500/20 text-red-400'
                  : 'bg-white/10 text-white/40'
                }`}>
                  {p.status}
                </span>
              </div>
            ))}
            {(!recentPhotos || recentPhotos.length === 0) && (
              <p className="text-white/30 text-sm text-center py-8">Nenhuma foto ainda</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-sm font-semibold">Usuários recentes</h2>
          <a href="/admin/users" className="text-xs text-accent hover:underline">Ver todos →</a>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-white/30 uppercase tracking-widest">
              <th className="text-left px-6 py-3">E-mail</th>
              <th className="text-left px-6 py-3">Plano</th>
              <th className="text-left px-6 py-3">Créditos</th>
              <th className="text-left px-6 py-3">Cadastro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {recentUsers?.map(u => (
              <tr key={u.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-3 text-white/80">{u.email}</td>
                <td className="px-6 py-3">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide ${
                    u.plan === 'subscription' ? 'bg-accent/20 text-accent'
                    : u.plan === 'package'    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/10 text-white/40'
                  }`}>
                    {u.plan}
                  </span>
                </td>
                <td className="px-6 py-3 text-white/60">{u.credits}</td>
                <td className="px-6 py-3 text-white/40 text-xs">{formatDate(u.created_at)}</td>
              </tr>
            ))}
            {(!recentUsers || recentUsers.length === 0) && (
              <tr><td colSpan={4} className="text-center py-8 text-white/30">Nenhum usuário ainda</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

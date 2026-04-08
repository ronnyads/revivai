export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'

export default async function AdminOrders() {
  const supabase = await createClient()
  const { data: orders } = await supabase
    .from('orders')
    .select('*, users(email)')
    .order('created_at', { ascending: false })

  const totalRevenue = orders?.filter(o => o.status === 'paid').reduce((s, o) => s + o.amount, 0) ?? 0

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-normal tracking-tight mb-1">Pedidos</h1>
          <p className="text-white/40 text-sm">{orders?.length ?? 0} pedidos · {formatCurrency(totalRevenue)} receita total</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-white/30 uppercase tracking-widest border-b border-white/10">
              <th className="text-left px-6 py-4">Cliente</th>
              <th className="text-left px-6 py-4">Tipo</th>
              <th className="text-left px-6 py-4">Valor</th>
              <th className="text-left px-6 py-4">Status</th>
              <th className="text-left px-6 py-4">Data</th>
              <th className="text-left px-6 py-4">ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {orders?.map(o => (
              <tr key={o.id} className="hover:bg-white/[0.04] transition-colors">
                <td className="px-6 py-4 text-white/70">{(o as any).users?.email ?? '—'}</td>
                <td className="px-6 py-4">
                  <span className="text-[11px] bg-white/10 text-white/60 px-2.5 py-1 rounded-full">
                    {o.type === 'per_photo' ? 'Pay-per-foto' : o.type === 'subscription' ? 'Assinatura' : 'Pacote'}
                  </span>
                </td>
                <td className="px-6 py-4 font-semibold text-[#D94F2E]">{formatCurrency(o.amount)}</td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
                    o.status === 'paid'    ? 'bg-green-500/20 text-green-400'
                    : o.status === 'failed' ? 'bg-red-500/20 text-red-400'
                    : 'bg-white/10 text-white/40'
                  }`}>{o.status}</span>
                </td>
                <td className="px-6 py-4 text-white/40 text-xs">{formatDate(o.created_at)}</td>
                <td className="px-6 py-4 text-white/20 text-[11px] font-mono">{o.stripe_id?.slice(0, 20)}...</td>
              </tr>
            ))}
            {(!orders || orders.length === 0) && (
              <tr><td colSpan={6} className="text-center py-16 text-white/20">Nenhum pedido ainda</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

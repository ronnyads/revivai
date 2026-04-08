export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

export default async function AdminUsers() {
  const supabase = await createClient()
  const { data: users, count } = await supabase
    .from('users')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-normal tracking-tight mb-1">Usuários</h1>
        <p className="text-white/40 text-sm">{count ?? 0} usuários cadastrados</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-white/30 uppercase tracking-widest border-b border-white/10">
              <th className="text-left px-6 py-4">E-mail</th>
              <th className="text-left px-6 py-4">Plano</th>
              <th className="text-left px-6 py-4">Créditos</th>
              <th className="text-left px-6 py-4">Cadastro</th>
              <th className="text-left px-6 py-4">ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {users?.map(u => (
              <tr key={u.id} className="hover:bg-white/[0.04] transition-colors">
                <td className="px-6 py-4 text-white/80 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#D94F2E]/20 flex items-center justify-center text-[#D94F2E] text-xs font-bold flex-shrink-0">
                    {u.email?.[0]?.toUpperCase()}
                  </div>
                  {u.email}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide ${
                    u.plan === 'subscription' ? 'bg-[#D94F2E]/20 text-[#D94F2E]'
                    : u.plan === 'package'    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/10 text-white/40'
                  }`}>{u.plan}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-semibold ${u.credits > 0 ? 'text-white' : 'text-white/30'}`}>{u.credits}</span>
                </td>
                <td className="px-6 py-4 text-white/40 text-xs">{formatDate(u.created_at)}</td>
                <td className="px-6 py-4 text-white/20 text-[11px] font-mono">{u.id.slice(0, 16)}...</td>
              </tr>
            ))}
            {(!users || users.length === 0) && (
              <tr><td colSpan={5} className="text-center py-16 text-white/20">Nenhum usuário ainda</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

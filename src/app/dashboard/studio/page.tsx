export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Megaphone, Trash2, Clock } from 'lucide-react'
import { StudioProject } from '@/types'
import NewProjectButton from '@/components/studio/NewProjectButton'

export default async function StudioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: rows } = await supabase
    .from('studio_projects')
    .select('*, studio_assets(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const projects: StudioProject[] = (rows ?? []).map((p: any) => ({
    ...p,
    asset_count: p.studio_assets?.[0]?.count ?? 0,
  }))

  const templateLabels: Record<string, string> = {
    blank:            'Em branco',
    before_after:     'Antes & Depois',
    testimonial:      'Depoimento',
    product_showcase: 'Showcase de Produto',
  }

  const templateColors: Record<string, string> = {
    blank:            'bg-zinc-800',
    before_after:     'bg-violet-900/40',
    testimonial:      'bg-emerald-900/40',
    product_showcase: 'bg-amber-900/40',
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Megaphone size={22} className="text-accent" />
            <h1 className="text-2xl font-bold">Ad Studio</h1>
            <span className="text-[10px] bg-accent text-white px-2 py-0.5 rounded-full font-medium">BETA</span>
          </div>
          <p className="text-zinc-400 text-sm">Crie anúncios UGC de alta conversão com IA</p>
        </div>
        <NewProjectButton />
      </div>

      {/* Template picker (criar novo) */}
      <div className="mb-10">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4 font-medium">Criar novo projeto</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: 'blank',            icon: '✦', label: 'Em Branco',         desc: 'Comece do zero' },
            { id: 'before_after',     icon: '↔️', label: 'Antes & Depois',   desc: 'Mostre a transformação' },
            { id: 'testimonial',      icon: '💬', label: 'Depoimento',        desc: 'Script + imagem + voz' },
            { id: 'product_showcase', icon: '🛍️', label: 'Showcase',         desc: 'Fotos + vídeo + legenda' },
          ].map(t => (
            <NewProjectButton key={t.id} template={t.id} variant="card">
              <div className={`${templateColors[t.id]} border border-zinc-700 rounded-2xl p-4 hover:border-accent/50 transition-all cursor-pointer group`}>
                <div className="text-2xl mb-2">{t.icon}</div>
                <p className="text-sm font-semibold text-white group-hover:text-accent transition-colors">{t.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{t.desc}</p>
              </div>
            </NewProjectButton>
          ))}
        </div>
      </div>

      {/* Projetos existentes */}
      {projects.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4 font-medium">Meus projetos</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <Link
                key={project.id}
                href={`/dashboard/studio/${project.id}`}
                className="group block"
              >
                <div className={`${templateColors[project.template] ?? 'bg-zinc-800'} border border-zinc-700 rounded-2xl p-5 hover:border-accent/40 transition-all`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-white group-hover:text-accent transition-colors truncate max-w-[180px]">
                        {project.title}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {templateLabels[project.template] ?? project.template}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-500 bg-zinc-800/80 px-2 py-1 rounded-lg">
                      {project.asset_count} cards
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Clock size={12} />
                    {new Date(project.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🎬</div>
          <p className="text-zinc-400 text-sm">Nenhum projeto ainda. Escolha um template acima para começar.</p>
        </div>
      )}
    </div>
  )
}

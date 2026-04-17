export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Megaphone, Sparkles, Layout, MessageSquare, ShoppingBag, Layers, Plus } from 'lucide-react'
import { StudioProject } from '@/types'
import NewProjectButton from '@/components/studio/NewProjectButton'
import ProjectCard from '@/components/studio/ProjectCard'

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

  const templates = [
    { 
      id: 'blank', 
      icon: <Layers className="w-6 h-6 text-indigo-400" />, 
      label: 'Novo Projeto', 
      desc: 'Comece uma criação do zero absoluto',
      color: 'from-indigo-500/20 to-violet-500/20',
      border: 'border-indigo-500/30'
    },
    { 
      id: 'before_after', 
      icon: <Sparkles className="w-6 h-6 text-violet-400" />, 
      label: 'Antes & Depois', 
      desc: 'Mostre a evolução real do seu produto',
      color: 'from-violet-500/10 to-transparent'
    },
    { 
      id: 'testimonial', 
      icon: <MessageSquare className="w-6 h-6 text-emerald-400" />, 
      label: 'Depoimento UGC', 
      desc: 'Venda através de prova social real',
      color: 'from-emerald-500/10 to-transparent'
    },
    { 
      id: 'product_showcase', 
      icon: <ShoppingBag className="w-6 h-6 text-amber-400" />, 
      label: 'Showcase', 
      desc: 'Foco total nas features do produto',
      color: 'from-amber-500/10 to-transparent'
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-indigo-500/30">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        .font-sans { font-family: 'DM Sans', sans-serif; }
        .nebula-glow {
          position: absolute;
          top: -100px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          height: 300px;
          background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.05) 50%, transparent 100%);
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
      `}} />

      <div className="nebula-glow" />

      {/* Header Premium */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Megaphone size={20} className="text-indigo-400" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-white to-zinc-500 bg-clip-text text-transparent">
                  Ad Studio
                </h1>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-bold tracking-widest uppercase">BETA PRO</span>
              </div>
            </div>
          </div>
          <p className="text-zinc-500 text-lg max-w-xl leading-relaxed">
            Engine de criação de anúncios UGC de alta performance impulsionada por IA.
          </p>
        </div>
        <NewProjectButton />
      </div>

      {/* Bento Grid Creation Hub */}
      <div className="relative z-10 mb-20">
        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
          <Layout size={14} /> Criar Novo Projeto
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {templates.map((t, idx) => (
            <NewProjectButton key={t.id} template={t.id} variant="card" className={`${idx === 0 ? 'md:col-span-3' : 'md:col-span-1'}`}>
              <div className={`h-full relative group overflow-hidden rounded-3xl border ${t.border || 'border-zinc-800'} bg-zinc-950 p-8 transition-all duration-500 hover:border-indigo-500/50 hover:shadow-[0_0_40px_-15px_rgba(99,102,241,0.3)]`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${t.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className={`w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                    {t.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                      {t.label}
                      <Plus size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-indigo-400" />
                    </h3>
                    <p className="text-sm text-zinc-500 max-w-[200px] group-hover:text-zinc-400 transition-colors">
                      {t.desc}
                    </p>
                  </div>
                </div>
              </div>
            </NewProjectButton>
          ))}
        </div>
      </div>

      {/* Projetos Grid */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
            <Layers size={14} /> Meus Projetos
          </h2>
          <div className="h-px flex-1 mx-6 bg-gradient-to-r from-zinc-800 to-transparent opacity-50" />
        </div>
        
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                templateLabel={templateLabels[project.template] ?? project.template}
                templateColor="bg-zinc-950/50"
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/30 backdrop-blur-sm">
            <div className="w-20 h-20 bg-indigo-500/5 border border-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Megaphone size={32} className="text-indigo-400/50" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Sua jornada começa aqui</h3>
            <p className="text-zinc-500 text-sm max-w-xs mx-auto mb-8">Escolha um dos modelos acima para criar seu primeiro anúncio profissional.</p>
            <NewProjectButton />
          </div>
        )}
      </div>
    </div>
  )
}

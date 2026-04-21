'use client'

import { Megaphone, Sparkles, Layout, MessageSquare, ShoppingBag, Layers, Plus } from 'lucide-react'
import { StudioProject } from '@/types'
import NewProjectButton from '@/components/studio/NewProjectButton'
import ProjectCard from '@/components/studio/ProjectCard'
import { useT } from '@/contexts/LanguageContext'

interface Props {
  projects: StudioProject[]
}

export default function StudioPageContent({ projects }: Props) {
  const t = useT()

  const templateLabels: Record<string, string> = {
    blank:            t('tpl_blank'),
    before_after:     t('tpl_before_after'),
    testimonial:      t('tpl_testimonial'),
    product_showcase: t('tpl_product_showcase'),
  }

  const templates = [
    {
      id: 'blank',
      icon: <Layers className="w-6 h-6 text-neutral-600" />,
      label: t('studio_tpl_blank_label'),
      desc: t('studio_tpl_blank_desc'),
    },
    {
      id: 'before_after',
      icon: <Sparkles className="w-6 h-6 text-neutral-600" />,
      label: t('studio_tpl_ba_label'),
      desc: t('studio_tpl_ba_desc'),
    },
    {
      id: 'testimonial',
      icon: <MessageSquare className="w-6 h-6 text-neutral-600" />,
      label: t('studio_tpl_ugc_label'),
      desc: t('studio_tpl_ugc_desc'),
    },
    {
      id: 'product_showcase',
      icon: <ShoppingBag className="w-6 h-6 text-neutral-600" />,
      label: t('studio_tpl_showcase_label'),
      desc: t('studio_tpl_showcase_desc'),
    },
  ]

  return (
    <div className="min-h-screen bg-[#F8F6F1] font-sans">

      {/* Page Header */}
      <div className="bg-white border-b border-neutral-100 px-8 md:px-12 py-10 mb-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400 mb-2">REVIVAI — AD STUDIO</p>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-neutral-900 font-display">Criar Novo Projeto</h1>
              <span className="text-[9px] bg-neutral-900 text-white px-2 py-1 font-bold tracking-widest uppercase">PRO</span>
            </div>
            <p className="text-sm text-neutral-500 mt-1">{t('studio_subtitle')}</p>
          </div>
          <NewProjectButton />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 md:px-12">

      {/* Templates Grid */}
      <div className="mb-16">
        <p className="text-[10px] font-bold text-neutral-400 tracking-[0.3em] uppercase mb-6">{t('studio_create_section')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map((tpl) => (
            <NewProjectButton key={tpl.id} template={tpl.id} variant="card">
              <div className="h-full bg-white border border-neutral-100 p-8 group hover:border-neutral-900 hover:shadow-md transition-all duration-500 text-left">
                <div className="w-12 h-12 bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-6 group-hover:bg-neutral-900 transition-colors duration-500">
                  {tpl.icon}
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-2 uppercase tracking-tight">
                  {tpl.label}
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {tpl.desc}
                </p>
              </div>
            </NewProjectButton>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="pb-16">
        <p className="text-[10px] font-bold text-neutral-400 tracking-[0.3em] uppercase mb-6">{t('studio_projects_section')}</p>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                templateLabel={templateLabels[project.template] ?? project.template}
                templateColor="bg-neutral-50"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-neutral-200 bg-white">
            <div className="w-20 h-20 bg-neutral-50 border border-neutral-100 flex items-center justify-center mx-auto mb-6">
              <Megaphone size={32} className="text-neutral-300" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2 font-display">{t('studio_empty_title')}</h3>
            <p className="text-neutral-400 text-sm max-w-xs mx-auto mb-8">{t('studio_empty_sub')}</p>
            <NewProjectButton />
          </div>
        )}
      </div>
    </div>
    </div>
  )
}

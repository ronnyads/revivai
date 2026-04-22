'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Clock3, Copy, FileText, Globe, Layers3 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { StudioProject } from '@/types'

const STUDIO_PROMPT_STORAGE_KEY = 'revivai-selected-prompt-template'

const TEMPLATE_CARDS = [
  {
    id: 'testimonial',
    title: 'Casting Editorial',
    description: 'Composicoes de moda experimental com foco em iluminacao volumetrica e texturas organicas.',
    tag: 'editorial',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBI3XXYTbjp5ruhCZQoQQBxy0kE2mhFqrAJ5r_Q7ZaeNvq42f9Ag_898ASQ4olkBL_FuPcLP31lqXi_-M-Hsvw4AO64feJs8UqWotxHZVmo-ynxKREHlrRuSRoeJPDtz9SG-jADrEUgmSvseVmDu-1fgggC-VK9rsLa_B7uNDXa5SIWHA_ncqumJMG_owPwlQOs0GMlN88RVlzYWVRAOZV6K7YvO7st_e2vWMIBi9xk_gXzc0GQYdzpJwEDAIxTHoEdjgNA0KmM1bsk',
  },
  {
    id: 'before_after',
    title: 'Social Cinema',
    description: 'Narrativas curtas com estetica cinematografica para redes de alta performance e engajamento.',
    tag: 'video',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDRgfgTvCqctfeVTvNtmEDqape_LP7zDO0c8Gy-rTP4KHvoUpekkYgIMQkb7VaMnKdf_BiikRMNymj4TOh-kaNNEx0IJ9QJmTQgphniMoPPKMWWSqABoFLLKy-jS7DThNs2vsURJV90cLAHcutospZImYEIagpUWmKprrTb_zeah4Jbk9or-5qxuvBZh1YhpPHs110K6JS5I0DdnuUFCWntlmKR0_N-uv9ruryGPlJzFmz0mrQuaJ_zhykGKoLbn0DHoMyscbGjoGtx',
  },
  {
    id: 'product_showcase',
    title: 'Product Vision',
    description: 'Renderizacao de produtos com foco em precisao tecnica e apelo visual tecnologico de luxo.',
    tag: 'product',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCUl-KSEPgcRMtggmBIR7F5soafEbCxtXaq2uXQI-LH9YwH_kr_L8Q9zAxOVjqhRsHDO5YU8aVB-4yCKAUD1qBejoyM4SpIOtK5JX0hSWU-8pQpCXdjYGoguonZ0tZqLA1XRmF8uVpcFq_fNye9bVbbVAJrfNvhW5XQiZ_PAgHtdQaH6frU_WUFDtOXC1n2D5c-rNnosxJEV-chO7pRuJUTJ_P3XBN3c2aNd5ZusOU7bzKChUF-0qRmTBMmLV_xeQRUgJs2Jf9JSR-d',
  },
  {
    id: 'blank',
    title: 'Brand Identity',
    description: 'Desenvolvimento de sistemas visuais escalaveis para marcas que habitam o ecossistema digital.',
    tag: 'branding',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDTR-0w_xaXvMWR20AmmOeHQ0QkW_5RjQsCIich74ipAk6WT2Sc-bYJaR6JR0ujKiNwmsfMTwX3CH5ooFC1uJMfl8za4RkuM5Gg4MpaWZtt8MCmDSydD7yU-lA-tWB7iXAkWbYNoLso9criM7QGjTA7BKPsF19wTzw_kBWNJVtHJsXf7oKvPZiW_SJAutjSzMi3DbPE1Y0fkydSOtyq_ato1s-7PH-270IDrKXgDexJXYX6GHLJeMdFI5l6UwJbx0OJSKkEcEWSLJex',
  },
] as const

const TABS = [
  { id: 'templates', label: 'Visao Geral' },
  { id: 'drafts', label: 'Fluxo' },
  { id: 'published', label: 'Equipe' },
] as const

function formatRelativeTime(dateString: string) {
  const timestamp = new Date(dateString).getTime()
  const diff = Date.now() - timestamp

  if (diff < 60_000) return 'agora'

  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes} min atras`

  const hours = Math.floor(diff / 3_600_000)
  if (hours < 24) return `${hours} h atras`

  const days = Math.floor(diff / 86_400_000)
  return `${days} d atras`
}

export default function StudioPageContent({ initialProjects }: { initialProjects: StudioProject[] }) {
  const [activeTab, setActiveTab] = useState<'templates' | 'drafts' | 'published'>('templates')
  const [projects] = useState(initialProjects)
  const [isCreating, setIsCreating] = useState(false)
  const [pendingPrompt, setPendingPrompt] = useState<{ title: string; category: string; prompt: string } | null>(null)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const router = useRouter()

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [projects],
  )
  const featuredProjects = sortedProjects.slice(0, 3)

  useEffect(() => {
    const raw = window.localStorage.getItem(STUDIO_PROMPT_STORAGE_KEY)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as { title: string; category: string; prompt: string }
      if (parsed?.title && parsed?.prompt) setPendingPrompt(parsed)
    } catch {
      window.localStorage.removeItem(STUDIO_PROMPT_STORAGE_KEY)
    }
  }, [])

  async function handleCopyPendingPrompt() {
    if (!pendingPrompt) return
    await navigator.clipboard.writeText(pendingPrompt.prompt)
    setCopiedPrompt(true)
    window.setTimeout(() => setCopiedPrompt(false), 1800)
  }

  function handleDismissPendingPrompt() {
    window.localStorage.removeItem(STUDIO_PROMPT_STORAGE_KEY)
    setPendingPrompt(null)
    setCopiedPrompt(false)
  }

  const handleCreateProject = async (template = 'blank', title = 'Novo Projeto') => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/studio/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, template }),
      })

      const data = await response.json()
      if (data.project) {
        router.push(`/dashboard/studio/${data.project.id}`)
      }
    } catch (error) {
      console.error('Erro ao criar projeto:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="border-b border-white/6 bg-[#050505]/92 px-6 py-5 backdrop-blur-xl lg:px-10">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-6">
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">WORKSPACE</h1>
            <div className="hidden h-8 w-px bg-white/8 xl:block" />
            <p className="font-label text-[11px] text-white/38">Novo projeto</p>
            <div className="obsidian-chip hidden rounded-[14px] px-4 py-2 xl:flex xl:items-center xl:gap-3">
              <span className="font-label text-[11px] text-[#54D6F6]">901 CR</span>
              <span className="font-label text-[10px] text-white/28">creditos restantes</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-6 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`font-label border-b-2 pb-3 text-[11px] transition-colors ${
                    activeTab === tab.id ? 'border-[#00ADCC] text-[#54D6F6]' : 'border-transparent text-white/34 hover:text-white/72'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleCreateProject()}
              disabled={isCreating}
              className="rounded-full bg-cyan-gradient px-5 py-3 font-label text-xs text-[#003641] transition-transform duration-300 hover:-translate-y-0.5 disabled:opacity-60"
            >
              {isCreating ? 'Criando...' : 'Novo Ativo'}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-6 py-10 xl:px-10">
        {pendingPrompt ? (
          <div className="panel-card mb-8 flex flex-col gap-4 border border-[#54D6F6]/16 bg-[linear-gradient(135deg,rgba(84,214,246,0.12),rgba(17,17,17,0.96)_42%)] p-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <p className="font-label text-[10px] uppercase tracking-[0.24em] text-[#54D6F6]">prompt selecionado da galeria</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white">{pendingPrompt.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#A7B6BA]">
                Categoria: {pendingPrompt.category}. O prompt ja veio com voce para o studio e pode ser colado no card certo quando abrir o canvas.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCopyPendingPrompt}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-label text-[11px] uppercase tracking-[0.2em] text-white transition-colors hover:border-[#54D6F6]/35 hover:text-[#54D6F6]"
              >
                <Copy size={14} />
                {copiedPrompt ? 'Copiado' : 'Copiar prompt'}
              </button>
              <button
                type="button"
                onClick={handleDismissPendingPrompt}
                className="rounded-full border border-white/10 bg-transparent px-5 py-3 font-label text-[11px] uppercase tracking-[0.2em] text-white/62 transition-colors hover:border-white/20 hover:text-white"
              >
                dispensar
              </button>
            </div>
          </div>
        ) : null}

        {activeTab === 'templates' && (
          <div className="space-y-8">
            {featuredProjects.length > 0 ? (
              <section className="panel-card p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-[0.24em] text-[#54D6F6]">progresso salvo</p>
                    <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">Continue de onde voce parou</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('drafts')}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 font-label text-[11px] uppercase tracking-[0.2em] text-white/72 transition-colors hover:border-[#54D6F6]/30 hover:text-[#54D6F6]"
                  >
                    ver fluxo
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  {featuredProjects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => router.push(`/dashboard/studio/${project.id}`)}
                      className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(17,17,17,0.96),rgba(10,10,10,0.96))] p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[#54D6F6]/24"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full border border-[#54D6F6]/16 bg-[#0C171A] px-3 py-1 font-label text-[10px] uppercase tracking-[0.2em] text-[#54D6F6]">
                          autosave ativo
                        </span>
                        <span className="font-label text-[10px] text-white/30">{project.asset_count ?? 0} cards</span>
                      </div>

                      <h3 className="mt-4 font-display text-2xl font-bold tracking-tight text-white">{project.title}</h3>
                      <p className="mt-2 text-sm text-white/42">{project.template}</p>

                      <div className="mt-6 flex items-center justify-between text-[11px] text-white/42">
                        <span className="inline-flex items-center gap-2">
                          <Clock3 size={12} className="text-[#54D6F6]" />
                          Atualizado {formatRelativeTime(project.updated_at)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[#54D6F6]">
                          Retomar <ArrowUpRight size={12} />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="font-label text-[10px] uppercase tracking-[0.24em] text-white/30">modelos base</p>
                  <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">Comece rapido, sem cards gigantes</h2>
                </div>
                <p className="hidden max-w-md text-right text-sm leading-relaxed text-white/38 lg:block">
                  Escolha um ponto de partida operacional e entre no board ja com estrutura pronta para continuar editando.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
                {TEMPLATE_CARDS.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleCreateProject(template.id, template.title)}
                    disabled={isCreating}
                    className="group panel-card overflow-hidden text-left transition-transform duration-300 hover:-translate-y-1 disabled:opacity-50"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img
                        src={template.image}
                        alt={template.title}
                        className="h-full w-full object-cover grayscale transition-all duration-500 group-hover:scale-[1.03] group-hover:grayscale-0"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent" />
                      <div className="absolute left-4 top-4 border border-[#00ADCC]/25 bg-black/50 px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.2em] text-[#54D6F6]">
                        {template.tag}
                      </div>
                    </div>
                    <div className="px-5 py-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-display text-[28px] font-bold leading-none tracking-tight text-white">{template.title}</h3>
                        <Layers3 size={16} className="text-[#54D6F6]/70" />
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-white/42">{template.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'drafts' && (
          <div className="space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-label text-[10px] uppercase tracking-[0.24em] text-[#54D6F6]">rascunhos e boards ativos</p>
                <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white">Tudo salvo para voce retomar</h2>
              </div>
              <p className="hidden max-w-md text-right text-sm leading-relaxed text-white/38 lg:block">
                Alteracoes de cards, conexoes e campos editados continuam associadas ao projeto para o cliente nao perder o trabalho ao voltar.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {sortedProjects.length > 0 ? (
                sortedProjects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => router.push(`/dashboard/studio/${project.id}`)}
                    className="panel-card flex flex-col gap-4 p-6 text-left transition-transform duration-300 hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-[#54D6F6]/16 bg-[#0C171A] px-3 py-1 font-label text-[10px] uppercase tracking-[0.2em] text-[#54D6F6]">
                          fluxo salvo
                        </span>
                        <span className="font-label text-[10px] text-white/28">{project.asset_count ?? 0} cards</span>
                      </div>
                      <span className="font-label text-[10px] text-white/28">{formatRelativeTime(project.updated_at)}</span>
                    </div>

                    <div>
                      <h3 className="font-display text-2xl font-bold tracking-tight text-white">{project.title}</h3>
                      <p className="mt-2 text-sm text-white/40">{project.template}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/6 pt-4">
                      <span className="inline-flex items-center gap-2 text-[11px] text-white/40">
                        <Clock3 size={12} className="text-[#54D6F6]" />
                        Ultima atividade {new Date(project.updated_at).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="inline-flex items-center gap-2 font-label text-[11px] uppercase tracking-[0.18em] text-[#54D6F6]">
                        abrir board
                        <ArrowUpRight size={12} />
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="panel-card col-span-full flex min-h-[260px] flex-col items-center justify-center px-8 text-center">
                  <FileText size={28} className="text-[#54D6F6]" />
                  <p className="mt-6 font-label text-[11px] text-white/38">Nenhum fluxo salvo ainda</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'published' && (
          <div className="panel-card flex min-h-[260px] flex-col items-center justify-center px-8 text-center">
            <Globe size={30} className="text-[#54D6F6]" />
            <p className="mt-6 font-label text-[11px] text-white/38">Nenhuma equipe publicada ainda</p>
          </div>
        )}
      </div>
    </div>
  )
}

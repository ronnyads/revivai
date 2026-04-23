import Link from 'next/link'
import { ArrowUpRight, Camera, CheckCircle2, Clock3, CreditCard, Download, FolderKanban, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { getCommercialPlanLabel } from '@/lib/plan-labels'
import type { Photo, StudioProject } from '@/types'

type DashboardMetric = {
  label: string
  value: string
  hint: string
}

type DashboardPhoto = Pick<
  Photo,
  'id' | 'status' | 'created_at' | 'original_url' | 'restored_url' | 'colorization_url' | 'upscale_url'
>

type DashboardProject = Pick<StudioProject, 'id' | 'title' | 'updated_at' | 'status'> & {
  asset_count?: number
}

const PHOTO_STATUS_LABELS: Record<DashboardPhoto['status'], string> = {
  pending: 'Aguardando',
  processing: 'Processando',
  done: 'Concluida',
  error: 'Erro',
}

function getPhotoDisplayUrl(photo: DashboardPhoto) {
  return photo.upscale_url || photo.colorization_url || photo.restored_url || photo.original_url
}

function formatRelativeDate(value: string) {
  const target = new Date(value).getTime()
  const now = Date.now()
  const diffMs = target - now
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))

  if (Math.abs(diffHours) < 24) {
    return new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  return new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(diffDays, 'day')
}

function metricValue(value: number) {
  return value.toLocaleString('pt-BR')
}

export default function DashboardContent({
  credits,
  plan,
  totalPhotos,
  completedPhotos,
  processingPhotos,
  totalProjects,
  recentPhotos,
  recentProjects,
  latestPaidOrderAmount = null,
}: {
  credits: number
  plan: string
  totalPhotos: number
  completedPhotos: number
  processingPhotos: number
  totalProjects: number
  recentPhotos: DashboardPhoto[]
  recentProjects: DashboardProject[]
  latestPaidOrderAmount?: number | null
}) {
  const metrics: DashboardMetric[] = [
    {
      label: 'Creditos disponiveis',
      value: `${metricValue(credits)} CR`,
      hint: 'Saldo real da conta para novas geracoes.',
    },
    {
      label: 'Fotos na biblioteca',
      value: metricValue(totalPhotos),
      hint: 'Total de arquivos do usuario no fluxo de restauracao.',
    },
    {
      label: 'Restauracoes prontas',
      value: metricValue(completedPhotos),
      hint: 'Fotos com processamento concluido.',
    },
    {
      label: 'Projetos no studio',
      value: metricValue(totalProjects),
      hint: 'Boards reais salvos no Ad Studio.',
    },
  ]

  const hasActivity = totalPhotos > 0 || totalProjects > 0 || processingPhotos > 0
  const resolvedPlan = getCommercialPlanLabel(plan, { latestPaidAmount: latestPaidOrderAmount, credits })

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-6 py-8 md:px-10 lg:px-14">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        <section className="panel-card border border-white/6 bg-[#111111]/92 p-6 md:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="font-label text-[10px] uppercase tracking-[0.38em] text-[#54D6F6]">workspace real</p>
              <h1 className="mt-3 text-4xl font-semibold uppercase tracking-[-0.04em] text-white md:text-5xl">
                Seu painel operacional em tempo real
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#9EADB1] md:text-base">
                Nada aqui e cenografico. Creditos, restauracoes e projetos refletem exatamente o estado atual da conta.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/upload"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-gradient px-5 py-3 font-label text-[11px] uppercase tracking-[0.3em] text-[#041014] transition-transform hover:scale-[1.01]"
              >
                <Camera size={16} />
                nova restauracao
              </Link>
              <Link
                href="/dashboard/studio"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 font-label text-[11px] uppercase tracking-[0.3em] text-white transition-colors hover:border-[#54D6F6]/25 hover:text-[#54D6F6]"
              >
                abrir studio
                <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
                <p className="font-label text-[10px] uppercase tracking-[0.26em] text-[#54D6F6]">{metric.label}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{metric.value}</p>
                <p className="mt-2 text-xs leading-relaxed text-white/35">{metric.hint}</p>
              </div>
            ))}
          </div>
        </section>

        <aside className="panel-card border border-white/6 bg-[linear-gradient(155deg,rgba(84,214,246,0.12),rgba(17,17,17,0.96)_38%)] p-6">
          <p className="font-label text-[10px] uppercase tracking-[0.32em] text-[#54D6F6]">conta</p>
          <h2 className="mt-3 text-2xl font-semibold uppercase tracking-[-0.04em] text-white">{resolvedPlan}</h2>
          <p className="mt-4 text-sm leading-relaxed text-[#A7B6BA]">
            O painel acompanha a conta em tempo real para evitar numeros inflados ou historicos falsos em contas novas.
          </p>

          <div className="mt-6 space-y-3">
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="font-label text-[10px] uppercase tracking-[0.24em] text-[#7D8B90]">creditos atuais</p>
              <p className="mt-2 text-white">{metricValue(credits)} CR</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="font-label text-[10px] uppercase tracking-[0.24em] text-[#7D8B90]">processando agora</p>
              <p className="mt-2 text-white">{metricValue(processingPhotos)} item(ns)</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <p className="font-label text-[10px] uppercase tracking-[0.24em] text-[#7D8B90]">proxima acao</p>
              <p className="mt-2 text-white">
                {hasActivity ? 'Continue do ponto em que parou.' : 'Envie sua primeira imagem para iniciar o historico.'}
              </p>
            </div>
          </div>
        </aside>
      </div>

      {!hasActivity ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="panel-card border border-white/6 bg-[#111111]/92 p-8">
            <span className="obsidian-chip border-[#54D6F6]/20 bg-[#0C171A] text-[#54D6F6]">conta nova</span>
            <h2 className="mt-5 max-w-xl text-3xl font-semibold uppercase tracking-[-0.04em] text-white">
              Seu dashboard ainda nao tem restauracoes nem projetos salvos
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#A7B6BA]">
              Assim que voce enviar fotos ou criar boards no studio, este painel passa a mostrar somente dados reais da conta.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard/upload"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-gradient px-5 py-3 font-label text-[11px] uppercase tracking-[0.3em] text-[#041014] transition-transform hover:scale-[1.01]"
              >
                <Camera size={16} />
                enviar primeira foto
              </Link>
              <Link
                href="/dashboard/studio"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 font-label text-[11px] uppercase tracking-[0.3em] text-white transition-colors hover:border-[#54D6F6]/25 hover:text-[#54D6F6]"
              >
                criar primeiro projeto
                <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>

          <div className="panel-card border border-white/6 bg-[#111111]/92 p-8">
            <p className="font-label text-[10px] uppercase tracking-[0.32em] text-[#54D6F6]">resumo inicial</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-white/55">Plano</p>
                <p className="mt-2 text-xl font-semibold text-white">{resolvedPlan}</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm text-white/55">Creditos</p>
                <p className="mt-2 text-xl font-semibold text-white">{metricValue(credits)} CR</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_minmax(0,1.85fr)]">
          <section className="panel-card border border-white/6 bg-[#111111]/92 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-label text-[10px] uppercase tracking-[0.28em] text-[#54D6F6]">studio</p>
                <h2 className="mt-3 text-2xl font-semibold uppercase tracking-[-0.04em] text-white">Projetos recentes</h2>
              </div>
              <Link
                href="/dashboard/studio"
                className="inline-flex items-center gap-2 font-label text-[11px] uppercase tracking-[0.24em] text-[#54D6F6] transition-colors hover:text-white"
              >
                ver studio
                <ArrowUpRight size={14} />
              </Link>
            </div>

            <div className="mt-6 space-y-3">
              {recentProjects.length > 0 ? (
                recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/studio/${project.id}`}
                    className="flex items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-[#54D6F6]/20 hover:bg-white/[0.05]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{project.title}</p>
                      <p className="mt-1 text-xs text-white/35">
                        Atualizado {formatRelativeDate(project.updated_at)} • {project.asset_count ?? 0} card(s)
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-[#54D6F6]">
                      <FolderKanban size={16} />
                      <ArrowUpRight size={14} />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-white/35">
                  Nenhum projeto criado no studio ainda.
                </div>
              )}
            </div>
          </section>

          <section className="panel-card border border-white/6 bg-[#111111]/92 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-label text-[10px] uppercase tracking-[0.28em] text-[#54D6F6]">biblioteca</p>
                <h2 className="mt-3 text-2xl font-semibold uppercase tracking-[-0.04em] text-white">Fotos recentes</h2>
              </div>
              <Link
                href="/dashboard/upload"
                className="inline-flex items-center gap-2 font-label text-[11px] uppercase tracking-[0.24em] text-[#54D6F6] transition-colors hover:text-white"
              >
                nova foto
                <ArrowUpRight size={14} />
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {recentPhotos.length > 0 ? (
                recentPhotos.map((photo) => {
                  const displayUrl = getPhotoDisplayUrl(photo)
                  const isDone = photo.status === 'done'

                  return (
                    <article key={photo.id} className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
                      <div className="relative aspect-[4/3] overflow-hidden bg-black/20">
                        <img src={displayUrl} alt="Foto recente" className="h-full w-full object-cover" />
                        <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/55 px-3 py-1 font-label text-[10px] uppercase tracking-[0.22em] text-white/85">
                          {PHOTO_STATUS_LABELS[photo.status]}
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-white">{formatDate(photo.created_at)}</p>
                          <p className="text-xs text-white/35">{formatRelativeDate(photo.created_at)}</p>
                        </div>

                        <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
                          {photo.status === 'processing' ? <Loader2 size={14} className="animate-spin" /> : null}
                          {photo.status === 'done' ? <CheckCircle2 size={14} className="text-emerald-400" /> : null}
                          {photo.status === 'pending' ? <Clock3 size={14} /> : null}
                          {photo.status === 'error' ? <CreditCard size={14} /> : null}
                          <span>{PHOTO_STATUS_LABELS[photo.status]}</span>
                        </div>

                        {isDone && photo.restored_url ? (
                          <a
                            href={photo.restored_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 font-label text-[11px] uppercase tracking-[0.22em] text-white transition-colors hover:border-[#54D6F6]/20 hover:text-[#54D6F6]"
                          >
                            <Download size={13} />
                            baixar
                          </a>
                        ) : null}
                      </div>
                    </article>
                  )
                })
              ) : (
                <div className="md:col-span-2 rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-white/35">
                  Nenhuma foto recente encontrada.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

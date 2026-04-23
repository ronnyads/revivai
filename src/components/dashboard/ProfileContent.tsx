import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Clock3,
  CreditCard,
  Fingerprint,
  FolderKanban,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import type { ComponentType } from 'react'
import LogoutButton from '@/components/dashboard/LogoutButton'
import { formatDate } from '@/lib/utils'

type ProfileContentProps = {
  displayName: string
  email: string
  avatarUrl: string | null
  initials: string
  plan: string
  planLabel: string
  credits: number
  photosCount: number
  projectsCount: number
  assetsCount: number
  providerLabel: string
  emailVerified: boolean
  createdAt: string
  lastSignInAt: string | null
  userId: string
}

const PLAN_BADGE_STYLES: Record<string, string> = {
  free: 'border-white/10 bg-white/[0.04] text-white/70',
  subscription: 'border-[#54D6F6]/18 bg-[#0C171A] text-[#54D6F6]',
  package: 'border-[#ffb877]/18 bg-[#24170b] text-[#ffb877]',
}

const statCards = [
  {
    label: 'Créditos disponíveis',
    icon: CreditCard,
    helper: 'Saldo real da conta para novas gerações.',
  },
  {
    label: 'Fotos na biblioteca',
    icon: Camera,
    helper: 'Total de imagens registradas no histórico.',
  },
  {
    label: 'Projetos no Studio',
    icon: FolderKanban,
    helper: 'Boards e campanhas salvas no ambiente de criação.',
  },
  {
    label: 'Assets do Studio',
    icon: Sparkles,
    helper: 'Elementos, cenas e variações vinculadas ao usuário.',
  },
]

function metricValue(value: number) {
  return value.toLocaleString('pt-BR')
}

function formatAuthDate(value: string | null) {
  if (!value) return 'Não informado'
  return formatDate(value)
}

export default function ProfileContent({
  displayName,
  email,
  avatarUrl,
  initials,
  plan,
  planLabel,
  credits,
  photosCount,
  projectsCount,
  assetsCount,
  providerLabel,
  emailVerified,
  createdAt,
  lastSignInAt,
  userId,
}: ProfileContentProps) {
  const planBadgeStyle = PLAN_BADGE_STYLES[plan] ?? PLAN_BADGE_STYLES.free
  const joinedAt = formatDate(createdAt)
  const lastAccess = formatAuthDate(lastSignInAt)

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 pb-32 pt-6 sm:px-6 lg:px-8 lg:pb-10">
      <header className="mb-8 border-b border-white/6 pb-6 md:mb-10 md:pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#54D6F6]/18 bg-[#0C171A] px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.24em] text-[#54D6F6]">
            Central de Identidade
          </span>
          <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.24em] text-white/58">
            Stitch / Studio Lab
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <h1 className="font-display text-4xl font-semibold uppercase tracking-[-0.05em] text-white md:text-6xl">
              Configurações de perfil
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#A7B6BA] md:text-base">
              Tudo que importa sobre sua conta em um painel limpo: identidade, plano, créditos e estado de acesso, com
              dados carregados diretamente da conta.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2.5 font-label text-[10px] uppercase tracking-[0.22em] text-white/72 transition-all hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
            >
              <ArrowLeft size={14} />
              Painel
            </Link>
            <Link
              href="/dashboard/studio"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#ffb877]/18 bg-[#24170b] px-4 py-2.5 font-label text-[10px] uppercase tracking-[0.22em] text-[#ffb877] transition-all hover:border-[#ffb877]/30 hover:bg-[#2c1d11]"
            >
              <ArrowRight size={14} />
              Studio
            </Link>
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#54D6F6]/18 bg-[#0C171A] px-4 py-2.5 font-label text-[10px] uppercase tracking-[0.22em] text-[#54D6F6] transition-all hover:border-[#54D6F6]/30 hover:bg-[#102228]"
            >
              <CreditCard size={14} />
              Plano
            </Link>
          </div>
        </div>
      </header>

      <section className="mb-10 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <div className="panel-card rounded-[28px] border border-white/6 bg-[#111111]/92 p-5 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center">
              <div className="relative shrink-0">
                <div className="relative flex size-28 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(84,214,246,0.14),rgba(255,255,255,0.03))] text-3xl font-semibold text-white md:size-32">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt={displayName} fill sizes="128px" unoptimized className="object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 flex size-10 items-center justify-center rounded-full border border-[#54D6F6]/20 bg-[#0C171A] text-[#54D6F6] shadow-[0_14px_32px_rgba(84,214,246,0.14)]">
                  <UserRound size={18} />
                </div>
              </div>

              <div className="min-w-0">
                <p className="font-label text-[10px] uppercase tracking-[0.28em] text-[#54D6F6]">Conta ativa</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white md:text-4xl">
                  {displayName}
                </h2>
                <p className="mt-2 break-all text-sm text-[#A7B6BA] md:text-base">{email}</p>
                <p className="mt-1 font-label text-[10px] uppercase tracking-[0.24em] text-white/32">
                  ID {userId.slice(0, 8)}...
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <span
                className={`rounded-full border px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.18em] ${planBadgeStyle}`}
              >
                {planLabel}
              </span>
              <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.18em] text-white/58">
                {providerLabel}
              </span>
              <span
                className={`rounded-full border px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.18em] ${
                  emailVerified
                    ? 'border-emerald-400/18 bg-emerald-500/12 text-emerald-300'
                    : 'border-amber-400/18 bg-amber-500/12 text-amber-200'
                }`}
              >
                {emailVerified ? 'Email verificado' : 'Email pendente'}
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <MetaTile label="Créditos" value={`${metricValue(credits)} CR`} />
            <MetaTile label="Conta criada" value={joinedAt} />
            <MetaTile label="Último acesso" value={lastAccess} />
          </div>

          <div className="mt-6 rounded-[22px] border border-white/8 bg-black/18 p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-label text-[10px] uppercase tracking-[0.24em] text-white/32">Resumo operacional</p>
              <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 font-label text-[9px] uppercase tracking-[0.2em] text-white/48">
                dados reais
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#bcc9cd]">
              Credenciais, saldo e atividade da conta são carregados diretamente do banco para manter o perfil fiel ao
              estado atual da sua sessão.
            </p>
          </div>
        </div>

        <div className="panel-card rounded-[28px] border border-white/6 bg-[#111111]/92 p-5 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-label text-[10px] uppercase tracking-[0.28em] text-[#54D6F6]">Snapshot da conta</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-white">Perfil em foco</h2>
            </div>
            <div className="rounded-full border border-[#54D6F6]/18 bg-[#0C171A] px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.24em] text-[#54D6F6]">
              {metricValue(photosCount)} fotos
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <InfoRow label="Plano atual" value={planLabel} tone="cyan" />
            <InfoRow label="Provedor" value={providerLabel} tone="neutral" />
            <InfoRow
              label="Email"
              value={emailVerified ? 'Verificado' : 'Pendente'}
              tone={emailVerified ? 'good' : 'warn'}
            />
            <InfoRow label="Conta criada" value={joinedAt} tone="neutral" />
            <InfoRow label="Último acesso" value={lastAccess} tone="neutral" />
          </div>

          <div className="mt-6 rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
            <p className="font-label text-[10px] uppercase tracking-[0.24em] text-white/32">Acesso rápido</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                href="/dashboard/studio"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#ffb877]/18 bg-[#24170b] px-4 py-3 font-label text-[10px] uppercase tracking-[0.2em] text-[#ffb877] transition-all hover:border-[#ffb877]/30 hover:bg-[#2c1d11]"
              >
                <Sparkles size={14} />
                Abrir Studio
              </Link>
              <Link
                href="/dashboard/billing"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#54D6F6]/18 bg-[#0C171A] px-4 py-3 font-label text-[10px] uppercase tracking-[0.2em] text-[#54D6F6] transition-all hover:border-[#54D6F6]/30 hover:bg-[#102228]"
              >
                <CreditCard size={14} />
                Ver plano
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-6 flex items-center gap-3 font-label text-[10px] uppercase tracking-[0.32em] text-white/45">
          <span className="size-2 rounded-full bg-[#54D6F6]" />
          Estatísticas
        </h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={statCards[0].label}
            helper={statCards[0].helper}
            icon={statCards[0].icon}
            value={`${metricValue(credits)} CR`}
            accent="cyan"
          />
          <StatCard
            label={statCards[1].label}
            helper={statCards[1].helper}
            icon={statCards[1].icon}
            value={metricValue(photosCount)}
            accent="cyan"
          />
          <StatCard
            label={statCards[2].label}
            helper={statCards[2].helper}
            icon={statCards[2].icon}
            value={metricValue(projectsCount)}
            accent="amber"
          />
          <StatCard
            label={statCards[3].label}
            helper={statCards[3].helper}
            icon={statCards[3].icon}
            value={metricValue(assetsCount)}
            accent="amber"
          />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-6 flex items-center gap-3 font-label text-[10px] uppercase tracking-[0.32em] text-white/45">
          <span className="size-2 rounded-full bg-[#ffb877]" />
          Protocolos de segurança
        </h2>

        <div className="grid gap-4 lg:grid-cols-2">
          <SecurityRow
            icon={ShieldCheck}
            title="Validação de email"
            description="A confirmação do endereço principal define o estado de confiança da conta."
            status={emailVerified ? 'Verificado' : 'Aguardando'}
            statusTone={emailVerified ? 'good' : 'warn'}
          />
          <SecurityRow
            icon={Fingerprint}
            title="Método de autenticação"
            description="A sessão atual foi iniciada pelo provedor vinculado ao perfil ativo."
            status={providerLabel}
            statusTone="neutral"
          />
          <SecurityRow
            icon={Clock3}
            title="Último acesso"
            description="Registro de atividade mais recente disponível na sessão."
            status={lastAccess}
            statusTone="neutral"
          />
        </div>
      </section>

      <footer className="border-t border-white/8 pt-6 md:pt-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-label text-[10px] uppercase tracking-[0.28em] text-white/32">Ações finais</p>
            <p className="mt-2 text-sm text-[#9EADB1]">Navegação rápida para os pontos mais usados da conta.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-5 py-3 font-label text-[10px] uppercase tracking-[0.2em] text-white/78 transition-all hover:border-white/15 hover:bg-white/[0.05] hover:text-white"
            >
              <ArrowLeft size={14} />
              Painel
            </Link>
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#54D6F6]/18 bg-[#0C171A] px-5 py-3 font-label text-[10px] uppercase tracking-[0.2em] text-[#54D6F6] transition-all hover:border-[#54D6F6]/35 hover:bg-[#102228]"
            >
              <CreditCard size={14} />
              Plano
            </Link>
            <Link
              href="/dashboard/studio"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#ffb877]/18 bg-[#24170b] px-5 py-3 font-label text-[10px] uppercase tracking-[0.2em] text-[#ffb877] transition-all hover:border-[#ffb877]/35 hover:bg-[#2c1d11]"
            >
              <ArrowRight size={14} />
              Studio
            </Link>
            <div className="min-w-0 sm:min-w-[170px]">
              <LogoutButton />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
      <p className="font-label text-[9px] uppercase tracking-[0.22em] text-white/32">{label}</p>
      <p className="mt-3 break-words text-sm font-medium text-white">{value}</p>
    </div>
  )
}

function StatCard({
  label,
  helper,
  icon: Icon,
  value,
  accent,
}: {
  label: string
  helper: string
  icon: ComponentType<{ size?: number; className?: string }>
  value: string
  accent: 'cyan' | 'amber'
}) {
  const accentStyles =
    accent === 'cyan'
      ? 'border-[#54D6F6]/20 text-[#54D6F6] bg-[#0C171A]'
      : 'border-[#ffb877]/20 text-[#ffb877] bg-[#24170b]'

  return (
    <div className="rounded-[24px] border border-white/6 bg-white/[0.03] p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-label text-[10px] uppercase tracking-[0.24em] text-[#54D6F6]">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p>
        </div>
        <div className={`flex size-11 items-center justify-center rounded-[18px] border ${accentStyles}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-white/35">{helper}</p>
    </div>
  )
}

function SecurityRow({
  icon: Icon,
  title,
  description,
  status,
  statusTone,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
  status: string
  statusTone: 'good' | 'warn' | 'neutral'
}) {
  const toneClass =
    statusTone === 'good'
      ? 'border-emerald-400/18 bg-emerald-500/12 text-emerald-300'
      : statusTone === 'warn'
        ? 'border-amber-400/18 bg-amber-500/12 text-amber-200'
        : 'border-white/8 bg-white/[0.03] text-white/72'

  return (
    <div className="flex flex-col gap-4 rounded-[24px] border border-white/6 bg-[#111111]/92 p-5 md:flex-row md:items-center md:justify-between md:p-6">
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-[18px] border border-white/8 bg-white/[0.03] text-[#54D6F6]">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-[#A7B6BA]">{description}</p>
        </div>
      </div>

      <span
        className={`inline-flex w-fit rounded-full border px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.18em] ${toneClass}`}
      >
        {status}
      </span>
    </div>
  )
}

function InfoRow({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'cyan' | 'good' | 'warn' | 'neutral'
}) {
  const toneLabel =
    tone === 'cyan' ? 'Ativo' : tone === 'good' ? 'Seguro' : tone === 'warn' ? 'Atenção' : 'Base'

  const toneClass =
    tone === 'cyan'
      ? 'border-[#54D6F6]/18 bg-[#0C171A] text-[#54D6F6]'
      : tone === 'good'
        ? 'border-emerald-400/18 bg-emerald-500/12 text-emerald-300'
        : tone === 'warn'
          ? 'border-amber-400/18 bg-amber-500/12 text-amber-200'
          : 'border-white/8 bg-white/[0.03] text-white/72'

  return (
    <div className="flex items-center justify-between gap-4 rounded-[20px] border border-white/6 bg-white/[0.03] px-4 py-3">
      <div className="min-w-0">
        <p className="font-label text-[9px] uppercase tracking-[0.22em] text-white/32">{label}</p>
        <p className="mt-1 break-words text-sm text-white">{value}</p>
      </div>
      <span
        className={`shrink-0 rounded-full border px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.18em] ${toneClass}`}
      >
        {toneLabel}
      </span>
    </div>
  )
}

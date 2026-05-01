'use client'

import type { ReactNode } from 'react'
import clsx from 'clsx'

type AccentTone = 'orange' | 'violet' | 'blue' | 'cyan' | 'indigo' | 'emerald'
type ChipTone = AccentTone | 'neutral' | 'success' | 'warning'

const ACCENT_STYLES: Record<AccentTone, {
  border: string
  bg: string
  text: string
  soft: string
  panel: string
}> = {
  orange: {
    border: 'border-orange-500/18',
    bg: 'bg-orange-500/10',
    text: 'text-orange-200',
    soft: 'bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.16),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0))]',
    panel: 'border-orange-500/14 bg-orange-500/[0.06]',
  },
  violet: {
    border: 'border-violet-500/18',
    bg: 'bg-violet-500/10',
    text: 'text-violet-200',
    soft: 'bg-[radial-gradient(circle_at_top_left,rgba(167,139,250,0.16),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0))]',
    panel: 'border-violet-500/14 bg-violet-500/[0.06]',
  },
  blue: {
    border: 'border-blue-500/18',
    bg: 'bg-blue-500/10',
    text: 'text-blue-200',
    soft: 'bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.16),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0))]',
    panel: 'border-blue-500/14 bg-blue-500/[0.06]',
  },
  cyan: {
    border: 'border-cyan-500/18',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-200',
    soft: 'bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0))]',
    panel: 'border-cyan-500/14 bg-cyan-500/[0.06]',
  },
  indigo: {
    border: 'border-indigo-500/18',
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-200',
    soft: 'bg-[radial-gradient(circle_at_top_left,rgba(129,140,248,0.16),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0))]',
    panel: 'border-indigo-500/14 bg-indigo-500/[0.06]',
  },
  emerald: {
    border: 'border-emerald-500/18',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-200',
    soft: 'bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.16),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0))]',
    panel: 'border-emerald-500/14 bg-emerald-500/[0.06]',
  },
}

const CHIP_STYLES: Record<ChipTone, string> = {
  orange: 'border-orange-500/18 bg-orange-500/10 text-orange-200',
  violet: 'border-violet-500/18 bg-violet-500/10 text-violet-200',
  blue: 'border-blue-500/18 bg-blue-500/10 text-blue-200',
  cyan: 'border-cyan-500/18 bg-cyan-500/10 text-cyan-200',
  indigo: 'border-indigo-500/18 bg-indigo-500/10 text-indigo-200',
  emerald: 'border-emerald-500/18 bg-emerald-500/10 text-emerald-200',
  neutral: 'border-white/8 bg-white/[0.04] text-white/60',
  success: 'border-emerald-500/18 bg-emerald-500/10 text-emerald-200',
  warning: 'border-amber-500/18 bg-amber-500/10 text-amber-200',
}

const PANEL_STYLES: Record<ChipTone, string> = {
  orange: 'border-orange-500/14 bg-orange-500/[0.06]',
  violet: 'border-violet-500/14 bg-violet-500/[0.06]',
  blue: 'border-blue-500/14 bg-blue-500/[0.06]',
  cyan: 'border-cyan-500/14 bg-cyan-500/[0.06]',
  indigo: 'border-indigo-500/14 bg-indigo-500/[0.06]',
  emerald: 'border-emerald-500/14 bg-emerald-500/[0.06]',
  neutral: 'border-white/8 bg-[#101214]',
  success: 'border-emerald-500/14 bg-emerald-500/[0.06]',
  warning: 'border-amber-500/14 bg-amber-500/[0.06]',
}

export function StudioFormShell({
  accent,
  title,
  description,
  icon,
  chips,
  action,
  hideHeader = false,
  layout = 'rail',
  media,
  controls,
  contentClassName,
  mediaColumnClassName,
  controlsColumnClassName,
}: {
  accent: AccentTone
  title: string
  description?: string
  icon?: ReactNode
  chips?: Array<{ label: string; tone?: ChipTone }>
  action?: ReactNode
  hideHeader?: boolean
  layout?: 'rail' | 'split'
  media: ReactNode
  controls: ReactNode
  contentClassName?: string
  mediaColumnClassName?: string
  controlsColumnClassName?: string
}) {
  const accentStyles = ACCENT_STYLES[accent]

  return (
    <div className={hideHeader ? '' : 'space-y-3'}>
      {!hideHeader ? (
        <div className={clsx('overflow-hidden rounded-[24px] border bg-[#0D0F10]', accentStyles.border)}>
          <div className={clsx('px-3.5 py-3', accentStyles.soft)}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2.5">
                  {icon ? (
                    <div className={clsx('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border', accentStyles.panel, accentStyles.text)}>
                      {icon}
                    </div>
                  ) : null}
                  <div className="min-w-0">
                    <h4 className="text-[14px] font-semibold tracking-tight text-white">{title}</h4>
                    {description ? (
                      <p className="mt-1 line-clamp-2 max-w-xl text-[10px] leading-relaxed text-white/44">{description}</p>
                    ) : null}
                  </div>
                </div>

                {chips && chips.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {chips.map((chip) => (
                      <StudioSummaryChip key={chip.label} tone={chip.tone ?? accent}>
                        {chip.label}
                      </StudioSummaryChip>
                    ))}
                  </div>
                ) : null}
              </div>

              {action ? <div className="shrink-0">{action}</div> : null}
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={clsx(
          'grid gap-3',
          layout === 'split'
            ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start'
            : 'grid-cols-[182px_minmax(0,1fr)]',
          contentClassName,
        )}
      >
        <div className={clsx('space-y-3', mediaColumnClassName)}>{media}</div>
        <div className={clsx('space-y-3', controlsColumnClassName)}>{controls}</div>
      </div>
    </div>
  )
}

export function StudioPanel({
  title,
  eyebrow,
  children,
  accent = 'neutral',
  compact = false,
}: {
  title?: string
  eyebrow?: string
  children: ReactNode
  accent?: ChipTone
  compact?: boolean
}) {
  return (
    <div
      className={clsx(
        'rounded-[20px] border',
        compact ? 'p-2.5' : 'p-3',
        PANEL_STYLES[accent],
      )}
    >
      {(eyebrow || title) ? (
        <div className="mb-2">
          {eyebrow ? (
            <p className="font-label text-[8px] uppercase tracking-[0.18em] text-white/32">{eyebrow}</p>
          ) : null}
          {title ? <h5 className="mt-0.5 text-[11px] font-semibold tracking-tight text-white">{title}</h5> : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}

export function StudioSummaryChip({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: ChipTone
}) {
  return (
    <span className={clsx('rounded-full border px-2.5 py-1 font-label text-[9px] uppercase tracking-[0.16em]', CHIP_STYLES[tone])}>
      {children}
    </span>
  )
}

export function StudioFieldLabel({
  children,
  trailing,
}: {
  children: ReactNode
  trailing?: ReactNode
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
      <label className="font-label text-[9px] uppercase tracking-[0.16em] text-white/40">{children}</label>
      {trailing ? <div className="text-[9px] font-semibold text-white/48">{trailing}</div> : null}
    </div>
  )
}

export function StudioHint({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'warning'
}) {
  return (
    <p className={clsx('px-0.5 text-[9px] leading-relaxed', tone === 'warning' ? 'text-amber-200/85' : 'text-white/42')}>
      {children}
    </p>
  )
}

export function StudioPrimaryButton({
  children,
  disabled,
  onClick,
  accent = 'orange',
  className,
}: {
  children: ReactNode
  disabled?: boolean
  onClick?: () => void
  accent?: AccentTone
  className?: string
}) {
  const gradientMap: Record<AccentTone, string> = {
    orange: 'from-orange-600 to-amber-500 shadow-[0_18px_44px_-18px_rgba(249,115,22,0.9)]',
    violet: 'from-violet-600 to-fuchsia-500 shadow-[0_18px_44px_-18px_rgba(139,92,246,0.9)]',
    blue: 'from-blue-600 to-indigo-500 shadow-[0_18px_44px_-18px_rgba(59,130,246,0.9)]',
    cyan: 'from-cyan-500 to-sky-500 shadow-[0_18px_44px_-18px_rgba(34,211,238,0.9)]',
    indigo: 'from-indigo-600 to-violet-500 shadow-[0_18px_44px_-18px_rgba(99,102,241,0.9)]',
    emerald: 'from-emerald-600 to-teal-500 shadow-[0_18px_44px_-18px_rgba(16,185,129,0.9)]',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[18px] bg-gradient-to-r px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition-all active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45',
        gradientMap[accent],
        className,
      )}
    >
      <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  )
}

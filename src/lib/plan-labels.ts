const PAID_ACCOUNT_PLANS = new Set(['subscription', 'package', 'starter', 'popular', 'pro', 'agency'])

function normalizeAmountCents(amount?: number | null) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return null
  return amount < 1000 ? Math.round(amount * 100) : Math.round(amount)
}

function labelFromPaidAmount(amount?: number | null) {
  const cents = normalizeAmountCents(amount)
  if (!cents) return null
  if (cents >= 39700) return 'Studio'
  if (cents >= 14900) return 'Pro'
  if (cents >= 7900) return 'Creator'
  if (cents >= 4700) return 'Rookie'
  return null
}

function labelFromCredits(credits?: number | null) {
  if (typeof credits !== 'number' || !Number.isFinite(credits)) return null
  if (credits >= 5100) return 'Studio'
  if (credits >= 2100) return 'Pro'
  if (credits >= 1100) return 'Creator'
  if (credits >= 600) return 'Rookie'
  return null
}

export function isPaidAccountPlan(plan?: string | null) {
  return PAID_ACCOUNT_PLANS.has(plan ?? '')
}

export function getCommercialPlanLabel(
  plan?: string | null,
  options: { latestPaidAmount?: number | null; credits?: number | null } = {},
) {
  if (plan === 'starter') return 'Rookie'
  if (plan === 'popular') return 'Creator'
  if (plan === 'pro') return 'Pro'
  if (plan === 'agency') return 'Studio'
  if (plan === 'subscription') return 'Assinatura'
  if (plan === 'package') {
    return labelFromPaidAmount(options.latestPaidAmount) ?? labelFromCredits(options.credits) ?? 'Rookie'
  }
  return 'Explorador'
}

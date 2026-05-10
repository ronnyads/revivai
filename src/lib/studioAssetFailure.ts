import { createAdminClient } from '@/lib/supabase/admin'

type StudioAssetFailureOptions = {
  admin?: ReturnType<typeof createAdminClient>
  assetId: string
  errorMsg: string
  refundReason?: string
  extraInputParams?: Record<string, unknown>
  publicErrorCode?: string
  publicErrorTitle?: string
  publicErrorMessage?: string
  supportDebugId?: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export async function markStudioAssetFailed({
  admin = createAdminClient(),
  assetId,
  errorMsg,
  refundReason,
  extraInputParams,
  publicErrorCode,
  publicErrorTitle,
  publicErrorMessage,
  supportDebugId,
}: StudioAssetFailureOptions) {
  const safeErrorMsg = errorMsg.slice(0, 500)

  const { data: asset, error: assetErr } = await admin
    .from('studio_assets')
    .select('id, user_id, credits_cost, input_params, status')
    .eq('id', assetId)
    .maybeSingle()

  if (assetErr) {
    console.warn(`[studio-fail] Falha ao buscar asset ${assetId}: ${assetErr.message}`)
    return { refunded: false, updated: false }
  }

  if (!asset) return { refunded: false, updated: false }

  const currentInputParams = asRecord(asset.input_params)
  let refunded = false
  let nextInputParams = {
    ...currentInputParams,
    ...(extraInputParams ?? {}),
  }

  if (publicErrorCode || publicErrorTitle || publicErrorMessage || supportDebugId) {
    nextInputParams = {
      ...nextInputParams,
      ...(publicErrorCode ? { public_error_code: publicErrorCode } : {}),
      ...(publicErrorTitle ? { public_error_title: publicErrorTitle } : {}),
      ...(publicErrorMessage ? { public_error_message: publicErrorMessage } : {}),
      ...(supportDebugId ? { support_debug_id: supportDebugId } : {}),
    }
  }

  const alreadyRefundedAt =
    typeof currentInputParams.credit_refunded_at === 'string'
      ? currentInputParams.credit_refunded_at
      : undefined

  if (!alreadyRefundedAt) {
    const creditCost = Number(asset.credits_cost ?? 0)
    if (creditCost > 0 && asset.user_id) {
      const { data: refundOk, error: refundErr } = await admin.rpc('add_credits', {
        user_id_param: asset.user_id,
        amount: creditCost,
      })

      const refundSucceeded = !refundErr && refundOk === true

      await admin.from('studio_refund_audit').insert({
        asset_id: assetId,
        user_id: asset.user_id,
        amount: creditCost,
        success: refundSucceeded,
        reason: refundReason ?? safeErrorMsg,
        error_detail: refundErr?.message ?? (!refundSucceeded ? 'add_credits returned false (0 rows updated)' : null),
      }).catch(() => {})

      if (!refundSucceeded) {
        console.error(`[studio-fail] REEMBOLSO FALHOU asset=${assetId} err=${refundErr?.message ?? '0 rows'}`)
        nextInputParams = {
          ...nextInputParams,
          credit_refund_pending: true,
          credit_refund_error: refundErr?.message ?? '0 rows updated',
          credit_refund_amount_pending: creditCost,
        }
      } else {
        refunded = true
        nextInputParams = {
          ...nextInputParams,
          credit_refunded_at: new Date().toISOString(),
          credit_refunded_amount: creditCost,
          credit_refund_reason: refundReason ?? safeErrorMsg,
        }
      }
    }
  }

  const { error: updateErr } = await admin
    .from('studio_assets')
    .update({
      status: 'error',
      error_msg: safeErrorMsg,
      input_params: nextInputParams,
    })
    .eq('id', assetId)

  if (updateErr) {
    console.warn(`[studio-fail] Falha ao atualizar asset ${assetId}: ${updateErr.message}`)
    return { refunded, updated: false }
  }

  return { refunded, updated: true }
}

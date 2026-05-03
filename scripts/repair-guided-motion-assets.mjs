import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GoogleAuth } from 'google-auth-library'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

function readEnvRaw() {
  const candidates = [
    path.join(repoRoot, '.env.vercel'),
    path.join(repoRoot, '.env.production.vercel'),
    path.join(repoRoot, '.env.local'),
  ]

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8')
    }
  }

  throw new Error('Nenhum arquivo de ambiente suportado foi encontrado para o reparo.')
}

function extractSimpleEnv(raw, key) {
  const match = raw.match(new RegExp(`^${key}=(.*)$`, 'm'))
  if (!match) return ''
  let value = match[1].trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }
  return value
}

function extractVertexCredentials(raw) {
  const blobMatch = raw.match(/GOOGLE_VERTEX_KEY="([\s\S]*?)"\r?\n[A-Z0-9_]+=+/)
  const blob = blobMatch?.[1] ?? ''
  if (!blob) {
    throw new Error('GOOGLE_VERTEX_KEY nao encontrado no ambiente.')
  }

  const field = (regex) => (blob.match(regex)?.[1] ?? '').trim()
  const privateKeyStartMarker = '"private_key": "'
  const privateKeyEndMarker = '",\\n  "client_email":'
  const privateKeyStart = blob.indexOf(privateKeyStartMarker)
  const privateKeyEnd = blob.indexOf(privateKeyEndMarker, privateKeyStart + privateKeyStartMarker.length)
  const privateKeyRaw = privateKeyStart >= 0 && privateKeyEnd > privateKeyStart
    ? blob.slice(privateKeyStart + privateKeyStartMarker.length, privateKeyEnd)
    : ''

  return {
    type: field(/"type": "([^"]+)"/),
    project_id: field(/"project_id": "([^"]+)"/),
    private_key_id: field(/"private_key_id": "([^"]+)"/),
    private_key: privateKeyRaw.replace(/\r?\n/g, '').replace(/\\n/g, '\n'),
    client_email: field(/"client_email": "([^"]+)"/),
    client_id: field(/"client_id": "([^"]+)"/),
    token_uri: field(/"token_uri": "([^"]+)"/),
  }
}

function createSupabaseAdmin(rawEnv) {
  const url = extractSimpleEnv(rawEnv, 'NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = extractSimpleEnv(rawEnv, 'SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao encontrados.')
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

async function getGoogleAccessToken(rawEnv) {
  const credentials = extractVertexCredentials(rawEnv)
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
  return auth.getAccessToken()
}

async function fetchGooglePredictOperation(operationName, token) {
  const match = operationName.match(
    /^(projects\/[^/]+\/locations\/[^/]+\/(?:endpoints\/[^/]+|publishers\/[^/]+\/models\/[^/]+))\/operations\/[^/]+$/,
  )
  if (!match) {
    throw new Error(`Nao foi possivel derivar o endpoint do operationName: ${operationName}`)
  }

  const endpoint = match[1]
  const response = await fetch(`https://aiplatform.googleapis.com/v1/${endpoint}:fetchPredictOperation`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ operationName }),
  })

  const text = await response.text()
  const json = text ? JSON.parse(text) : null
  return { response, json }
}

function extractPersistableVeoResult(candidate) {
  if (typeof candidate === 'string' && candidate.trim()) {
    return {
      externalUrl: candidate,
      inlineBytesBase64: null,
      mimeType: 'video/mp4',
    }
  }

  if (!candidate || typeof candidate !== 'object') return null

  const mimeType = typeof candidate.mimeType === 'string' && candidate.mimeType.trim()
    ? candidate.mimeType
    : 'video/mp4'

  if (typeof candidate.gcsUri === 'string' && candidate.gcsUri.trim()) {
    return {
      externalUrl: candidate.gcsUri,
      inlineBytesBase64: null,
      mimeType,
    }
  }

  if (typeof candidate.uri === 'string' && candidate.uri.trim()) {
    return {
      externalUrl: candidate.uri,
      inlineBytesBase64: null,
      mimeType,
    }
  }

  if (typeof candidate.bytesBase64Encoded === 'string' && candidate.bytesBase64Encoded.trim()) {
    return {
      externalUrl: null,
      inlineBytesBase64: candidate.bytesBase64Encoded,
      mimeType,
    }
  }

  return null
}

function extractVeoResult(json) {
  const response = json?.response && typeof json.response === 'object' ? json.response : {}
  const directVideos = Array.isArray(response.videos) ? response.videos : []
  const generatedVideos = Array.isArray(response.generatedVideos) ? response.generatedVideos : []
  const generatedSamples = Array.isArray(response.generateVideoResponse?.generatedSamples)
    ? response.generateVideoResponse.generatedSamples
    : []

  const directVideoResult = extractPersistableVeoResult(directVideos[0])
  if (directVideoResult) return directVideoResult

  const generatedVideoResult = extractPersistableVeoResult(generatedVideos[0]?.video)
  if (generatedVideoResult) return generatedVideoResult

  const generatedSampleResult = extractPersistableVeoResult(generatedSamples[0]?.video)
  if (generatedSampleResult) return generatedSampleResult

  return null
}

async function persistVideoToStudioStorage(supabase, source, userId, assetId) {
  const buffer = source.inlineBytesBase64
    ? Buffer.from(source.inlineBytesBase64, 'base64')
    : await (async () => {
      const response = await fetch(source.externalUrl)
      if (!response.ok) return null
      return Buffer.from(await response.arrayBuffer())
    })()

  if (!buffer) {
    return source.externalUrl
  }

  const storagePath = `${userId}/${assetId}-result.mp4`
  const { error } = await supabase.storage.from('studio').upload(storagePath, buffer, {
    contentType: source.mimeType || 'video/mp4',
    upsert: true,
  })
  if (error) {
    if (source.externalUrl) return source.externalUrl
    throw new Error(`Falha ao salvar video inline no Supabase: ${error.message}`)
  }

  const { data } = supabase.storage.from('studio').getPublicUrl(storagePath)
  return data.publicUrl
}

async function refundIfNeeded(supabase, asset, inputParams, reason) {
  if (typeof inputParams.credit_refunded_at === 'string' && inputParams.credit_refunded_at.trim()) {
    return inputParams
  }

  const creditCost = Number(asset.credits_cost ?? 0)
  if (creditCost <= 0 || !asset.user_id) return inputParams

  const { error } = await supabase.rpc('add_credits', {
    user_id_param: asset.user_id,
    amount: creditCost,
  })

  if (error) {
    console.warn(`[repair-guided-motion] reembolso falhou para ${asset.id}: ${error.message}`)
    return inputParams
  }

  return {
    ...inputParams,
    credit_refunded_at: new Date().toISOString(),
    credit_refunded_amount: creditCost,
    credit_refund_reason: reason,
  }
}

async function markAssetError(supabase, asset, errorMsg, refundReason, apply) {
  const inputParams = asset.input_params && typeof asset.input_params === 'object' ? asset.input_params : {}
  const nextInputParams = await refundIfNeeded(supabase, asset, inputParams, refundReason)

  if (!apply) {
    return {
      action: 'would_mark_error',
      assetId: asset.id,
      errorMsg,
    }
  }

  const { error } = await supabase
    .from('studio_assets')
    .update({
      status: 'error',
      error_msg: errorMsg.slice(0, 500),
      input_params: nextInputParams,
    })
    .eq('id', asset.id)

  if (error) {
    throw new Error(`Falha ao atualizar ${asset.id}: ${error.message}`)
  }

  return {
    action: 'marked_error',
    assetId: asset.id,
    errorMsg,
  }
}

async function markAssetDone(supabase, asset, resultUrl, apply) {
  if (!apply) {
    return {
      action: 'would_mark_done',
      assetId: asset.id,
      resultUrl,
    }
  }

  const { error } = await supabase
    .from('studio_assets')
    .update({
      status: 'done',
      result_url: resultUrl,
      last_frame_url: resultUrl,
      error_msg: null,
    })
    .eq('id', asset.id)

  if (error) {
    throw new Error(`Falha ao concluir ${asset.id}: ${error.message}`)
  }

  return {
    action: 'marked_done',
    assetId: asset.id,
    resultUrl,
  }
}

async function repairAnimateAsset({ supabase, asset, token, apply }) {
  const inputParams = asset.input_params && typeof asset.input_params === 'object' ? asset.input_params : {}
  const existingError = typeof asset.error_msg === 'string' ? asset.error_msg.trim() : ''
  const predictionId = typeof inputParams.prediction_id === 'string' ? inputParams.prediction_id : ''
  const provider = typeof inputParams.provider === 'string' ? inputParams.provider : ''
  const canRecheckGoogleResult = existingError
    && provider === 'google'
    && predictionId
    && !asset.result_url
    && /nao retornou uma url/i.test(existingError)

  if (existingError && !canRecheckGoogleResult) {
    return markAssetError(supabase, asset, existingError, 'repair-guided-motion:existing-error', apply)
  }

  if (!predictionId || provider !== 'google') {
    return markAssetError(
      supabase,
      asset,
      'Asset animate em processing sem prediction_id Google valido.',
      'repair-guided-motion:missing-prediction',
      apply,
    )
  }

  const { response, json } = await fetchGooglePredictOperation(predictionId, token)
  if (!response.ok) {
    return markAssetError(
      supabase,
      asset,
      'Veo3: operacao nao encontrada no Google ou job bloqueado. Tente gerar novamente.',
      'repair-guided-motion:google-operation-missing',
      apply,
    )
  }

  if (!json?.done) {
    return {
      action: 'still_processing',
      assetId: asset.id,
      providerStatus: 'processing',
    }
  }

  if (json.error) {
    return markAssetError(
      supabase,
      asset,
      json.error.message ?? 'Falha na geracao do Veo3',
      'repair-guided-motion:google-provider-error',
      apply,
    )
  }

  const raiFilteredCount = Number(
    json.response?.raiMediaFilteredCount
    ?? json.response?.generateVideoResponse?.raiMediaFilteredCount
    ?? 0,
  )
  const raiFiltered = Number.isFinite(raiFilteredCount) && raiFilteredCount > 0
  if (raiFiltered) {
    const reason = json.response?.raiMediaFilteredReasons?.[0]
      || json.response?.generateVideoResponse?.raiMediaFilteredReasons?.[0]
      || 'Bloqueado pelos filtros de seguranca do Google'
    return markAssetError(
      supabase,
      asset,
      `Seguranca Google: ${reason}`,
      'repair-guided-motion:google-safety-filter',
      apply,
    )
  }

  const finalResult = extractVeoResult(json)

  if (!finalResult) {
    return markAssetError(
      supabase,
      asset,
      'Google Veo concluiu a operacao, mas nao retornou uma URL nem bytes finais do video. Gere novamente.',
      'repair-guided-motion:google-missing-result-url',
      apply,
    )
  }

  const permanentUrl = apply
    ? await persistVideoToStudioStorage(supabase, finalResult, asset.user_id, asset.id)
    : (finalResult.externalUrl || '[inline-bytes]')

  return markAssetDone(supabase, asset, permanentUrl, apply)
}

async function main() {
  const apply = process.argv.includes('--apply')
  const assetIdIndex = process.argv.indexOf('--asset')
  const targetAssetId = assetIdIndex >= 0 ? process.argv[assetIdIndex + 1] : ''
  const rawEnv = readEnvRaw()
  const supabase = createSupabaseAdmin(rawEnv)
  const token = await getGoogleAccessToken(rawEnv)

  let query = supabase
    .from('studio_assets')
    .select('id, user_id, type, status, error_msg, result_url, credits_cost, input_params, created_at')
    .eq('type', 'animate')
    .order('created_at', { ascending: false })

  if (targetAssetId) {
    query = query.eq('id', targetAssetId)
  } else {
    query = query.eq('status', 'processing')
  }

  const { data: assets, error } = await query

  if (error) {
    throw new Error(`Falha ao carregar assets animate: ${error.message}`)
  }

  const results = []
  for (const asset of assets ?? []) {
    try {
      results.push(await repairAnimateAsset({ supabase, asset, token, apply }))
    } catch (repairError) {
      results.push({
        action: 'repair_failed',
        assetId: asset.id,
        error: repairError instanceof Error ? repairError.message : String(repairError),
      })
    }
  }

  console.log(JSON.stringify({
    apply,
    total: results.length,
    results,
  }, null, 2))
}

main().catch((error) => {
  console.error('[repair-guided-motion] fatal:', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})

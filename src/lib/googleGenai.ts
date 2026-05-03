import { GoogleAuth } from 'google-auth-library'

export type GoogleGenAIProvider = 'vertex' | 'direct'

export type GoogleGenAIErrorCode =
  | 'vertex_unavailable'
  | 'vertex_quota_exceeded'
  | 'vertex_model_not_mapped'
  | 'direct_gemini_blocked_by_policy'
  | 'direct_gemini_api_key_missing'

export class GoogleGenAIError extends Error {
  code: GoogleGenAIErrorCode
  feature?: string
  model?: string
  provider: GoogleGenAIProvider
  status?: number

  constructor(params: {
    code: GoogleGenAIErrorCode
    message: string
    provider: GoogleGenAIProvider
    feature?: string
    model?: string
    status?: number
  }) {
    super(params.message)
    this.name = 'GoogleGenAIError'
    this.code = params.code
    this.feature = params.feature
    this.model = params.model
    this.provider = params.provider
    this.status = params.status
  }
}

interface VertexProjectConfig {
  projectId: string
  location: string
  accessToken: string
}

interface GoogleGenAIPolicy {
  provider: GoogleGenAIProvider
  allowDirectGemini: boolean
  vertexProjectId?: string
  vertexLocation: string
  hasVertexKey: boolean
  hasDirectApiKey: boolean
}

interface GoogleGenerateContentParams {
  body: string | Record<string, unknown>
  feature: string
  model: string
}

interface GooglePredictParams {
  body: string | Record<string, unknown>
  feature: string
  model: string
}

interface GoogleFetchParams {
  body?: string | Record<string, unknown>
  feature: string
  init?: RequestInit
  model?: string
}

const DEFAULT_VERTEX_LOCATION = 'us-central1'

function isEnvFlagEnabled(value?: string): boolean {
  return value?.trim().toLowerCase() === 'true'
}

function getDirectGeminiApiKey(): string | null {
  return process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? null
}

function getVertexKey(): string | null {
  return process.env.GOOGLE_VERTEX_KEY ?? null
}

function normalizeBody(body?: string | Record<string, unknown>): string | undefined {
  if (body == null) return undefined
  return typeof body === 'string' ? body : JSON.stringify(body)
}

function parseVertexCredentials(raw: string): Record<string, unknown> {
  const normalized = raw.startsWith('"') && raw.endsWith('"')
    ? JSON.parse(raw)
    : raw
  return typeof normalized === 'string' ? JSON.parse(normalized) : normalized
}

function resolvePolicy(): GoogleGenAIPolicy {
  const provider = process.env.GOOGLE_GENAI_PROVIDER?.trim().toLowerCase() === 'direct'
    ? 'direct'
    : 'vertex'

  return {
    provider,
    allowDirectGemini: isEnvFlagEnabled(process.env.ALLOW_DIRECT_GEMINI),
    vertexProjectId: process.env.VERTEX_PROJECT_ID,
    vertexLocation: process.env.VERTEX_LOCATION || DEFAULT_VERTEX_LOCATION,
    hasVertexKey: !!getVertexKey(),
    hasDirectApiKey: !!getDirectGeminiApiKey(),
  }
}

export function getGoogleGenAIPolicy(): GoogleGenAIPolicy {
  return resolvePolicy()
}

export function isVertexGenerateContentModelSupported(model: string): boolean {
  const normalized = model.trim().toLowerCase()
  if (!normalized) return false
  if (normalized.startsWith('imagen')) return false  // imagen usa predict, não generateContent
  if (normalized.includes('lyria')) return false
  if (normalized.includes('veo')) return false
  return normalized.startsWith('gemini-')
}

export function assertDirectGeminiAllowed(params: { feature: string; model?: string }) {
  const policy = resolvePolicy()
  if (policy.allowDirectGemini) return

  throw new GoogleGenAIError({
    code: 'direct_gemini_blocked_by_policy',
    message: `Direct Gemini blocked by policy for feature=${params.feature}${params.model ? ` model=${params.model}` : ''}. Configure Vertex AI for this route or set ALLOW_DIRECT_GEMINI=true explicitly.`,
    provider: 'direct',
    feature: params.feature,
    model: params.model,
    status: 503,
  })
}

function buildVertexModelPath(model: string, projectId: string, location: string): string {
  if (model.startsWith('projects/')) return model
  if (model.startsWith('publishers/')) {
    return `projects/${projectId}/locations/${location}/${model}`
  }
  return `projects/${projectId}/locations/${location}/publishers/google/models/${model}`
}

async function resolveVertexProjectConfig(feature: string, model?: string): Promise<VertexProjectConfig> {
  const vertexKey = getVertexKey()
  if (!vertexKey) {
    throw new GoogleGenAIError({
      code: 'vertex_unavailable',
      message: `GOOGLE_VERTEX_KEY not configured for feature=${feature}${model ? ` model=${model}` : ''}.`,
      provider: 'vertex',
      feature,
      model,
      status: 503,
    })
  }

  let credentials: Record<string, unknown>
  try {
    credentials = parseVertexCredentials(vertexKey)
  } catch (error) {
    throw new GoogleGenAIError({
      code: 'vertex_unavailable',
      message: `Invalid GOOGLE_VERTEX_KEY JSON for feature=${feature}: ${error instanceof Error ? error.message : String(error)}`,
      provider: 'vertex',
      feature,
      model,
      status: 503,
    })
  }

  const projectId = process.env.VERTEX_PROJECT_ID || String(credentials.project_id ?? '')
  if (!projectId) {
    throw new GoogleGenAIError({
      code: 'vertex_unavailable',
      message: `VERTEX_PROJECT_ID not configured for feature=${feature}${model ? ` model=${model}` : ''}.`,
      provider: 'vertex',
      feature,
      model,
      status: 503,
    })
  }

  try {
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    })
    const client = await auth.getClient()
    const token = await client.getAccessToken()
    if (!token.token) {
      throw new Error('Google access token is empty')
    }

    return {
      projectId,
      location: process.env.VERTEX_LOCATION || DEFAULT_VERTEX_LOCATION,
      accessToken: token.token,
    }
  } catch (error) {
    throw new GoogleGenAIError({
      code: 'vertex_unavailable',
      message: `Vertex auth failed for feature=${feature}${model ? ` model=${model}` : ''}: ${error instanceof Error ? error.message : String(error)}`,
      provider: 'vertex',
      feature,
      model,
      status: 503,
    })
  }
}

function maybePromoteVertexQuotaError(errorText: string, feature: string, model: string): never {
  if (/429|quota|resource_exhausted|rate limit/i.test(errorText)) {
    throw new GoogleGenAIError({
      code: 'vertex_quota_exceeded',
      message: `Vertex quota exceeded for feature=${feature} model=${model}: ${errorText}`,
      provider: 'vertex',
      feature,
      model,
      status: 429,
    })
  }

  throw new GoogleGenAIError({
    code: 'vertex_unavailable',
    message: `Vertex request failed for feature=${feature} model=${model}: ${errorText}`,
    provider: 'vertex',
    feature,
    model,
    status: 503,
  })
}

async function fetchVertexAction(
  action: 'generateContent' | 'streamGenerateContent',
  params: GoogleFetchParams & { model: string },
): Promise<Response> {
  if (!isVertexGenerateContentModelSupported(params.model)) {
    throw new GoogleGenAIError({
      code: 'vertex_model_not_mapped',
      message: `Model ${params.model} is not mapped to Vertex ${action} for feature=${params.feature}.`,
      provider: 'vertex',
      feature: params.feature,
      model: params.model,
      status: 503,
    })
  }

  const vertex = await resolveVertexProjectConfig(params.feature, params.model)
  const modelPath = buildVertexModelPath(params.model, vertex.projectId, vertex.location)
  const suffix = action === 'streamGenerateContent' ? ':streamGenerateContent?alt=sse' : ':generateContent'
  const url = `https://${vertex.location}-aiplatform.googleapis.com/v1/${modelPath}${suffix}`
  const headers: HeadersInit = {
    Authorization: `Bearer ${vertex.accessToken}`,
    'Content-Type': 'application/json',
    'x-revivai-google-feature': params.feature,
  }

  const response = await fetch(url, {
    method: 'POST',
    ...params.init,
    headers: {
      ...headers,
      ...(params.init?.headers ?? {}),
    },
    body: normalizeBody(params.body),
  })

  if (!response.ok && response.status >= 400) {
    const errorText = await response.text()
    maybePromoteVertexQuotaError(errorText, params.feature, params.model)
  }

  console.log(`[google-genai] provider=vertex action=${action} feature=${params.feature} model=${params.model} project=${vertex.projectId} location=${vertex.location}`)
  return response
}

async function fetchVertexPredictAction(
  action: 'predict' | 'predictLongRunning',
  params: GoogleFetchParams & { model: string },
): Promise<Response> {
  const vertex = await resolveVertexProjectConfig(params.feature, params.model)
  const modelPath = buildVertexModelPath(params.model, vertex.projectId, vertex.location)
  const url = `https://${vertex.location}-aiplatform.googleapis.com/v1/${modelPath}:${action}`
  const response = await fetch(url, {
    method: 'POST',
    ...params.init,
    headers: {
      Authorization: `Bearer ${vertex.accessToken}`,
      'Content-Type': 'application/json',
      'x-revivai-google-feature': params.feature,
      ...(params.init?.headers ?? {}),
    },
    body: normalizeBody(params.body),
  })

  if (!response.ok && response.status >= 400) {
    const errorText = await response.text()
    maybePromoteVertexQuotaError(errorText, params.feature, params.model)
  }

  console.log(`[google-genai] provider=vertex action=${action} feature=${params.feature} model=${params.model} project=${vertex.projectId} location=${vertex.location}`)
  return response
}

function extractPredictEndpointFromOperationName(operationName: string): string | null {
  const match = operationName.match(
    /^(projects\/[^/]+\/locations\/[^/]+\/(?:endpoints\/[^/]+|publishers\/[^/]+\/models\/[^/]+))\/operations\/[^/]+$/,
  )
  return match?.[1] ?? null
}

async function fetchVertexPredictOperation(params: {
  operationName: string
  feature: string
}): Promise<Response> {
  const vertex = await resolveVertexProjectConfig(params.feature)
  const endpoint = extractPredictEndpointFromOperationName(params.operationName)

  if (!endpoint) {
    throw new GoogleGenAIError({
      code: 'vertex_unavailable',
      message: `Could not derive predict endpoint from operationName for feature=${params.feature}: ${params.operationName}`,
      provider: 'vertex',
      feature: params.feature,
      model: params.operationName,
      status: 503,
    })
  }

  const url = `https://aiplatform.googleapis.com/v1/${endpoint}:fetchPredictOperation`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${vertex.accessToken}`,
      'Content-Type': 'application/json',
      'x-revivai-google-feature': params.feature,
    },
    body: JSON.stringify({
      operationName: params.operationName,
    }),
  })

  if (!response.ok && response.status >= 400) {
    const errorText = await response.text()
    maybePromoteVertexQuotaError(errorText, params.feature, params.operationName)
  }

  console.log(
    `[google-genai] provider=vertex action=fetchPredictOperation feature=${params.feature} operation=${params.operationName} endpoint=${endpoint}`,
  )
  return response
}

async function fetchVertexOperation(params: {
  operationName: string
  feature: string
}): Promise<Response> {
  const vertex = await resolveVertexProjectConfig(params.feature)
  const url = `https://aiplatform.googleapis.com/v1/${params.operationName}`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${vertex.accessToken}`,
      'x-revivai-google-feature': params.feature,
    },
  })

  if (!response.ok && response.status >= 400) {
    const errorText = await response.text()
    maybePromoteVertexQuotaError(errorText, params.feature, params.operationName)
  }

  console.log(`[google-genai] provider=vertex action=operation.get feature=${params.feature} operation=${params.operationName} project=${vertex.projectId} location=${vertex.location}`)
  return response
}

async function fetchDirectGeminiAction(
  actionPath: string,
  params: GoogleFetchParams,
): Promise<Response> {
  assertDirectGeminiAllowed({ feature: params.feature, model: params.model })

  const apiKey = getDirectGeminiApiKey()
  if (!apiKey) {
    throw new GoogleGenAIError({
      code: 'direct_gemini_api_key_missing',
      message: `GOOGLE_API_KEY / GEMINI_API_KEY not configured for feature=${params.feature}${params.model ? ` model=${params.model}` : ''}.`,
      provider: 'direct',
      feature: params.feature,
      model: params.model,
      status: 503,
    })
  }

  const separator = actionPath.includes('?') ? '&' : '?'
  const url = `https://generativelanguage.googleapis.com/${actionPath}${separator}key=${apiKey}`
  console.warn(`[google-genai] provider=direct action=${actionPath} feature=${params.feature}${params.model ? ` model=${params.model}` : ''}`)
  return fetch(url, {
    method: params.body ? 'POST' : 'GET',
    ...params.init,
    headers: {
      'Content-Type': 'application/json',
      ...(params.init?.headers ?? {}),
    },
    body: normalizeBody(params.body),
  })
}

export async function fetchGoogleGenerateContent(params: GoogleGenerateContentParams): Promise<Response> {
  const policy = resolvePolicy()
  if (policy.provider === 'vertex') {
    try {
      return await fetchVertexAction('generateContent', params)
    } catch (error) {
      if (error instanceof GoogleGenAIError && error.code === 'vertex_model_not_mapped') {
        return fetchDirectGeminiAction(`v1beta/models/${params.model}:generateContent`, params)
      }
      throw error
    }
  }

  return fetchDirectGeminiAction(`v1beta/models/${params.model}:generateContent`, params)
}

export async function fetchGoogleStreamGenerateContent(params: GoogleGenerateContentParams): Promise<Response> {
  const policy = resolvePolicy()
  const init: RequestInit = {
    headers: { Accept: 'text/event-stream' },
  }

  if (policy.provider === 'vertex') {
    try {
      return await fetchVertexAction('streamGenerateContent', { ...params, init })
    } catch (error) {
      if (error instanceof GoogleGenAIError && error.code === 'vertex_model_not_mapped') {
        return fetchDirectGeminiAction(`v1beta/models/${params.model}:streamGenerateContent?alt=sse`, { ...params, init })
      }
      throw error
    }
  }

  return fetchDirectGeminiAction(`v1beta/models/${params.model}:streamGenerateContent?alt=sse`, { ...params, init })
}

export async function fetchGooglePredict(params: GooglePredictParams): Promise<Response> {
  const policy = resolvePolicy()
  if (policy.provider === 'vertex') {
    return fetchVertexPredictAction('predict', params)
  }

  return fetchDirectGeminiAction(`v1beta/models/${params.model}:predict`, params)
}

export async function fetchGooglePredictLongRunning(params: GooglePredictParams): Promise<Response> {
  const policy = resolvePolicy()
  if (policy.provider === 'vertex') {
    return fetchVertexPredictAction('predictLongRunning', params)
  }

  return fetchDirectGeminiAction(`v1beta/models/${params.model}:predictLongRunning`, params)
}

export async function fetchGoogleOperation(params: {
  operationName: string
  feature: string
}): Promise<Response> {
  const policy = resolvePolicy()
  if (policy.provider === 'vertex' && params.operationName.startsWith('projects/')) {
    if (extractPredictEndpointFromOperationName(params.operationName)) {
      return fetchVertexPredictOperation(params)
    }
    return fetchVertexOperation(params)
  }

  return fetchDirectGeminiAction(`v1beta/${params.operationName}`, {
    feature: params.feature,
  })
}

export async function fetchGoogleModelCatalog(params: {
  apiVersion: 'v1alpha' | 'v1beta'
  feature: string
}): Promise<Response> {
  return fetchDirectGeminiAction(`${params.apiVersion}/models?pageSize=200`, {
    feature: params.feature,
  })
}

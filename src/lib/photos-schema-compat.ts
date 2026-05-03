const PHOTOS_COMPAT_COLUMNS = new Set([
  'engine_profile',
  'analysis_model_id',
  'render_model_id',
  'upscale_model_id',
  'target_model_id',
  'photo_type',
  'restoration_risk',
  'confidence_flag',
])

type PhotoFilter = {
  column: string
  value: string
}

function extractMissingPhotosColumn(message: string): string | null {
  const match = message.match(/Could not find the '([^']+)' column of 'photos' in the schema cache/i)
  const column = match?.[1]?.trim()
  if (!column || !PHOTOS_COMPAT_COLUMNS.has(column)) return null
  return column
}

function omitUndefinedEntries(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
}

async function applyFilters(query: any, filters: PhotoFilter[]): Promise<any> {
  let current = query
  for (const filter of filters) {
    current = current.eq(filter.column, filter.value)
  }
  return current
}

export async function insertPhotoCompat(params: {
  client: any
  payload: Record<string, unknown>
  selectSingle?: boolean
}) {
  const workingPayload = { ...omitUndefinedEntries(params.payload) }

  while (true) {
    let query = params.client.from('photos').insert(workingPayload)
    if (params.selectSingle) {
      query = query.select().single()
    }

    const result = await query
    if (!result.error) {
      return result
    }

    const missingColumn = extractMissingPhotosColumn(result.error.message)
    if (!missingColumn || !(missingColumn in workingPayload)) {
      return result
    }

    delete workingPayload[missingColumn]
    console.warn(`[photos-schema-compat] insert retry without column=${missingColumn}`)
  }
}

export async function updatePhotoCompat(params: {
  client: any
  payload: Record<string, unknown>
  filters: PhotoFilter[]
}) {
  const workingPayload = { ...omitUndefinedEntries(params.payload) }

  while (true) {
    const baseQuery = params.client.from('photos').update(workingPayload)
    const result = await applyFilters(baseQuery, params.filters)

    if (!result.error) {
      return result
    }

    const missingColumn = extractMissingPhotosColumn(result.error.message)
    if (!missingColumn || !(missingColumn in workingPayload)) {
      return result
    }

    delete workingPayload[missingColumn]
    console.warn(`[photos-schema-compat] update retry without column=${missingColumn}`)
  }
}

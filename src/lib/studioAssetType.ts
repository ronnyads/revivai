import { AssetType } from '@/types'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function getPersistedStudioAssetType(type: AssetType): AssetType {
  return type === 'talking_video' ? 'video' : type
}

export function getLogicalStudioAssetType(type: unknown, inputParams?: unknown): AssetType {
  if (type === 'talking_video') return 'talking_video'

  const params = asRecord(inputParams)
  if (type === 'video' && params.asset_variant === 'talking_video') {
    return 'talking_video'
  }

  return String(type ?? 'image') as AssetType
}

export function mapStudioAssetType<T extends { type: unknown; input_params?: unknown }>(asset: T): T & { type: AssetType } {
  const logicalType = getLogicalStudioAssetType(asset.type, asset.input_params)
  if (logicalType === asset.type) return asset as T & { type: AssetType }
  return {
    ...asset,
    type: logicalType,
  }
}

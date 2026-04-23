import { AssetType } from '@/types'

export const STUDIO_WIDE_NODE_TYPES: AssetType[] = [
  'face',
  'join',
  'model',
  'script',
  'voice',
  'caption',
  'render',
  'music',
  'ugc_bundle',
  'scene',
  'compose',
  'angles',
  'video',
  'image',
  'upscale',
  'lipsync',
  'animate',
]

export const STUDIO_NODE_GRID_SPACING_X = 700
export const STUDIO_NODE_GRID_SPACING_Y = 460

export function getStudioNodeCardWidth(type: AssetType) {
  return STUDIO_WIDE_NODE_TYPES.includes(type) ? 620 : 320
}

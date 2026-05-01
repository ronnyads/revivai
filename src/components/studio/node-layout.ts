import { AssetStatus, AssetType } from '@/types'

export type StudioNodeVisualState = 'compact' | 'active' | 'expanded'

type StudioNodeLayoutOptions = {
  status?: AssetStatus
  collapsed?: boolean
  selected?: boolean
}

const EXPANDED_NODE_TYPES = new Set<AssetType>(['compose', 'video', 'talking_video', 'image', 'animate', 'ugc_bundle', 'look_split', 'scene', 'model'])
const ACTIVE_NODE_TYPES = new Set<AssetType>(['join', 'render', 'angles', 'lipsync'])

export const STUDIO_NODE_GRID_SPACING_X = 960
export const STUDIO_NODE_GRID_SPACING_Y = 420

export function getStudioNodeVisualState(
  type: AssetType,
  options: StudioNodeLayoutOptions = {},
): StudioNodeVisualState {
  const { status = 'idle', collapsed = false, selected = false } = options

  if (status === 'processing') {
    return EXPANDED_NODE_TYPES.has(type) ? 'expanded' : 'active'
  }

  if (status === 'error') return 'active'

  if (selected) {
    return EXPANDED_NODE_TYPES.has(type) ? 'expanded' : 'active'
  }

  if (status === 'idle' && !collapsed) {
    if (EXPANDED_NODE_TYPES.has(type)) return 'expanded'
    if (ACTIVE_NODE_TYPES.has(type)) return 'active'
    return 'active'
  }

  return 'compact'
}

export function getStudioNodeCardWidth(
  type: AssetType,
  options: StudioNodeLayoutOptions = {},
) {
  const visualState = getStudioNodeVisualState(type, options)

  if (visualState === 'expanded') {
    if (type === 'compose') return 1040
    if (type === 'video' || type === 'talking_video' || type === 'scene') return 920
    if (type === 'image' || type === 'look_split') return 900
    if (type === 'model') return 610
    return 560
  }

  if (visualState === 'active') {
    if (type === 'compose') return 940
    if (type === 'scene' || type === 'video' || type === 'talking_video') return 760
    if (type === 'image' || type === 'look_split') return 740
    if (type === 'model') return 550
    if (EXPANDED_NODE_TYPES.has(type)) return 520
    if (ACTIVE_NODE_TYPES.has(type)) return 480
    return 430
  }

  if (type === 'compose') return 390
  if (EXPANDED_NODE_TYPES.has(type) || ACTIVE_NODE_TYPES.has(type)) return 360

  return 336
}

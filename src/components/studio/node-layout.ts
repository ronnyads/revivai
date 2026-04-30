import { AssetStatus, AssetType } from '@/types'

export type StudioNodeVisualState = 'compact' | 'active' | 'expanded'

type StudioNodeLayoutOptions = {
  status?: AssetStatus
  collapsed?: boolean
  selected?: boolean
}

const EXPANDED_NODE_TYPES = new Set<AssetType>(['compose', 'video', 'image', 'animate', 'ugc_bundle', 'look_split'])
const ACTIVE_NODE_TYPES = new Set<AssetType>(['join', 'render', 'scene', 'angles', 'lipsync'])

export const STUDIO_NODE_GRID_SPACING_X = 580
export const STUDIO_NODE_GRID_SPACING_Y = 380

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
    if (type === 'compose') return 620
    return 560
  }

  if (visualState === 'active') {
    if (type === 'compose') return 580
    if (EXPANDED_NODE_TYPES.has(type)) return 520
    if (ACTIVE_NODE_TYPES.has(type)) return 480
    return 460
  }

  if (type === 'compose') return 390
  if (EXPANDED_NODE_TYPES.has(type) || ACTIVE_NODE_TYPES.has(type)) return 380

  return 352
}

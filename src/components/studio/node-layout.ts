import { AssetStatus, AssetType } from '@/types'

export type StudioNodeVisualState = 'compact' | 'active' | 'expanded' | 'done-preview'

type StudioNodeLayoutOptions = {
  status?: AssetStatus
  collapsed?: boolean
  selected?: boolean
  donePreview?: boolean
}

const EXPANDED_NODE_TYPES = new Set<AssetType>(['compose', 'video', 'talking_video', 'image', 'animate', 'ugc_bundle', 'look_split', 'scene', 'model'])
const ACTIVE_NODE_TYPES = new Set<AssetType>(['join', 'render', 'angles', 'lipsync'])

export const STUDIO_NODE_GRID_SPACING_X = 960
export const STUDIO_NODE_GRID_SPACING_Y = 420

export function getStudioNodeVisualState(
  type: AssetType,
  options: StudioNodeLayoutOptions = {},
): StudioNodeVisualState {
  const { status = 'idle', collapsed = false, selected = false, donePreview = false } = options

  if (donePreview) return 'done-preview'

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

  if (visualState === 'done-preview') {
    if (type === 'video' || type === 'talking_video' || type === 'render' || type === 'animate' || type === 'lipsync' || type === 'join') return 320
    if (type === 'look_split' || type === 'ugc_bundle') return 420
    if (type === 'voice' || type === 'music' || type === 'script' || type === 'caption') return 420
    if (type === 'image' || type === 'upscale' || type === 'compose' || type === 'face' || type === 'angles' || type === 'scene' || type === 'model') return 390
    return 360
  }

  if (visualState === 'expanded') {
    if (type === 'compose') return 1040
    if (type === 'video') return 860
    if (type === 'talking_video') return 800
    if (type === 'animate') return 840
    if (type === 'scene') return 920
    if (type === 'image' || type === 'look_split') return 900
    if (type === 'model') return 610
    return 560
  }

  if (visualState === 'active') {
    if (type === 'compose') return 960
    if (type === 'video') return 720
    if (type === 'talking_video') return 690
    if (type === 'animate') return 710
    if (type === 'scene') return 780
    if (type === 'image' || type === 'look_split') return 760
    if (type === 'model') return 570
    if (EXPANDED_NODE_TYPES.has(type)) return 540
    if (ACTIVE_NODE_TYPES.has(type)) return 500
    return 450
  }

  if (type === 'compose') return 410
  if (EXPANDED_NODE_TYPES.has(type) || ACTIVE_NODE_TYPES.has(type)) return 380

  return 352
}

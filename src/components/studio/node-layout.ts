import { AssetStatus, AssetType } from '@/types'

export type StudioNodeVisualState = 'compact' | 'active' | 'expanded' | 'done-preview'

type StudioNodeLayoutOptions = {
  status?: AssetStatus
  collapsed?: boolean
  selected?: boolean
  donePreview?: boolean
}

export const STUDIO_NODE_GRID_SPACING_X = 380
export const STUDIO_NODE_GRID_SPACING_Y = 180

export function getStudioNodeVisualState(
  _type: AssetType,
  _options: StudioNodeLayoutOptions = {},
): StudioNodeVisualState {
  return 'compact'
}

export function getStudioNodeCardWidth(
  _type: AssetType,
  _options: StudioNodeLayoutOptions = {},
) {
  return 300
}

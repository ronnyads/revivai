export interface User {
  id: string
  email: string
  plan: 'free' | 'subscription' | 'package'
  credits: number
  stripe_customer_id?: string
  created_at: string
}

export interface Photo {
  id: string
  user_id: string
  original_url: string
  restored_url?: string | null
  status: 'pending' | 'processing' | 'done' | 'error'
  model_used?: string
  diagnosis?: string
  created_at: string
  colorization_url?: string | null
  colorization_suggested?: boolean
  damage_analysis?: Record<string, unknown>
  upscale_url?: string | null
  // v2 pipeline fields
  photo_type?: string | null
  restoration_risk?: string | null
  confidence_flag?: string | null
  qc_scores?: Record<string, unknown> | null
}

export interface Order {
  id: string
  user_id: string
  type: 'per_photo' | 'subscription' | 'package'
  stripe_id?: string
  amount: number
  status: 'pending' | 'paid' | 'failed'
  created_at: string
}

// ── Ad Studio ──────────────────────────────────────────────────────────────

export type StudioTemplate = 'blank' | 'before_after' | 'testimonial' | 'product_showcase'
export type AssetType = 'image' | 'video' | 'voice' | 'upscale' | 'script' | 'caption' | 'model' | 'render' | 'animate'
export type AssetStatus = 'idle' | 'processing' | 'done' | 'error'

export interface StudioProject {
  id: string
  user_id: string
  title: string
  template: StudioTemplate
  status: 'draft' | 'ready'
  created_at: string
  updated_at: string
  asset_count?: number
}

export interface StudioAsset {
  id: string
  project_id: string
  user_id: string
  type: AssetType
  status: AssetStatus
  input_params: Record<string, unknown>
  result_url?: string | null
  last_frame_url?: string | null
  error_msg?: string | null
  credits_cost: number
  board_order: number
  position_x?: number | null
  position_y?: number | null
  created_at: string
}

export interface StudioConnection {
  id: string
  project_id: string
  source_id: string
  target_id: string
  source_handle: string
  target_handle: string
  created_at: string
}

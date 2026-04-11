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

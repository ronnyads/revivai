export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Replicate from 'replicate'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const photoId = searchParams.get('photoId')

  if (!photoId) {
    // Return last 5 photos
    const { data } = await supabase
      .from('photos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    return NextResponse.json({ photos: data })
  }

  // Return specific photo with full details
  const { data: photo } = await supabase
    .from('photos')
    .select('*')
    .eq('id', photoId)
    .single()

  if (!photo) return NextResponse.json({ error: 'Photo not found' })

  // If processing, also fetch the live Replicate prediction
  let replicateData = null
  if (photo.restored_url?.startsWith('PIPE:')) {
    try {
      const parts = photo.restored_url.split(':')
      const predId = parts[2]
      if (predId && process.env.REPLICATE_API_TOKEN) {
        const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
        replicateData = await replicate.predictions.get(predId)
      }
    } catch (e: any) {
      replicateData = { error: e.message }
    }
  }

  return NextResponse.json({
    photo,
    replicateData,
    pipelineDecoded: {
      pipeline: (photo.model_used ?? '').split(','),
      state: photo.restored_url,
      currentStatus: photo.status,
      currentDiagnosis: photo.diagnosis,
    }
  })
}

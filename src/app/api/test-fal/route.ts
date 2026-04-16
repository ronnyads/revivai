import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = createAdminClient()
  const { data: assets } = await admin.from('studio_assets').select('*').eq('type', 'lipsync').order('created_at', { ascending: false }).limit(3)
  
  const results = []
  
  if (assets) {
    for (const asset of assets) {
      if (asset.input_params?.prediction_id) {
        const id = asset.input_params.prediction_id
        try {
          const res = await fetch(`https://queue.fal.run/fal-ai/latentsync/requests/${id}/status`, {
            headers: { 'Authorization': `Key ${process.env.FAL_KEY}` }
          })
          const statusJson = await res.json()

          if (statusJson.status === 'COMPLETED') {
            const outRes = await fetch(`https://queue.fal.run/fal-ai/latentsync/requests/${id}/output`, {
              headers: { 'Authorization': `Key ${process.env.FAL_KEY}` }
            })
            const outJson = await outRes.json()
            results.push({ id: asset.id, request_id: id, status: statusJson.status, output: outJson, dbStatus: asset.status, error: asset.error_msg })
            
            // Força atualizar
            const videoUrl = outJson.video?.url ?? outJson.output?.[0] ?? outJson.video_url
            if (videoUrl && asset.status !== 'done') {
              await admin.from('studio_assets').update({ status: 'done', result_url: videoUrl, last_frame_url: videoUrl, error_msg: null }).eq('id', asset.id)
            }
          } else {
            results.push({ id: asset.id, request_id: id, status: statusJson.status, dbStatus: asset.status, error: asset.error_msg })
          }
        } catch (err: any) {
             results.push({ id: asset.id, err: err.message })
        }
      }
    }
  }

  return NextResponse.json(results)
}

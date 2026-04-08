import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Replicate sends the full prediction object. We parse it:
    // https://replicate.com/docs/webhooks
    const predictionId = body.id
    const status = body.status // 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
    const output = body.output // URL or array of URLs if succeeded
    
    // We embedded the photoId in the webhook URL query params!
    // Example: /api/webhooks/replicate?photoId=123
    const { searchParams } = new URL(req.url)
    const photoId = searchParams.get('photoId')
    const userId = searchParams.get('userId')

    if (!photoId || !userId) {
       console.error(`[reviv.ai webhook] Missing photoId or userId in webhook URL!`)
       return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    if (status !== 'succeeded' && status !== 'failed' && status !== 'canceled') {
      // Just an intermediate update, ignore
      return NextResponse.json({ success: true })
    }

    const supabase = createAdminClient()

    try {
      if (status === 'succeeded' && output) {
        // Extract URL from different output shapes
        let restoredUrl: string
        if (typeof output === 'string') {
          restoredUrl = output
        } else if (Array.isArray(output)) {
          restoredUrl = output[0]
        } else if (output && typeof output === 'object' && 'url' in output) {
          restoredUrl = output.url as string
        } else {
          throw new Error(`Unexpected Replicate output shape: ${JSON.stringify(output)}`)
        }

        const { data: photoData } = await supabase.from('photos').select('*').eq('id', photoId).single()
        
        if (photoData?.model_used === 'piddnad/ddcolor' && photoData?.diagnosis !== 'Fase 2 (Upscale)') {
           console.log(`[reviv.ai webhook] Colorization done! Launching Face Restore...`)
           const { MODEL_CONFIGS } = await import('@/lib/diagnose')
           const Replicate = (await import('replicate')).default
           const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
           
           const codeformerConfig = MODEL_CONFIGS['sczhou/codeformer']
           const codeformerInput = codeformerConfig.buildInput(restoredUrl)
           
           const modelInfo = await replicate.models.get('sczhou', 'codeformer')
           
           const reqUrl = new URL(req.url)
           const webhookUrl = `${reqUrl.protocol}//${reqUrl.host}/api/webhooks/replicate?photoId=${photoId}&userId=${userId}`

           const chainedPrediction = await replicate.predictions.create({
             version: modelInfo.latest_version?.id,
             input: codeformerInput,
             webhook: webhookUrl,
             webhook_events_filter: ["completed"]
           } as any)

           await supabase.from('photos').update({ 
             diagnosis: 'Fase 2 (Upscale)',
             restored_url: `CHAIN:${chainedPrediction.id}` 
           }).eq('id', photoId)

           return NextResponse.json({ success: true, chained: true })
        }

        console.log(`[reviv.ai webhook] Success! ${photoId} -> ${restoredUrl}`)

        const { error: dbUpdateErr } = await supabase.from('photos').update({
          restored_url: restoredUrl,
          status:       'done',
        }).eq('id', photoId)
        
        if (dbUpdateErr) console.error('[reviv.ai webhook] Failed to update photo done:', dbUpdateErr)

        // Debit 1 credit only on success
        const { error: rpcErr } = await supabase.rpc('debit_credit', { user_id_param: userId })
        if (rpcErr) console.error('[reviv.ai webhook] Failed to debit_credit:', rpcErr)

      } else if (status === 'failed' || status === 'canceled') {
        console.error(`[reviv.ai webhook] Replicate reported failure for ${photoId}:`, body.error)
        await supabase.from('photos').update({ 
          status: 'error',
          restored_url: `Webhook report: ${body.error}`
        }).eq('id', photoId)
      }
    } catch (dbErr: any) {
      console.error(`[reviv.ai webhook] Internal DB Error for ${photoId}:`, dbErr)
      await supabase.from('photos').update({ 
        status: 'error',
        restored_url: `Internal webhook error: ${dbErr.message || JSON.stringify(dbErr)}`
      }).eq('id', photoId)
    }

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error(`[reviv.ai webhook] Error:`, err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

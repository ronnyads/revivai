import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl) throw new Error('Missing URL')
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: asset } = await supabase.from('studio_assets').select('id, status, error_msg, result_url, input_params').eq('type', 'lipsync').order('created_at', { ascending: false }).limit(1).single()
  console.log('--- LATEST ASSET ---')
  console.log(asset)

  if (asset?.input_params?.prediction_id) {
    console.log('Checking Fal AI for:', asset.input_params.prediction_id)
    const res = await fetch('https://queue.fal.run/fal-ai/latentsync/requests/' + asset.input_params.prediction_id, {
      headers: { 'Authorization': `Key ${process.env.FAL_KEY}` }
    })
    const falStatus = await res.json()
    console.log('Fal AI Status:', falStatus)
  }
}
run()

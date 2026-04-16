import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl) throw new Error('Missing URL')

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data } = await supabase.from('studio_assets').select('id, status, error_msg, result_url').eq('type', 'lipsync').order('created_at', { ascending: false }).limit(2)
  console.log(JSON.stringify(data, null, 2))
}
run()

import { createAdminClient } from '@/lib/supabase/admin'
import MetaPixel from './MetaPixel'

export default async function MetaPixelLoader() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('settings').select('value').eq('key', 'meta_pixel_id').single()
    return <MetaPixel pixelId={data?.value || ''} />
  } catch {
    return null
  }
}

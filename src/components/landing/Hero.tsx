import { createAdminClient } from '@/lib/supabase/admin'
import HeroClient from './HeroClient'

const DEFAULTS = { photos: 48000, models: 4, satisfaction: 98, avgTime: 30 }

export default async function Hero() {
  let stats = { ...DEFAULTS }
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('settings').select('key, value')
      .in('key', ['stat_photos', 'stat_models', 'stat_satisfaction', 'stat_avg_time'])
    data?.forEach((r: { key: string; value: string }) => {
      const v = parseInt(r.value)
      if (!isNaN(v)) {
        if (r.key === 'stat_photos')       stats.photos       = v
        if (r.key === 'stat_models')       stats.models       = v
        if (r.key === 'stat_satisfaction') stats.satisfaction = v
        if (r.key === 'stat_avg_time')     stats.avgTime      = v
      }
    })
  } catch {}

  return <HeroClient stats={stats} />
}

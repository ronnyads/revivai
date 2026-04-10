'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function saveSetting(key: string, value: string) {
  const supabase = createAdminClient()
  await supabase.from('settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  revalidatePath('/admin/settings')
  revalidatePath('/', 'layout')
}

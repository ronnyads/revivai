'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function saveSetting(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  const key   = formData.get('key') as string
  const value = (formData.get('value') as string) || ''
  const supabase = createAdminClient()
  const { error } = await supabase.from('settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/settings')
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function saveMultipleSettings(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  const supabase = createAdminClient()
  const entries = [...formData.entries()]
  for (const [key, value] of entries) {
    const { error } = await supabase.from('settings').upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) return { ok: false, error: error.message }
  }
  revalidatePath('/admin/settings')
  revalidatePath('/', 'layout')
  return { ok: true }
}

'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function upsertTestimonial(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  const id    = (formData.get('id') as string) || undefined
  const name  = formData.get('name') as string
  const role  = formData.get('role') as string
  const quote = formData.get('quote') as string
  const order = parseInt(formData.get('order') as string) || 0

  const supabase = createAdminClient()
  const row: Record<string, unknown> = { name, role, quote, order }
  if (id) row.id = id

  const { error } = await supabase.from('testimonials').upsert(row, { onConflict: 'id' })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/testimonials')
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function deleteTestimonial(id: string) {
  const supabase = createAdminClient()
  await supabase.from('testimonials').delete().eq('id', id)
  revalidatePath('/admin/testimonials')
  revalidatePath('/', 'layout')
}

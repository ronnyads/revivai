'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function upsertFaq(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  const id       = (formData.get('id') as string) || undefined
  const question = formData.get('question') as string
  const answer   = formData.get('answer') as string
  const order    = parseInt(formData.get('order') as string) || 0

  const supabase = createAdminClient()
  const row: Record<string, unknown> = { question, answer, order }
  if (id) row.id = id

  const { error } = await supabase.from('faqs').upsert(row, { onConflict: 'id' })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/faqs')
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function deleteFaq(id: string) {
  const supabase = createAdminClient()
  await supabase.from('faqs').delete().eq('id', id)
  revalidatePath('/admin/faqs')
  revalidatePath('/', 'layout')
}

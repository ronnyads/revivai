'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function upsertPlan(formData: FormData) {
  const supabase = createAdminClient()
  const id = formData.get('id') as string
  await supabase.from('plans').upsert({
    id,
    name:        formData.get('name') as string,
    price:       parseFloat(formData.get('price') as string),
    credits:     parseInt(formData.get('credits') as string),
    description: formData.get('description') as string,
    updated_at:  new Date().toISOString(),
  }, { onConflict: 'id' })
  revalidatePath('/admin/plans')
}

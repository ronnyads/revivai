'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function upsertStudioPrompt(formData: FormData) {
  const key   = formData.get('key') as string
  const value = formData.get('value') as string
  if (!key || !value) return

  const admin = createAdminClient()
  await admin
    .from('studio_prompts')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  revalidatePath('/admin/studio-prompts')
}

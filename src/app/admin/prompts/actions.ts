'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createMode(formData: FormData) {
  const supabase = createAdminClient()
  await supabase.from('restoration_modes').insert({
    name:        formData.get('name') as string,
    description: formData.get('description') as string,
    icon:        formData.get('icon') as string,
    prompt:      formData.get('prompt') as string,
    model:       formData.get('model') as string,
    is_active:   true,
    sort_order:  0,
  })
  revalidatePath('/admin/prompts')
}

export async function updateMode(id: string, formData: FormData) {
  const supabase = createAdminClient()
  await supabase.from('restoration_modes').update({
    name:        formData.get('name') as string,
    description: formData.get('description') as string,
    icon:        formData.get('icon') as string,
    prompt:      formData.get('prompt') as string,
    model:       formData.get('model') as string,
    is_active:   formData.get('is_active') === 'true',
  }).eq('id', id)
  revalidatePath('/admin/prompts')
}

export async function deleteMode(id: string) {
  const supabase = createAdminClient()
  await supabase.from('restoration_modes').delete().eq('id', id)
  revalidatePath('/admin/prompts')
}

'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function upsertStudioPrompt(formData: FormData) {
  const key   = formData.get('key') as string
  const value = formData.get('value') as string
  
  const admin = createAdminClient()
  
  if (!value || value.trim() === '') {
    // Se vazio, removemos a customização para usar o padrão do código
    await admin.from('studio_prompts').delete().eq('key', key)
  } else {
    await admin
      .from('studio_prompts')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  }

  revalidatePath('/admin/studio-prompts')
}

export async function upsertAllPromptsJSON(formData: FormData) {
  const jsonStr = formData.get('json') as string
  if (!jsonStr) return

  try {
    const config = JSON.parse(jsonStr)
    const admin = createAdminClient()
    
    // Transformamos o objeto { key: value } em array para upsert
    const rows = Object.entries(config).map(([key, value]) => ({
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value),
      updated_at: new Date().toISOString()
    }))

    if (rows.length > 0) {
      await admin.from('studio_prompts').upsert(rows, { onConflict: 'key' })
    }

    revalidatePath('/admin/studio-prompts')
  } catch (error) {
    console.error('Erro ao salvar JSON:', error)
    throw new Error('Formato JSON inválido.')
  }
}

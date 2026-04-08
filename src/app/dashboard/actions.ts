'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteFailedPhoto(photoId: string) {
  const supabase = await createClient()
  
  // First ensure only the owner can delete it. Supabase RLS takes care of it but let's query it.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Only delete if it's an error photo
  const { error } = await supabase
    .from('photos')
    .delete()
    .eq('id', photoId)
    .eq('user_id', user.id)
    .eq('status', 'error')

  if (error) {
    return { error: 'Falha ao deletar a foto.' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

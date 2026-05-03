'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { inferRestoreEngineProfile } from '@/lib/vertex-engines'

const RESTORE_MODEL_PLACEHOLDER = 'restore-managed-by-engine-profile'

export async function createMode(formData: FormData) {
  const supabase = createAdminClient()

  await supabase.from('restoration_modes').insert({
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    icon: formData.get('icon') as string,
    prompt: formData.get('prompt') as string,
    model: RESTORE_MODEL_PLACEHOLDER,
    engine_profile: formData.get('engine_profile') as string,
    is_active: true,
    sort_order: 0,
    persona: (formData.get('persona') as string) || null,
    retry_prompt: (formData.get('retry_prompt') as string) || null,
    qc_threshold: parseInt(formData.get('qc_threshold') as string, 10) || 70,
    badge: (formData.get('badge') as string) || null,
  })

  revalidatePath('/admin/prompts')
  revalidatePath('/dashboard/upload')
}

export async function updateMode(id: string, formData: FormData) {
  const supabase = createAdminClient()

  await supabase.from('restoration_modes').update({
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    icon: formData.get('icon') as string,
    prompt: formData.get('prompt') as string,
    model: RESTORE_MODEL_PLACEHOLDER,
    engine_profile: formData.get('engine_profile') as string,
    is_active: formData.get('is_active') === 'true',
    persona: (formData.get('persona') as string) || null,
    retry_prompt: (formData.get('retry_prompt') as string) || null,
    qc_threshold: parseInt(formData.get('qc_threshold') as string, 10) || 70,
    example_before_url: (formData.get('example_before_url') as string) || null,
    example_after_url: (formData.get('example_after_url') as string) || null,
    badge: (formData.get('badge') as string) || null,
  }).eq('id', id)

  revalidatePath('/admin/prompts')
  revalidatePath('/dashboard/upload')
}

export async function deleteMode(id: string) {
  const supabase = createAdminClient()
  await supabase.from('restoration_modes').delete().eq('id', id)
  revalidatePath('/admin/prompts')
}

export async function seedDefaultModes() {
  const supabase = createAdminClient()

  const defaults = [
    {
      name: 'Restauração Geral',
      description: 'Rasgos, rachaduras, manchas e desgaste',
      icon: '🖼️',
      model: RESTORE_MODEL_PLACEHOLDER,
      engine_profile: inferRestoreEngineProfile({
        modeName: 'Restauração Geral',
        legacyModel: RESTORE_MODEL_PLACEHOLDER,
      }),
      is_active: true,
      sort_order: 1,
      qc_threshold: 70,
      example_before_url: null,
      example_after_url: null,
      persona: 'You are a master photograph conservator and restoration artist with over 30 years of experience specializing in heavily damaged vintage photographs from the 19th and early 20th centuries. You have restored thousands of photographs for museums, archives, and families worldwide. Your signature approach combines deep technical expertise in photographic chemistry and digital restoration with an artist sensitivity to preserving the soul of the original image. You never alter a person identity, expression, or likeness. You only heal the photograph itself.',
      prompt: 'A high-resolution, meticulously restored vintage photograph. The primary goal is the exact preservation of the original identities, expressions, and features of the individuals without loss of originality. Meticulously remove all physical damage, deep white cracks, stains, dust, and watermarks. Seamlessly rebuild the missing or heavily damaged details, such as eyes, teeth, and hair texture, strictly based on the surviving contours and natural facial structure. Avoid over-smoothing. Preserve the authentic vintage lighting, shadows, and original color tone.',
      retry_prompt: 'Clean this damaged photograph conservatively. Remove only the most visible physical damage such as cracks, stains, and dust without altering any face, expression, or appearance. Make no creative decisions.',
    },
    {
      name: 'Foto de Grupo / Família',
      description: 'Preserva rostos e identidades com intervenção mínima',
      icon: '👨‍👩‍👧',
      model: RESTORE_MODEL_PLACEHOLDER,
      engine_profile: inferRestoreEngineProfile({
        modeName: 'Foto de Grupo / Família',
        legacyModel: RESTORE_MODEL_PLACEHOLDER,
      }),
      is_active: true,
      sort_order: 2,
      qc_threshold: 75,
      example_before_url: null,
      example_after_url: null,
      persona: 'You are a photograph conservator specializing in group and family portraits. Your guiding principle is first do no harm. Every face represents a real person with a unique identity, and your role is to clean the photograph, never to reimagine or enhance the subjects.',
      prompt: 'Restore this old group or family photograph with minimal intervention. Remove only visible physical damage such as scratches, dust, tears, and stains. Do not alter faces, expressions, hairstyles, body proportions, or any person appearance. Preserve the original photographic style, lighting, and color tone exactly.',
      retry_prompt: 'Remove only the most obvious physical damage from this group photograph. Do not touch faces. Do not change any person appearance. Only clean dirt, scratches, and surface damage.',
    },
    {
      name: 'Danos Leves',
      description: 'Poeira, riscos finos e pequenas imperfeições',
      icon: '✨',
      model: RESTORE_MODEL_PLACEHOLDER,
      engine_profile: inferRestoreEngineProfile({
        modeName: 'Danos Leves',
        legacyModel: RESTORE_MODEL_PLACEHOLDER,
      }),
      is_active: true,
      sort_order: 3,
      qc_threshold: 65,
      example_before_url: null,
      example_after_url: null,
      persona: 'You are a gentle photograph preservationist who works with a light touch. You specialize in photographs that are mostly intact but have accumulated surface damage over decades such as dust, fine scratches, and minor marks. The best restoration is one that is invisible.',
      prompt: 'Restore this photograph with minimal intervention. Focus only on removing visible surface damage such as light dust, fine scratches, and small marks. Do not change faces, expressions, composition, or overall appearance. Preserve everything as close to the original as possible.',
      retry_prompt: 'Gently clean this photograph. Remove only the most obvious surface blemishes. Do not alter the image in any other way.',
    },
  ]

  await supabase.from('restoration_modes').insert(defaults)
  revalidatePath('/admin/prompts')
}

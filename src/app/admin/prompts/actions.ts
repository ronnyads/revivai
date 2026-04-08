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

export async function seedDefaultModes() {
  const supabase = createAdminClient()
  const defaults = [
    {
      name: 'Restauração Geral',
      description: 'Rasgos, rachaduras, manchas e desgaste',
      icon: '🖼️',
      model: 'gemini-2.5-flash-image',
      is_active: true,
      sort_order: 1,
      prompt: `A high-resolution, meticulously restored vintage photograph. The primary goal is the exact preservation of the original identities, expressions, and features of the individuals without loss of originality. Meticulously remove all physical damage, deep white cracks, stains, dust, and watermarks. Seamlessly rebuild the missing or heavily damaged details, such as eyes, teeth, and hair texture, strictly based on the surviving contours and natural facial structure. Avoid over-smoothing; the restored skin must have realistic, high-fidelity texture, not a fake or plastic finish. Preserve the authentic vintage lighting, shadows, and the original color tone (whether sépia or black and white). The resulting image must look like a perfectly preserved, high-quality vintage print.`,
    },
    {
      name: 'Foto de Grupo / Família',
      description: 'Preserva rostos e identidades com intervenção mínima',
      icon: '👨‍👩‍👧',
      model: 'gemini-2.5-flash-image',
      is_active: true,
      sort_order: 2,
      prompt: `Restore this old group or family photograph with minimal intervention. Remove only visible physical damage: scratches, dust, tears, and stains. Do NOT alter faces, expressions, hairstyles, body proportions, or any person's appearance. Do NOT change composition or add any element. Preserve the original photographic style, lighting, and color tone exactly. Every person must look identical to the original — the goal is to clean the photo, not to enhance or modify the subjects.`,
    },
    {
      name: 'Danos Leves',
      description: 'Poeira, riscos finos e pequenas imperfeições',
      icon: '✨',
      model: 'gemini-2.5-flash-image',
      is_active: true,
      sort_order: 3,
      prompt: `Restore this photograph with minimal intervention. Focus only on removing visible surface damage: light dust, fine scratches, and small marks. Do NOT change faces, expressions, composition, or overall appearance. Preserve everything as close to the original as possible. The result must look like the same photo, just cleaned.`,
    },
  ]
  await supabase.from('restoration_modes').insert(defaults)
  revalidatePath('/admin/prompts')
}

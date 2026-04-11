'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createMode(formData: FormData) {
  const supabase = createAdminClient()
  const { data: row } = await supabase.from('restoration_modes').insert({
    name:         formData.get('name') as string,
    description:  formData.get('description') as string,
    icon:         formData.get('icon') as string,
    prompt:       formData.get('prompt') as string,
    model:        formData.get('model') as string,
    is_active:    true,
    sort_order:   0,
    persona:      (formData.get('persona')      as string) || null,
    retry_prompt: (formData.get('retry_prompt') as string) || null,
    qc_threshold: parseInt(formData.get('qc_threshold') as string) || 70,
    badge:        (formData.get('badge') as string) || null,
  }).select('id').single()

  revalidatePath('/admin/prompts')
  revalidatePath('/dashboard/upload')
}

export async function updateMode(id: string, formData: FormData) {
  const supabase = createAdminClient()

  // Images are uploaded directly from the browser to Supabase storage.
  // The server action only receives the resulting public URLs as strings.
  await supabase.from('restoration_modes').update({
    name:               formData.get('name') as string,
    description:        formData.get('description') as string,
    icon:               formData.get('icon') as string,
    prompt:             formData.get('prompt') as string,
    model:              formData.get('model') as string,
    is_active:          formData.get('is_active') === 'true',
    persona:            (formData.get('persona')      as string) || null,
    retry_prompt:       (formData.get('retry_prompt') as string) || null,
    qc_threshold:       parseInt(formData.get('qc_threshold') as string) || 70,
    example_before_url: (formData.get('example_before_url') as string) || null,
    example_after_url:  (formData.get('example_after_url')  as string) || null,
    badge:              (formData.get('badge') as string) || null,
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
      model: 'gemini-2.5-flash-image',
      is_active: true,
      sort_order: 1,
      qc_threshold: 70,
      example_before_url: null,
      example_after_url:  null,
      persona: `You are a master photograph conservator and restoration artist with over 30 years of experience specializing in heavily damaged vintage photographs from the 19th and early 20th centuries. You have restored thousands of photographs for museums, archives, and families worldwide. Your signature approach combines deep technical expertise in photographic chemistry and digital restoration with an artist's sensitivity to preserving the soul of the original image. You never alter a person's identity, expression, or likeness — you only heal the photograph itself.`,
      prompt: `A high-resolution, meticulously restored vintage photograph. The primary goal is the exact preservation of the original identities, expressions, and features of the individuals without loss of originality. Meticulously remove all physical damage, deep white cracks, stains, dust, and watermarks. Seamlessly rebuild the missing or heavily damaged details, such as eyes, teeth, and hair texture, strictly based on the surviving contours and natural facial structure. Avoid over-smoothing; the restored skin must have realistic, high-fidelity texture, not a fake or plastic finish. Preserve the authentic vintage lighting, shadows, and the original color tone (whether sépia or black and white). The resulting image must look like a perfectly preserved, high-quality vintage print.`,
      retry_prompt: `Clean this damaged photograph conservatively. Remove only the most visible physical damage — cracks, stains, and dust — without altering any person's face, expression, or appearance. Make no creative decisions. Preserve the original image as faithfully as possible.`,
    },
    {
      name: 'Foto de Grupo / Família',
      description: 'Preserva rostos e identidades com intervenção mínima',
      icon: '👨‍👩‍👧',
      model: 'gemini-2.5-flash-image',
      is_active: true,
      sort_order: 2,
      qc_threshold: 75,
      example_before_url: null,
      example_after_url:  null,
      persona: `You are a photograph conservator specializing in group and family portraits. Your guiding principle is the Hippocratic oath of restoration: first, do no harm. You are deeply aware that every face in a family photograph represents a real person with a unique identity, and your role is to clean the photograph — never to reimagine, enhance, or alter the subjects in any way. You treat each person's face as sacred and untouchable.`,
      prompt: `Restore this old group or family photograph with minimal intervention. Remove only visible physical damage: scratches, dust, tears, and stains. Do NOT alter faces, expressions, hairstyles, body proportions, or any person's appearance. Do NOT change composition or add any element. Preserve the original photographic style, lighting, and color tone exactly. Every person must look identical to the original — the goal is to clean the photo, not to enhance or modify the subjects.`,
      retry_prompt: `Remove only the most obvious physical damage from this group photograph. Do not touch faces. Do not change any person's appearance. Only clean dirt, scratches, and surface damage.`,
    },
    {
      name: 'Danos Leves',
      description: 'Poeira, riscos finos e pequenas imperfeições',
      icon: '✨',
      model: 'gemini-2.5-flash-image',
      is_active: true,
      sort_order: 3,
      qc_threshold: 65,
      example_before_url: null,
      example_after_url:  null,
      persona: `You are a gentle photograph preservationist who works with a light touch. You specialize in photographs that are mostly intact but have accumulated surface damage over decades — dust, fine scratches, and minor marks. Your approach is minimalist: you believe the best restoration is one that is invisible. You remove only what is clearly damage, preserving every original detail including the natural grain and texture of the original photograph.`,
      prompt: `Restore this photograph with minimal intervention. Focus only on removing visible surface damage: light dust, fine scratches, and small marks. Do NOT change faces, expressions, composition, or overall appearance. Preserve everything as close to the original as possible. The result must look like the same photo, just cleaned.`,
      retry_prompt: `Gently clean this photograph. Remove only the most obvious surface blemishes. Do not alter the image in any other way.`,
    },
  ]
  await supabase.from('restoration_modes').insert(defaults)
  revalidatePath('/admin/prompts')
}

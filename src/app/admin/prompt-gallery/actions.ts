'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_PROMPT_TEMPLATES } from '@/lib/prompt-gallery'
import type { PostgrestError } from '@supabase/supabase-js'

function assertMutationSucceeded(error: PostgrestError | null, fallbackMessage: string) {
  if (!error) return
  throw new Error(error.message || fallbackMessage)
}

function collectExampleImages(formData: FormData) {
  return ['example_image_1_url', 'example_image_2_url', 'example_image_3_url']
    .map((key) => String(formData.get(key) ?? '').trim())
    .filter(Boolean)
}

function collectGenerationFields(formData: FormData) {
  return {
    generation_mode: String(formData.get('generation_mode') ?? 'identity_scene').trim(),
    input_mode: String(formData.get('input_mode') ?? 'single_image').trim(),
    required_images_count: Number(formData.get('required_images_count') ?? 1) || 1,
    credit_cost: Number(formData.get('credit_cost') ?? 12) || 12,
    usage_label: String(formData.get('usage_label') ?? '').trim(),
    identity_lock: formData.get('identity_lock') === 'true',
    outfit_source: formData.get('outfit_source') === 'template' ? 'template' : 'identity',
    engine_profile: String(formData.get('engine_profile') ?? 'vertex_imagen4_ultra').trim(),
  }
}

function normalizeCategoryName(value: FormDataEntryValue | string | null) {
  return String(value ?? '').trim()
}

async function assertPromptCategoryExists(supabase: ReturnType<typeof createAdminClient>, category: string) {
  if (!category) {
    throw new Error('Escolha uma categoria cadastrada antes de salvar o preset.')
  }

  const { data, error } = await supabase
    .from('prompt_categories')
    .select('name')
    .eq('name', category)
    .maybeSingle()

  if (error) {
    throw new Error(error.message || 'Nao foi possivel validar a categoria.')
  }

  if (!data) {
    throw new Error('Categoria nao cadastrada. Crie a categoria na area Categorias antes de usar no preset.')
  }
}

export async function createPromptCategory(name: string) {
  const category = normalizeCategoryName(name)
  if (!category) {
    throw new Error('Nome da categoria obrigatorio.')
  }

  const supabase = createAdminClient()
  const { data: lastCategory } = await supabase
    .from('prompt_categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('prompt_categories').insert({
    name: category,
    sort_order: Number(lastCategory?.sort_order ?? 0) + 1,
    updated_at: new Date().toISOString(),
  })

  assertMutationSucceeded(error, 'Nao foi possivel criar a categoria.')

  revalidatePath('/admin/prompt-gallery')
  revalidatePath('/dashboard/prompts')
}

export async function createPromptTemplate(formData: FormData) {
  const supabase = createAdminClient()
  const category = normalizeCategoryName(formData.get('category'))
  await assertPromptCategoryExists(supabase, category)

  const { error } = await supabase.from('prompt_templates').insert({
    title: String(formData.get('title') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim(),
    category,
    format: String(formData.get('format') ?? 'TEXT').trim().toUpperCase(),
    prompt: String(formData.get('prompt') ?? '').trim(),
    cover_image_url: String(formData.get('cover_image_url') ?? '').trim(),
    example_images: collectExampleImages(formData),
    is_visible: formData.get('is_visible') === 'true',
    sort_order: Number(formData.get('sort_order') ?? 0) || 0,
    ...collectGenerationFields(formData),
    updated_at: new Date().toISOString(),
  })

  assertMutationSucceeded(error, 'Nao foi possivel criar o preset.')

  revalidatePath('/admin/prompt-gallery')
  revalidatePath('/dashboard/prompts')
}

export async function updatePromptTemplate(id: string, formData: FormData) {
  const supabase = createAdminClient()
  const category = normalizeCategoryName(formData.get('category'))
  await assertPromptCategoryExists(supabase, category)

  const { error } = await supabase
    .from('prompt_templates')
    .update({
      title: String(formData.get('title') ?? '').trim(),
      description: String(formData.get('description') ?? '').trim(),
      category,
      format: String(formData.get('format') ?? 'TEXT').trim().toUpperCase(),
      prompt: String(formData.get('prompt') ?? '').trim(),
      cover_image_url: String(formData.get('cover_image_url') ?? '').trim(),
      example_images: collectExampleImages(formData),
      is_visible: formData.get('is_visible') === 'true',
      sort_order: Number(formData.get('sort_order') ?? 0) || 0,
      ...collectGenerationFields(formData),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  assertMutationSucceeded(error, 'Nao foi possivel salvar o preset.')

  revalidatePath('/admin/prompt-gallery')
  revalidatePath('/dashboard/prompts')
}

export async function duplicatePromptTemplate(id: string) {
  const supabase = createAdminClient()

  const { data: existing, error } = await supabase
    .from('prompt_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !existing) {
    throw new Error(error?.message ?? 'Preset nao encontrado para duplicacao.')
  }

  const { error: insertError } = await supabase.from('prompt_templates').insert({
    title: `${String(existing.title ?? '').trim()} (Copia)`,
    description: String(existing.description ?? '').trim(),
    category: String(existing.category ?? '').trim(),
    format: String(existing.format ?? 'TEXT').trim().toUpperCase(),
    prompt: String(existing.prompt ?? '').trim(),
    cover_image_url: String(existing.cover_image_url ?? '').trim(),
    example_images: Array.isArray(existing.example_images) ? existing.example_images.filter(Boolean) : [],
    is_visible: Boolean(existing.is_visible ?? true),
    sort_order: Number(existing.sort_order ?? 0) + 1,
    generation_mode: String(existing.generation_mode ?? 'identity_scene').trim(),
    input_mode: String(existing.input_mode ?? 'single_image').trim(),
    required_images_count: Number(existing.required_images_count ?? 1) || 1,
    credit_cost: Number(existing.credit_cost ?? 12) || 12,
    usage_label: String(existing.usage_label ?? '').trim(),
    identity_lock: Boolean(existing.identity_lock ?? true),
    outfit_source: String(existing.outfit_source ?? 'identity') === 'template' ? 'template' : 'identity',
    engine_profile: String(existing.engine_profile ?? 'vertex_imagen4_ultra').trim(),
    updated_at: new Date().toISOString(),
  })

  assertMutationSucceeded(insertError, 'Nao foi possivel duplicar o preset.')

  revalidatePath('/admin/prompt-gallery')
  revalidatePath('/dashboard/prompts')
}

export async function renamePromptCategory(previousName: string, nextName: string) {
  const oldCategory = previousName.trim()
  const newCategory = nextName.trim()
  if (!oldCategory || !newCategory) {
    throw new Error('Categoria antiga e nova sao obrigatorias.')
  }
  if (oldCategory === newCategory) {
    return
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('prompt_categories')
    .update({
      name: newCategory,
      updated_at: new Date().toISOString(),
    })
    .eq('name', oldCategory)
    .select('name')

  assertMutationSucceeded(error, 'Nao foi possivel renomear a categoria.')

  if (!data || data.length === 0) {
    throw new Error('Categoria nao encontrada para renomear.')
  }

  revalidatePath('/admin/prompt-gallery')
  revalidatePath('/dashboard/prompts')
}

export async function setPromptCategoryVisibility(categoryName: string, isVisible: boolean) {
  const category = categoryName.trim()
  if (!category) {
    throw new Error('Categoria obrigatoria.')
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('prompt_categories')
    .update({
      is_visible: isVisible,
      updated_at: new Date().toISOString(),
    })
    .eq('name', category)
    .select('name')

  assertMutationSucceeded(error, 'Nao foi possivel atualizar a visibilidade da categoria.')

  if (!data || data.length === 0) {
    throw new Error('Categoria nao encontrada para atualizar.')
  }

  const { error: templateError } = await supabase
    .from('prompt_templates')
    .update({
      is_visible: isVisible,
      updated_at: new Date().toISOString(),
    })
    .eq('category', category)

  assertMutationSucceeded(templateError, 'Nao foi possivel atualizar os presets da categoria.')

  revalidatePath('/admin/prompt-gallery')
  revalidatePath('/dashboard/prompts')
}

export async function deletePromptCategory(categoryName: string) {
  const category = categoryName.trim()
  if (!category) {
    throw new Error('Categoria obrigatoria.')
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.from('prompt_categories').delete().eq('name', category).select('name')

  assertMutationSucceeded(error, 'Nao foi possivel excluir a categoria.')

  if (!data || data.length === 0) {
    throw new Error('Categoria nao encontrada para excluir.')
  }

  revalidatePath('/admin/prompt-gallery')
  revalidatePath('/dashboard/prompts')
}

export async function deletePromptTemplate(id: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('prompt_templates').delete().eq('id', id).select('id')
  assertMutationSucceeded(error, 'Nao foi possivel deletar o preset.')
  if (!data || data.length === 0) {
    throw new Error('Preset nao encontrado para exclusao.')
  }
  revalidatePath('/admin/prompt-gallery')
  revalidatePath('/dashboard/prompts')
}

export async function seedPromptTemplates() {
  const supabase = createAdminClient()
  const defaultCategories = Array.from(new Set(DEFAULT_PROMPT_TEMPLATES.map((item) => item.category.trim()).filter(Boolean)))
    .map((name, index) => ({
      name,
      sort_order: index + 1,
      updated_at: new Date().toISOString(),
    }))

  const { error: categoryError } = await supabase
    .from('prompt_categories')
    .upsert(defaultCategories, { onConflict: 'name', ignoreDuplicates: true })

  assertMutationSucceeded(categoryError, 'Nao foi possivel preparar as categorias iniciais.')

  const { error } = await supabase.from('prompt_templates').insert(
    DEFAULT_PROMPT_TEMPLATES.map((item) => ({
      title: item.title,
      description: item.description,
      category: item.category,
      format: item.format,
      prompt: item.prompt,
      cover_image_url: item.coverImageUrl,
      example_images: item.exampleImages,
      is_visible: item.isVisible,
      sort_order: item.sortOrder,
      generation_mode: item.generationMode,
      input_mode: item.inputMode,
      required_images_count: item.requiredImagesCount,
      credit_cost: item.creditCost,
      usage_label: item.usageLabel,
      identity_lock: item.identityLock,
      outfit_source: item.outfitSource,
      engine_profile: item.engineProfile,
    })),
  )
  assertMutationSucceeded(error, 'Nao foi possivel criar a biblioteca inicial.')
  revalidatePath('/admin/prompt-gallery')
  revalidatePath('/dashboard/prompts')
}

export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_PROMPT_TEMPLATES, normalizePromptTemplate, PromptCategoryRow, PromptTemplateRow } from '@/lib/prompt-gallery'
import PromptTemplateEditor, { CategoryManager, NewPromptTemplateForm } from './PromptTemplateEditor'
import { seedPromptTemplates } from './actions'

export default async function PromptGalleryAdminPage() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('prompt_templates')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const templates = !error && data ? (data as PromptTemplateRow[]).map(normalizePromptTemplate) : []
  const { data: categoryData, error: categoryError } = await supabase
    .from('prompt_categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  const managedCategories = !categoryError && categoryData ? (categoryData as PromptCategoryRow[]) : []
  const templateCategories = Array.from(new Set(templates.map((template) => template.category?.trim()).filter(Boolean)))
  const fallbackCategorySource = templates.length > 0 ? templateCategories : DEFAULT_PROMPT_TEMPLATES.map((template) => template.category)
  const categories =
    managedCategories.length > 0
      ? managedCategories.map((category) => String(category.name ?? '').trim()).filter(Boolean)
      : Array.from(new Set(fallbackCategorySource.map((category) => category?.trim()).filter(Boolean))).sort((a, b) =>
          a.localeCompare(b),
        )
  const categoryStats = categories.map((name) => {
    const presets = templates.filter((template) => template.category.trim() === name)
    const managedCategory = managedCategories.find((category) => category.name === name)
    return {
      name,
      count: presets.length,
      visibleCount: presets.filter((template) => template.isVisible).length,
      isVisible: managedCategory?.is_visible ?? (presets.length === 0 ? true : presets.some((template) => template.isVisible)),
    }
  })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-normal tracking-tight mb-1">Galeria de Geracoes</h1>
        <p className="text-white/40 text-sm">
          Gerencie presets guiados com autonomia total: criar, editar, cobrar por foto, ocultar, apagar e trocar as fotos de exemplo.
        </p>
      </div>

      {error ? (
        <div className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-200">
          <p className="font-medium">Tabela ainda nao disponivel.</p>
          <p className="mt-2 text-sm text-amber-100/80">
            Rode a migration nova em `supabase/migrations` para liberar o CRUD completo da biblioteca.
          </p>
          <p className="mt-2 text-xs text-amber-100/60">Erro real: {error.message}</p>
        </div>
      ) : null}

      {categoryError ? (
        <div className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-200">
          <p className="font-medium">Tabela de categorias ainda nao disponivel.</p>
          <p className="mt-2 text-sm text-amber-100/80">
            Rode a migration `20260422120000_prompt_categories.sql` para separar categorias dos presets.
          </p>
          <p className="mt-2 text-xs text-amber-100/60">Erro real: {categoryError.message}</p>
        </div>
      ) : null}

      <div className="mb-8">
        <NewPromptTemplateForm categories={categories} />
      </div>

      <CategoryManager categories={categoryStats} />

      <div className="flex flex-col gap-4 mb-10">
        {templates.map((template) => (
          <PromptTemplateEditor key={template.id} template={template} categories={categories} />
        ))}

        {!error && templates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/30 text-sm mb-4">Nenhum prompt cadastrado ainda.</p>
            <form action={seedPromptTemplates}>
              <button
                type="submit"
                className="text-sm px-4 py-2 bg-white/10 hover:bg-white/20 text-white/60 rounded-lg transition-colors"
              >
                ✦ Criar biblioteca inicial
              </button>
            </form>
          </div>
        ) : null}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-sm font-semibold mb-3 text-white/70 uppercase tracking-widest">Seed de referencia</h2>
        <p className="text-sm text-white/35 leading-relaxed">
          O projeto ja carrega um fallback visual com {DEFAULT_PROMPT_TEMPLATES.length} presets de referencia na galeria
          do cliente. Assim que a migration estiver aplicada e voce usar esta tela, o conteudo passa a vir do banco e
          fica 100% controlavel pelo admin.
        </p>
      </div>
    </div>
  )
}

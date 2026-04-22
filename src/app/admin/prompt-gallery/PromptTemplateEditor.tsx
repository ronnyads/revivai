'use client'

import type { FormEvent, ReactNode } from 'react'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createPromptCategory,
  createPromptTemplate,
  deletePromptCategory,
  deletePromptTemplate,
  duplicatePromptTemplate,
  renamePromptCategory,
  setPromptCategoryVisibility,
  updatePromptTemplate,
} from './actions'
import type { PromptGalleryTemplate } from '@/lib/prompt-gallery'

function SectionToggle({
  title,
  description,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  badge,
  children,
}: {
  title: string
  description: string
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  badge?: string
  children: ReactNode
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = controlledOpen ?? internalOpen

  const setOpen = (nextValue: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(nextValue)
    }
    onOpenChange?.(nextValue)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white">{title}</h2>
            {badge ? (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/75">{badge}</span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-white/55">{description}</p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="inline-flex min-w-[96px] items-center justify-center rounded-lg bg-white/12 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/20"
        >
          {open ? 'Minimizar' : 'Expandir'}
        </button>
      </div>

      {open ? <div className="border-t border-white/10">{children}</div> : null}
    </div>
  )
}

function ImageUploadField({
  name,
  label,
  currentUrl = '',
}: {
  name: string
  label: string
  currentUrl?: string
}) {
  const [url, setUrl] = useState(currentUrl)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setUploading(true)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `prompt-gallery/${Date.now()}_${name}.${ext}`
      const { error } = await supabase.storage.from('photos').upload(path, file, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      })
      if (error) throw error
      const {
        data: { publicUrl },
      } = supabase.storage.from('photos').getPublicUrl(path)
      setUrl(publicUrl)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar imagem'
      alert(message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-xs font-medium text-white/75">{label}</label>
      <input type="hidden" name={name} value={url} readOnly />
      <div
        className={`relative aspect-[4/3] overflow-hidden rounded-lg border border-dashed border-white/15 bg-white/[0.06] transition-colors ${
          uploading ? 'opacity-60' : ''
        }`}
      >
        {url && !uploading ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={label} className="absolute inset-0 h-full w-full object-cover" />
          </>
        ) : uploading ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
            <span className="text-xs text-white/70">Enviando...</span>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs text-white/55">
            Sem imagem selecionada
            <br />
            {label}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex flex-1 items-center justify-center rounded-lg bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {url ? 'Trocar foto' : 'Adicionar foto'}
        </button>
        <button
          type="button"
          onClick={() => setUrl('')}
          disabled={uploading || !url}
          className="inline-flex flex-1 items-center justify-center rounded-lg bg-red-500/12 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/22 disabled:cursor-not-allowed disabled:opacity-35"
        >
          Excluir foto
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) handleFile(file)
          event.target.value = ''
        }}
      />
    </div>
  )
}

const EMPTY_TEMPLATE: PromptGalleryTemplate = {
  id: 'new',
  title: '',
  description: '',
  category: 'Influencer Academia',
  format: 'TEXT',
  prompt: '',
  coverImageUrl: '',
  exampleImages: [],
  isVisible: true,
  sortOrder: 0,
  generationMode: 'identity_scene',
  inputMode: 'single_image',
  requiredImagesCount: 1,
  creditCost: 12,
  usageLabel: 'Envie sua foto e gere no mesmo estilo.',
  identityLock: true,
  outfitSource: 'identity',
}

export function CategoryManager({
  categories,
}: {
  categories: Array<{ name: string; count: number; visibleCount: number; isVisible: boolean }>
}) {
  return (
    <SectionToggle
      title="Categorias"
      description="Crie, renomeie, oculte ou exclua categorias."
      defaultOpen={false}
      badge={`${categories.length} categoria(s)`}
    >
      <div className="flex flex-col gap-3 px-6 py-5">
        <CategoryCreateRow />

        {categories.map((category) => (
          <CategoryRenameRow
            key={category.name}
            name={category.name}
            count={category.count}
            visibleCount={category.visibleCount}
            isVisible={category.isVisible}
          />
        ))}

        {categories.length === 0 ? (
          <p className="text-sm text-white/30">Nenhuma categoria cadastrada ainda.</p>
        ) : null}
      </div>
    </SectionToggle>
  )
}

function CategoryRenameRow({
  name,
  count,
  visibleCount,
  isVisible,
}: {
  name: string
  count: number
  visibleCount: number
  isVisible: boolean
}) {
  const router = useRouter()
  const [nextName, setNextName] = useState(name)
  const [isPending, startTransition] = useTransition()
  const isHidden = !isVisible

  const runAction = (task: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await task()
        router.refresh()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Nao foi possivel atualizar a categoria.'
        alert(message)
      }
    })
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_160px_auto] gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-3">
      <div className="space-y-2">
        <input
          value={nextName}
          onChange={(event) => setNextName(event.target.value)}
          className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
        />
        <div className="flex items-center gap-2 text-[11px] text-white/60">
          <span>{count} preset(s)</span>
          <span className="text-white/15">•</span>
          <span>{visibleCount} visivel(is)</span>
          {isHidden ? (
            <>
              <span className="text-white/15">•</span>
              <span className="text-amber-300/80">categoria oculta</span>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-center rounded-lg bg-white/5 px-3 py-2 text-xs text-white/65">
        {isPending ? 'Salvando...' : `${count} preset(s)`}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => runAction(() => renamePromptCategory(name, nextName))}
          disabled={isPending || !nextName.trim() || nextName.trim() === name}
          className="rounded-lg bg-cyan-500/10 px-4 py-2 text-xs text-cyan-300 transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Renomear
        </button>
        <button
          type="button"
          onClick={() => runAction(() => setPromptCategoryVisibility(name, isHidden))}
          disabled={isPending}
          className="rounded-lg bg-white/10 px-4 py-2 text-xs text-white/65 transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isHidden ? 'Mostrar' : 'Ocultar'}
        </button>
        <button
          type="button"
          onClick={() => {
            const message =
              count > 0
                ? `Excluir a categoria "${name}" e todos os ${count} preset(s) dela?`
                : `Excluir a categoria "${name}"?`
            if (!confirm(message)) return
            runAction(() => deletePromptCategory(name))
          }}
          disabled={isPending}
          className="rounded-lg bg-red-500/10 px-4 py-2 text-xs text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Excluir
        </button>
      </div>
    </div>
  )
}

function CategoryCreateRow() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextName = name.trim()
    if (!nextName) return

    startTransition(async () => {
      try {
        await createPromptCategory(nextName)
        setName('')
        router.refresh()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Nao foi possivel criar a categoria.'
        alert(message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg border border-cyan-400/15 bg-cyan-400/[0.04] px-3 py-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-white/75">Nova categoria</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Digite o nome da categoria"
          className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-cyan-300/40 focus:outline-none"
        />
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="rounded-lg bg-cyan-500/15 px-4 py-2 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? 'Criando...' : 'Criar categoria'}
        </button>
      </div>
    </form>
  )
}

function CategoryField({
  categories,
  currentCategory,
}: {
  categories: string[]
  currentCategory: string
}) {
  const normalizedCurrent = currentCategory.trim()
  const existingCategories = Array.from(new Set(categories.map((item) => item.trim()).filter(Boolean)))
  const selectedCategory = existingCategories.includes(normalizedCurrent)
    ? normalizedCurrent
    : existingCategories[0] ?? ''

  return (
    <div className="col-span-2">
      <label className="mb-1 block text-xs font-medium text-white/75">Categoria</label>
      <div className="space-y-2">
        {existingCategories.length > 0 ? (
          <select
            name="category"
            defaultValue={selectedCategory}
            required
            className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            {existingCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        ) : (
          <>
            <input type="hidden" name="category" value="" readOnly />
            <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100/80">
              Crie uma categoria na area Categorias antes de salvar presets.
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function NewPromptTemplateForm({ categories }: { categories: string[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const handleCreate = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await createPromptTemplate(formData)
        setOpen(false)
        router.refresh()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Nao foi possivel criar este preset.'
        alert(message)
      }
    })
  }

  return (
    <SectionToggle
      title="Novo preset"
      description="Crie um fluxo guiado com custo, input e prompt oculto."
      open={open}
      onOpenChange={setOpen}
    >
      <div className="px-0 py-0">
        <PromptTemplateForm
          categories={categories}
          template={EMPTY_TEMPLATE}
          submitLabel={isPending ? 'Criando...' : 'Criar preset'}
          action={handleCreate}
          pending={isPending}
        />
      </div>
    </SectionToggle>
  )
}

export default function PromptTemplateEditor({
  template,
  categories,
}: {
  template: PromptGalleryTemplate
  categories: string[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const runTemplateAction = (task: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await task()
        router.refresh()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Nao foi possivel atualizar este preset.'
        alert(message)
      }
    })
  }

  const handleUpdate = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await updatePromptTemplate(template.id, formData)
        setOpen(false)
        router.refresh()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Nao foi possivel salvar este preset.'
        alert(message)
      }
    })
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <div className="flex items-center gap-4 px-6 py-4">
        <div className="h-16 w-16 overflow-hidden rounded-lg border border-white/10 bg-white/5">
          {template.coverImageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={template.coverImageUrl} alt={template.title} className="h-full w-full object-cover" />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-widest text-white/25">
              Sem capa
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{template.title}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                template.isVisible ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/30'
              }`}
            >
              {template.isVisible ? 'visivel' : 'oculto'}
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
              {template.generationMode}
            </span>
            <span className="rounded-full bg-[#0C171A] px-2 py-0.5 text-[10px] text-[#54D6F6]">
              {template.creditCost} cr
            </span>
          </div>
          <p className="text-xs text-white/70">{template.category}</p>
          <p className="mt-1 text-[11px] text-white/45">
            ordem {template.sortOrder} • {template.requiredImagesCount} imagem(ns) • {template.exampleImages.length} exemplos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => runTemplateAction(() => duplicatePromptTemplate(template.id))}
            disabled={isPending}
            className="rounded-lg bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-300 transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? 'Duplicando...' : 'Duplicar'}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => setOpen((value) => !value)}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {open ? 'Fechar' : 'Editar'}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (!confirm('Deletar este preset permanentemente?')) return
              runTemplateAction(() => deletePromptTemplate(template.id))
            }}
            className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Deletar
          </button>
        </div>
      </div>

      {open ? (
        <PromptTemplateForm
          categories={categories}
          template={template}
          submitLabel={isPending ? 'Salvando...' : 'Salvar alteracoes'}
          action={handleUpdate}
          pending={isPending}
        />
      ) : null}
    </div>
  )
}

function PromptTemplateForm({
  categories,
  template,
  submitLabel,
  action,
  pending = false,
}: {
  categories: string[]
  template: PromptGalleryTemplate
  submitLabel: string
  action: (formData: FormData) => Promise<void>
  pending?: boolean
}) {
  return (
    <form action={action} className="flex flex-col gap-4 border-t border-white/10 bg-white/[0.03] px-6 py-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-white/75">Titulo</label>
          <input
            name="title"
            defaultValue={template.title}
            required
            className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/75">Formato</label>
          <select
            name="format"
            defaultValue={template.format}
            className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            <option value="TEXT">TEXT</option>
            <option value="JSON">JSON</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <CategoryField categories={categories} currentCategory={template.category} />
        <div>
          <label className="mb-1 block text-xs font-medium text-white/75">Ordem</label>
          <input
            name="sort_order"
            type="number"
            defaultValue={template.sortOrder}
            className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-white/75">Modo</label>
          <select
            name="generation_mode"
            defaultValue={template.generationMode}
            className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            <option value="identity_scene">identity_scene</option>
            <option value="product_model">product_model</option>
            <option value="virtual_tryon">virtual_tryon</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/75">Input</label>
          <select
            name="input_mode"
            defaultValue={template.inputMode}
            className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            <option value="single_image">single_image</option>
            <option value="person_and_product">person_and_product</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/75">Imagens</label>
          <input
            name="required_images_count"
            type="number"
            min="1"
            max="3"
            defaultValue={template.requiredImagesCount}
            className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/75">Custo</label>
          <input
            name="credit_cost"
            type="number"
            min="0"
            defaultValue={template.creditCost}
            className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-white/75">Visibilidade</label>
          <select
            name="is_visible"
            defaultValue={String(template.isVisible)}
            className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            <option value="true">Visivel</option>
            <option value="false">Oculto</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/75">Identity lock</label>
          <select
            name="identity_lock"
            defaultValue={String(template.identityLock)}
            className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            <option value="true">Ativo</option>
            <option value="false">Desligado</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/75">Fonte da roupa</label>
          <select
            name="outfit_source"
            defaultValue={template.outfitSource}
            className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            <option value="identity">identity: roupa enviada</option>
            <option value="template">template: roupa da base</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-white/75">Descricao</label>
        <textarea
          name="description"
          defaultValue={template.description}
          rows={3}
          className="w-full resize-y rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-white/75">Texto de uso</label>
        <input
          name="usage_label"
          defaultValue={template.usageLabel}
          className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-white/75">Prompt oculto do preset</label>
        <textarea
          name="prompt"
          defaultValue={template.prompt}
          rows={8}
          required
          className="w-full resize-y rounded-lg border border-white/10 bg-white/10 px-3 py-2 font-mono text-sm text-white focus:border-white/30 focus:outline-none"
        />
      </div>

      <div className="border-t border-white/10 pt-4">
        <p className="mb-3 text-xs uppercase tracking-widest text-white/75">Imagens</p>
        <div className="mb-4 rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-100/90">
          A <strong className="text-cyan-200">Capa do card</strong> e a imagem-base real usada na geracao.
          <span className="block mt-1 text-cyan-100/75">
            Se voce duplicar o preset e trocar a capa, a geracao vai usar essa nova foto como base.
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ImageUploadField name="cover_image_url" label="Capa do card" currentUrl={template.coverImageUrl} />
          <ImageUploadField name="example_image_1_url" label="Exemplo 1" currentUrl={template.exampleImages[0] ?? ''} />
          <ImageUploadField name="example_image_2_url" label="Exemplo 2" currentUrl={template.exampleImages[1] ?? ''} />
          <ImageUploadField name="example_image_3_url" label="Exemplo 3" currentUrl={template.exampleImages[2] ?? ''} />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending || categories.length === 0}
          className="rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

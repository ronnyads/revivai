import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  DEFAULT_PROMPT_TEMPLATES,
  normalizePromptTemplate,
  PromptTemplateRow,
  stripPromptTemplate,
} from '@/lib/prompt-gallery'
import { redirect } from 'next/navigation'
import PromptGalleryContent from '@/components/dashboard/PromptGalleryContent'

export default async function PromptGalleryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('prompt_templates')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const initialTemplates =
    !error && data && data.length > 0
      ? (data as PromptTemplateRow[]).map(normalizePromptTemplate)
      : DEFAULT_PROMPT_TEMPLATES

  return <PromptGalleryContent initialTemplates={initialTemplates.map(stripPromptTemplate)} />
}

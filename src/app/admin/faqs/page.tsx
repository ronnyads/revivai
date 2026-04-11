export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { FaqRow, NewFaqForm } from './FaqForm'

export default async function FaqsPage() {
  const supabase = createAdminClient()
  const { data } = await supabase.from('faqs').select('*').order('order')
  const faqs = data ?? []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Perguntas Frequentes</h1>
        <p className="text-sm text-white/40 mt-1">Gerencie as perguntas e respostas exibidas na landing page.</p>
      </div>

      <div className="flex flex-col gap-4 max-w-2xl">
        {faqs.map((f: any) => (
          <FaqRow key={f.id} f={f} />
        ))}
        <NewFaqForm />
      </div>
    </div>
  )
}

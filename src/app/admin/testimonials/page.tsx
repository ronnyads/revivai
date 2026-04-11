export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { TestimonialRow, NewTestimonialForm } from './TestimonialForm'

export default async function TestimonialsPage() {
  const supabase = createAdminClient()
  const { data } = await supabase.from('testimonials').select('*').order('order')
  const testimonials = data ?? []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Depoimentos</h1>
        <p className="text-sm text-white/40 mt-1">Gerencie os depoimentos exibidos na landing page.</p>
      </div>

      <div className="flex flex-col gap-4 max-w-2xl">
        {testimonials.map((t: any) => (
          <TestimonialRow key={t.id} t={t} />
        ))}
        <NewTestimonialForm />
      </div>
    </div>
  )
}

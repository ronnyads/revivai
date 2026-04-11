import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULTS = [
  { id: '1', name: 'Maria Aparecida', role: 'Cliente desde 2024', quote: 'Restaurei fotos da minha avó de 1960. Fiquei em lágrimas com o resultado. A qualidade é impressionante.' },
  { id: '2', name: 'Ricardo Pimentel', role: 'Fotógrafo profissional', quote: 'Fotógrafo profissional aqui. Uso o reviv.ai para restaurar acervos de clientes. A colorização é absurdamente boa.' },
  { id: '3', name: 'Carla Souza', role: 'Designer gráfica', quote: 'Rapidez e qualidade que não encontrei em nenhum outro serviço. Vale cada centavo do pacote anual.' },
]

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default async function Testimonials() {
  let reviews = DEFAULTS
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('testimonials').select('id, name, role, quote').eq('active', true).order('order')
    if (data && data.length > 0) reviews = data
  } catch {}

  return (
    <section id="depoimentos" className="bg-surface py-28">
      <div className="max-w-7xl mx-auto px-8 md:px-12">
        <p className="flex items-center gap-3 text-xs tracking-[2px] uppercase text-accent font-medium mb-4">
          <span className="w-6 h-px bg-accent" />Depoimentos
        </p>
        <h2 className="font-display text-5xl md:text-6xl font-normal tracking-tight leading-tight mb-16">
          O que nossos<br />clientes <em className="italic text-accent">dizem</em>
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map(r => (
            <div key={r.id} className="bg-white rounded-xl p-9 border border-[#E8E8E8] hover:-translate-y-0.5 transition-transform duration-300">
              <div className="flex gap-0.5 mb-5">
                {[...Array(5)].map((_, i) => <span key={i} className="text-accent text-sm">★</span>)}
              </div>
              <blockquote className="font-display text-xl font-normal italic leading-relaxed text-ink mb-6">
                "{r.quote}"
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center text-sm font-semibold text-accent">
                  {getInitials(r.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{r.name}</p>
                  <p className="text-xs text-muted">{r.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

import { createAdminClient } from '@/lib/supabase/admin'

const DEFAULTS = [
  { id: '1', name: 'Maria Aparecida', role: 'Cliente premium', quote: 'Restaurei fotos da minha avó de 1960. Fiquei em lágrimas com o resultado. A qualidade é impressionante.' },
  { id: '2', name: 'Ricardo Pimentel', role: 'Fotógrafo profissional', quote: 'Uso o reviv.ai para restaurar acervos de clientes. A colorização é absurdamente fiel ao contexto original.' },
  { id: '3', name: 'Carla Souza', role: 'Diretora Criativa', quote: 'Rapidez e qualidade que não encontrei em nenhum outro serviço. O Ad Studio mudou nossa produção.' },
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
    <section id="depoimentos" className="bg-[#131315] py-32 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4FF00] mb-6">FEEDBACK</p>
        <h2 className="font-display text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-[0.95] mb-20 max-w-4xl text-white">
          O QUE NOSSOS <br /><span className="text-white/20">CLIENTES DIZEM</span>
        </h2>
        
        <div className="grid md:grid-cols-3 gap-px bg-white/5 border border-white/5">
          {reviews.map(r => (
            <div key={r.id} className="bg-[#131315] p-10 flex flex-col group hover:bg-[#201f22] transition-colors duration-500">
              <div className="flex gap-1 mb-8">
                {[...Array(5)].map((_, i) => <div key={i} className="w-1 h-1 bg-[#D4FF00]" />)}
              </div>
              
              <blockquote className="text-xl font-medium font-sans leading-relaxed text-white/70 mb-10 italic">
                "{r.quote}"
              </blockquote>
              
              <div className="mt-auto flex items-center gap-4">
                <div className="w-12 h-12 flex items-center justify-center text-xs font-bold bg-white/5 border border-white/10 text-white group-hover:border-[#D4FF00] transition-colors">
                  {getInitials(r.name)}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white">{r.name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4FF00]/40">{r.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

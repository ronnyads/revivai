'use client'

const TESTIMONIALS = [
  {
    author: "Juliana Mendes",
    role: "Diretora Criativa",
    content: "A RevivAI reduziu nosso tempo de produção de lookbooks de semanas para horas. A qualidade é indistinguível de fotos reais."
  },
  {
    author: "Lucas Rocha",
    role: "Fundador de Marca",
    content: "Poder testar coleções inteiras antes mesmo de fabricar as peças é o futuro da sustentabilidade na moda. Incrível."
  },
  {
    author: "Beatriz Lima",
    role: "Fashion Designer",
    content: "Interface impecável e resultados que superam as melhores agências de casting de São Paulo e Milão."
  }
]

export default function Testimonials() {
  return (
    <section className="py-32 px-6 lg:px-20 bg-[#131315] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#7C0DF2]/5 blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="mb-24 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#7C0DF2] mb-6">PROVA SOCIAL</p>
          <h2 className="text-5xl md:text-[5.5rem] font-bold font-display uppercase tracking-tighter leading-[0.95] mb-6">
            QUEM USA, <br /><span className="text-white/20">REVOLUCIONA</span>
          </h2>
          <p className="text-lg text-white/50 font-sans max-w-xl mx-auto">
            Diretores criativos e fundadores de marcas globais.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 border border-white/5">
          {TESTIMONIALS.map((t, idx) => (
            <div key={idx} className="bg-[#131315] p-12 hover:bg-white/[0.02] transition-all duration-700 flex flex-col justify-between relative group overflow-hidden cursor-default">
              {/* Hover Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#7C0DF2]/0 via-[#7C0DF2]/0 to-[#7C0DF2]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              
              <div className="relative z-10">
                 <div className="flex gap-1 text-[#7C0DF2] mb-8 group-hover:drop-shadow-[0_0_8px_rgba(124,13,242,0.4)] transition-all duration-700">
                   {[1, 2, 3, 4, 5].map(star => (
                     <svg key={star} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                       <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                     </svg>
                   ))}
                 </div>
                 <p className="text-lg text-white/70 group-hover:text-white leading-relaxed font-sans mb-12 transition-colors duration-500">
                   "{t.content}"
                 </p>
              </div>
              <div className="relative z-10">
                 <p className="font-display text-xl font-bold uppercase tracking-tight text-white">{t.author}</p>
                 <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 group-hover:text-[#7C0DF2]/60 transition-colors duration-700">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

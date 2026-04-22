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
    <section className="relative overflow-hidden bg-[#0E0E0E] px-6 py-28 lg:px-20">
      <div className="absolute top-0 right-0 h-[600px] w-[600px] bg-[#00ADCC]/6 blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="mb-24 text-center">
          <p className="font-label mb-6 text-[11px] text-[#54D6F6]">Prova social</p>
          <h2 className="font-display text-5xl font-bold uppercase tracking-tight leading-[0.95] mb-6 md:text-[5.5rem]">
            QUEM USA, <br /><span className="text-white/20">REVOLUCIONA</span>
          </h2>
          <p className="text-lg text-white/50 font-sans max-w-xl mx-auto">
            Diretores criativos e fundadores de marcas globais.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 gap-px border border-white/5 bg-white/5 md:grid-cols-3">
          {TESTIMONIALS.map((t, idx) => (
            <div key={idx} className="group relative flex cursor-default flex-col justify-between overflow-hidden bg-[#131313] p-12 transition-all duration-700 hover:bg-white/[0.02]">
              {/* Hover Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#00ADCC]/0 via-[#00ADCC]/0 to-[#00ADCC]/6 opacity-0 transition-opacity duration-1000 group-hover:opacity-100" />
              
              <div className="relative z-10">
                 <div className="mb-8 flex gap-1 text-[#54D6F6] transition-all duration-700 group-hover:drop-shadow-[0_0_8px_rgba(84,214,246,0.35)]">
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
                 <p className="font-label text-[10px] text-white/30 transition-colors duration-700 group-hover:text-[#54D6F6]/65">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

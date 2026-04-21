'use client'
import { Plus, Maximize2, Layers, Cpu } from 'lucide-react'

const SHOWCASE_ITEMS = [
  {
    badge: 'TECNOLOGIA FLUX-1',
    title: 'LOOKBOOK EDITORIAL',
    desc: 'Explore a qualidade inigualável das gerações RevivAI. Detalhes de tecido, iluminação natural e texturas realistas que definem o novo padrão da moda digital.',
    tags: ['Hiper-Realismo', 'Lookbook', 'Editorial'],
    icon: <Layers size={20} />,
  },
  {
    badge: 'CONTROLE TOTAL',
    title: 'ONDE A MÁGICA ACONTECE',
    desc: 'Nossa interface intuitiva permite que você controle cada variável da sua imagem. Da direção de luz à etnia da modelo, tudo está ao alcance de um clique.',
    tags: ['Consistência de Marca', 'Texturas 8K', 'Upscaling 4K'],
    icon: <Cpu size={20} />,
  },
]

export default function StudioShowcase() {
  return (
    <section className="py-32 px-6 lg:px-20 bg-[#131315] relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#D4FF00]/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="mb-24 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4FF00] mb-6">EXCELÊNCIA VISUAL</p>
          <h2 className="text-5xl md:text-[5.5rem] font-bold font-display uppercase tracking-tighter leading-[0.95]">
            QUALIDADE <br /><span className="text-white/20">CINEMATOGRÁFICA</span>
          </h2>
        </div>

        {/* Lookbook Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-white/5 border border-white/5 mb-24">
          
          {/* Main Showcase Card */}
          <div className="lg:col-span-12 p-12 lg:p-24 bg-[#131315] flex flex-col lg:flex-row gap-16 items-center">
             <div className="flex-1">
                <div className="flex items-center gap-3 text-[#D4FF00] mb-8">
                  <Maximize2 size={24} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em]">{SHOWCASE_ITEMS[0].badge}</span>
                </div>
                <h3 className="text-4xl md:text-6xl font-bold font-display uppercase tracking-tight mb-8">
                  {SHOWCASE_ITEMS[0].title}
                </h3>
                <p className="text-lg text-white/50 leading-relaxed font-sans max-w-2xl">
                  {SHOWCASE_ITEMS[0].desc}
                </p>
             </div>
             
             <div className="w-full lg:w-[400px] aspect-[3/4] bg-white/5 backdrop-blur-xl relative group overflow-hidden border border-white/5 hover:border-[#D4FF00]/40 transition-all duration-1000 cursor-pointer shadow-[0_0_40px_rgba(0,0,0,0.5)] hover:shadow-[0_0_60px_rgba(212,255,0,0.05)]">
                <div className="absolute inset-0 bg-gradient-to-t from-[#131315] via-[#131315]/40 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#D4FF00]/0 to-[#D4FF00]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                <div className="absolute bottom-8 left-8 right-8 z-10 transform group-hover:-translate-y-2 transition-transform duration-700">
                   <p className="text-[10px] font-bold text-[#D4FF00] tracking-[0.3em] uppercase mb-2 shadow-black/50 drop-shadow-md">SAMPLE 01</p>
                   <p className="text-white font-bold tracking-widest uppercase shadow-black/50 drop-shadow-md">SUMMER EDITORIAL</p>
                </div>
             </div>
          </div>

          {/* Secondary Showcase Card */}
          <div className="lg:col-span-12 p-12 lg:p-24 bg-[#131315] flex flex-col lg:flex-row-reverse gap-16 items-center border-t border-white/5">
             <div className="flex-1">
                <div className="flex items-center gap-3 text-[#D4FF00] mb-8">
                  <Cpu size={24} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em]">{SHOWCASE_ITEMS[1].badge}</span>
                </div>
                <h3 className="text-4xl md:text-6xl font-bold font-display uppercase tracking-tight mb-8">
                  {SHOWCASE_ITEMS[1].title}
                </h3>
                <p className="text-lg text-white/50 leading-relaxed font-sans max-w-2xl">
                  {SHOWCASE_ITEMS[1].desc}
                </p>
                
                <div className="flex flex-wrap gap-3 mt-10">
                   {SHOWCASE_ITEMS[1].tags.map(tag => (
                     <div key={tag} className="px-4 py-2 bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-[0.2em] text-white/60">
                       {tag}
                     </div>
                   ))}
                </div>
             </div>
             
             <div className="w-full lg:w-[400px] aspect-[4/3] bg-white/5 backdrop-blur-xl relative border border-white/5 flex items-center justify-center group overflow-hidden hover:border-[#D4FF00]/40 transition-all duration-1000 cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#D4FF00]/0 to-[#D4FF00]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none z-0" />
                <div className="w-24 h-24 border border-white/5 flex items-center justify-center group-hover:border-[#D4FF00]/50 transition-colors duration-700 group-hover:scale-110 group-hover:bg-[#D4FF00]/5 z-10 relative">
                   <Plus size={32} className="text-white/20 group-hover:text-[#D4FF00] transition-colors duration-700" />
                </div>
                <div className="absolute bottom-8 left-8 z-10 transform group-hover:translate-x-2 transition-transform duration-700">
                   <p className="text-[10px] font-bold text-white/40 group-hover:text-[#D4FF00] tracking-[0.3em] uppercase transition-colors duration-700">VIRTUAL ATELIER</p>
                </div>
             </div>
          </div>

        </div>

      </div>
    </section>
  )
}

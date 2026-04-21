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
             
             <div className="w-full lg:w-[400px] aspect-[3/4] bg-[#201f22] relative group overflow-hidden border border-white/10">
                <div className="absolute inset-0 bg-gradient-to-t from-[#131315] to-transparent opacity-60" />
                <div className="absolute bottom-8 left-8 right-8">
                   <p className="text-[10px] font-bold text-[#D4FF00] tracking-[0.3em] uppercase mb-2">SAMPLE 01</p>
                   <p className="text-white font-bold tracking-widest uppercase">SUMMER EDITORIAL</p>
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
             
             <div className="w-full lg:w-[400px] aspect-[4/3] bg-[#201f22] relative border border-white/10 flex items-center justify-center">
                <div className="w-24 h-24 border border-white/5 flex items-center justify-center">
                   <Plus size={32} className="text-white/10" />
                </div>
                <div className="absolute bottom-8 left-8">
                   <p className="text-[10px] font-bold text-white/40 tracking-[0.3em] uppercase">VIRTUAL ATELIER</p>
                </div>
             </div>
          </div>

        </div>

      </div>
    </section>
  )
}

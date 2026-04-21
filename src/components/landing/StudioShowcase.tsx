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
    <section id="recursos" className="py-32 tonal-layer-0">
      {/* Header Editorial */}
      <div className="max-w-7xl mx-auto px-6 mb-24 editorial-asymmetry">
        <p className="text-[10px] uppercase tracking-[0.5em] font-bold mb-6 text-[#7C0DF2]">
          RECURSOS AVANÇADOS
        </p>
        <h2 className="font-display text-5xl md:text-[7rem] font-bold leading-[0.9] max-w-5xl text-white">
          TECNOLOGIA <br /><span className="text-white/10 text-6xl md:text-[6rem]">PARA MARCAS DE ELITE</span>
        </h2>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 px-6 lg:px-20">
        
            QUALIDADE <br /><span className="text-white/10 text-5xl md:text-[6rem]">CINEMATOGRÁFICA</span>
          </h2>
        </div>

        {/* Studio Grid Asymmetric */}
        <div className="flex flex-col gap-32">
          
          {/* Item 1: High Contrast */}
          <div className="flex flex-col lg:flex-row gap-20 items-center">
             <div className="flex-1 order-2 lg:order-1">
                <div className="flex items-center gap-3 text-[#7C0DF2] mb-8">
                  <Maximize2 size={24} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em]">{SHOWCASE_ITEMS[0].badge}</span>
                </div>
                <h3 className="text-4xl md:text-6xl font-bold font-display mb-8 text-white">
                  {SHOWCASE_ITEMS[0].title}
                </h3>
                <p className="text-lg text-white/40 leading-relaxed font-sans max-w-xl">
                  {SHOWCASE_ITEMS[0].desc}
                </p>
             </div>
             
             <div className="w-full lg:w-[60%] aspect-[4/5] tonal-layer-1 relative group overflow-hidden order-1 lg:order-2">
                <div className="absolute inset-0 bg-gradient-to-t from-[#131315] via-transparent to-transparent opacity-60" />
                <div className="absolute inset-0 bg-[#7C0DF2]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                <div className="absolute bottom-12 left-12 right-12 z-10 transition-transform duration-700">
                   <p className="text-[10px] font-bold text-[#7C0DF2] tracking-[0.3em] mb-2 uppercase">SAMPLE 01</p>
                   <p className="text-white text-2xl font-display font-bold tracking-widest uppercase">SUMMER EDITORIAL</p>
                </div>
             </div>
          </div>

          {/* Item 2: Asymmetric Overlap */}
          <div className="flex flex-col lg:flex-row-reverse gap-20 items-center">
             <div className="flex-1 editorial-asymmetry">
                <div className="flex items-center gap-3 text-[#7C0DF2] mb-8">
                  <Cpu size={24} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em]">{SHOWCASE_ITEMS[1].badge}</span>
                </div>
                <h3 className="text-4xl md:text-6xl font-bold font-display mb-8 text-white">
                  {SHOWCASE_ITEMS[1].title}
                </h3>
                <p className="text-lg text-white/40 leading-relaxed font-sans max-w-xl">
                  {SHOWCASE_ITEMS[1].desc}
                </p>
             </div>
             
             <div className="w-full lg:w-[45%] aspect-square tonal-layer-1 flex items-center justify-center group overflow-hidden relative">
                <div className="absolute inset-0 bg-[#7C0DF2]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 z-0" />
                <div className="w-32 h-32 border border-white/5 flex items-center justify-center group-hover:border-[#7C0DF2]/50 transition-all duration-700 group-hover:bg-[#7C0DF2]/5 z-10 scale-90 group-hover:scale-100">
                   <Plus size={40} className="text-white/20 group-hover:text-[#7C0DF2] transition-colors" />
                </div>
             </div>
          </div>

        </div>
      </div>
    </section>
  )
}

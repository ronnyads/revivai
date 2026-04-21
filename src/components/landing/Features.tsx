'use client'
import { ArrowRight, Box, Camera, Layers, Share2, ScanFace, Globe, Shirt, Maximize } from 'lucide-react'

const FEATURES = [
  {
    tag: 'CASTING IA',
    title: 'CASTING VIRTUAL',
    desc: 'Escolha entre milhares de modelos gerados por IA ou crie o seu próprio com traços específicos e consistentes.',
    icon: <ScanFace size={24} />,
  },
  {
    tag: 'CENÁRIOS',
    title: 'ESTÚDIO INFINITO',
    desc: 'Coloque suas modelos em qualquer lugar do mundo, do topo de uma montanha às ruas futuristas de Tóquio.',
    icon: <Globe size={24} />,
  },
  {
    tag: 'FÍSICA REAL',
    title: 'IA DE TECIDOS',
    desc: 'Nossa IA entende a física dos tecidos: seda, couro, denim e malha reagem de forma realista à luz e ao movimento.',
    icon: <Shirt size={24} />,
  },
  {
    tag: 'CONVERSÃO',
    title: 'PROVADOR VIRTUAL',
    desc: 'Aumente sua conversão em até 40% permitindo que seus clientes vejam as roupas em avatares com suas medidas reais.',
    icon: <Maximize size={24} />,
  },
]

export default function Features() {
  return (
    <section id="recursos" className="py-32 bg-[#131315]">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 mb-24 text-center lg:text-left">
        <p className="text-[10px] uppercase tracking-[0.4em] font-bold mb-6 text-[#D4FF00]">
          RECURSOS AVANÇADOS
        </p>
        <h2 className="font-display text-5xl md:text-[6rem] font-bold uppercase tracking-tighter leading-[0.95] max-w-5xl">
          TECNOLOGIA DE PONTA <br /><span className="text-white/20">PARA MARCAS DE ELITE</span>
        </h2>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 border-y border-white/5">
        {FEATURES.map((f) => (
          <div key={f.tag} className="bg-[#131315] p-12 flex flex-col hover:bg-[#201f22] transition-all duration-700 group">
            <div className="w-12 h-12 flex items-center justify-center text-[#D4FF00] mb-10 group-hover:scale-110 transition-transform">
               {f.icon}
            </div>
            
            <span className="text-[9px] font-bold text-[#D4FF00]/60 tracking-[0.3em] uppercase mb-6">
              {f.tag}
            </span>
            
            <h3 className="font-display text-2xl font-bold uppercase tracking-tight leading-tight mb-6 text-white group-hover:text-[#D4FF00] transition-colors">
              {f.title}
            </h3>
            
            <p className="text-sm text-white/40 leading-relaxed mb-10 font-sans">{f.desc}</p>
            
            <div className="mt-auto">
               <div className="w-8 h-px bg-white/10 group-hover:w-full group-hover:bg-[#D4FF00] transition-all duration-700" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

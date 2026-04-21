'use client'
import { PencilLine, Cpu, Sparkles, ShoppingBag } from 'lucide-react'

export default function HowItWorks() {
  const steps = [
    {
      icon: <PencilLine size={24} />,
      n: '01',
      title: 'CROQUI & CONCEITO',
      desc: 'Suba seus esboços, fotos de referência ou simples descrições de texto. A IA entende a essência do seu design.',
    },
    {
      icon: <Cpu size={24} />,
      n: '02',
      title: 'RENDERIZAÇÃO MAGION',
      desc: 'Nossa tecnologia Flux-1 processa as fibragens têxteis e a iluminação volumétrica para criar o look ideal.',
    },
    {
      icon: <Sparkles size={24} />,
      n: '03',
      title: 'DIREÇÃO DE ARTE',
      desc: 'Ajuste poses, troque ambientes e defina a etnia das modelos para garantir que a campanha tenha a cara da sua marca.',
    },
    {
      icon: <ShoppingBag size={24} />,
      n: '04',
      title: 'PRONTO PARA VENDER',
      desc: 'Exporte lookbooks e anúncios otimizados para conversão em redes sociais e e-commerce em segundos.',
    },
  ]

  return (
    <section id="como-funciona" className="py-32 bg-[#131315] border-y border-white/5 relative">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4FF00] mb-6">THE PROCESS</p>
            <h2 className="text-5xl md:text-[5.5rem] font-bold font-display uppercase tracking-tighter leading-[0.95]">
              DO CROQUI <br /><span className="text-white/20">À PASSARELA</span>
            </h2>
          </div>
          <div className="hidden md:block pb-5 text-[#D4FF00]/30 font-display text-8xl font-bold opacity-10">
            WORKFLOW
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5">
          {steps.map((step) => (
            <div key={step.n} className="bg-[#131315] p-12 flex flex-col group hover:bg-[#201f22] transition-colors duration-700">
               <div className="flex items-center justify-between mb-16">
                  <div className="w-14 h-14 bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:bg-[#D4FF00] group-hover:text-[#131315] transition-all duration-700">
                    {step.icon}
                  </div>
                  <span className="text-4xl font-bold font-display opacity-5 group-hover:opacity-100 group-hover:text-[#D4FF00] transition-all duration-700">
                    {step.n}
                  </span>
               </div>
               
               <h3 className="text-xl font-bold font-display uppercase tracking-tight mb-4 text-white">
                  {step.title}
               </h3>
               
               <p className="text-sm text-white/40 font-sans leading-relaxed">
                  {step.desc}
               </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

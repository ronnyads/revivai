'use client'
import { Upload, Cpu, Zap, Download } from 'lucide-react'

export default function HowItWorks() {
  const steps = [
    {
      icon: <Upload size={24} />,
      n: '01',
      title: 'UPLOAD DE ARQUIVOS',
      desc: 'Arraste e solte suas memórias na interface. Suportamos fotos em alta resolução (300dpi+) e formatos profissionais.',
    },
    {
      icon: <Cpu size={24} />,
      n: '02',
      title: 'DIAGNÓSTICO IA',
      desc: 'Nossa rede neural mapeia cada pixel para detectar deterioração física, perda de grão e desbotamento químico.',
    },
    {
      icon: <Zap size={24} />,
      n: '03',
      title: 'PROCESSAMENTO REAL',
      desc: 'Reconstruímos texturas e reequilibramos tons mantendo a fidelidade à iluminação da era original da foto.',
    },
    {
      icon: <Download size={24} />,
      n: '04',
      title: 'EXPORTAÇÃO 4K',
      desc: 'Exporte em alta fidelidade. Sua memória agora está pronta para impressão ou arquivamento digital seguro.',
    },
  ]

  return (
    <section id="como-funciona" className="py-32 bg-[#131315] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-24 text-center lg:text-left">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4FF00] mb-6">WORKFLOW</p>
          <h2 className="text-5xl md:text-7xl font-bold font-display uppercase tracking-tighter leading-[0.95] max-w-4xl">
            A ARTE DA PRESERVAÇÃO <br />
            <span className="text-white/20">ATRAVÉS DA IA</span>
          </h2>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5">
          {steps.map((step) => (
            <div key={step.n} className="bg-[#131315] p-10 flex flex-col group hover:bg-[#201f22] transition-colors duration-500">
               <div className="flex items-center justify-between mb-12">
                  <div className="p-4 bg-white/5 border border-white/10 group-hover:bg-[#D4FF00] group-hover:text-[#131315] transition-all duration-500">
                    {step.icon}
                  </div>
                  <span className="text-4xl font-bold font-display opacity-10 group-hover:opacity-100 group-hover:text-[#D4FF00] transition-opacity">
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

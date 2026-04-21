'use client'
import BeforeAfterSlider from '@/components/ui/BeforeAfterSlider'
import { ArrowRight } from 'lucide-react'

const BASE = 'https://uuulhirkggwraklmegdb.supabase.co/storage/v1/object/public/photos/c4e1b0fa-66a9-41ba-a34b-625480a7d9e3'

const FEATURES = [
  {
    tag: 'REPARAÇÃO DE DANOS',
    title: 'REPARE ARRANHÕES, MANCHAS E RASGOS INSTANTANEAMENTE',
    desc: 'Nossa IA detecta e remove automaticamente riscos, rasgos, manchas de mofo e deterioração física. Sem trabalho manual — resultado profissional em segundos.',
    before: `${BASE}/1775696325720.jpg`,
    after:  `${BASE}/1775696341762_restored.jpg`,
  },
  {
    tag: 'RESTAURAÇÃO DE ROSTOS',
    title: 'REVELE CADA DETALHE DO ROSTO COM CLAREZA NATURAL',
    desc: 'Tecnologia de ponta para reconstruir rostos desfocados, danificados ou degradados com precisão cirúrgica.',
    before: `${BASE}/1775740634445.jpg`,
    after:  `${BASE}/1775740648406_restored.jpg`,
  },
  {
    tag: 'COLORIZAÇÃO AUTOMÁTICA',
    title: 'ADICIONE CORES VIBRANTES COM PRECISÃO DE IA',
    desc: 'Transforme fotos em preto e branco ou sépia em imagens coloridas e realistas analisando o contexto histórico.',
    before: `${BASE}/1775683275662.jpg`,
    after:  `${BASE}/1775683301851_restored.jpg`,
  },
  {
    tag: 'UPSCALING 4X',
    title: 'AMPLIE SEM PERDER QUALIDADE — ATÉ 4X A RESOLUÇÃO',
    desc: 'Recupere detalhes que pareciam perdidos aumentando a resolução da imagem em até 400%.',
    before: `${BASE}/1775730116128.jpg`,
    after:  `${BASE}/1775730143782_restored.jpg`,
  },
]

export default function Features() {
  return (
    <section id="recursos" className="py-32 bg-[#131315]">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 mb-24 lg:text-left">
        <p className="text-[10px] uppercase tracking-[0.4em] font-bold mb-6 text-[#D4FF00]">
          RESTAURAÇÃO PROFISSIONAL
        </p>
        <h2 className="font-display text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-[0.95] max-w-4xl">
          TUDO QUE SUA FOTO PRECISA,<br /><span className="text-white/20">EM UM SÓ LUGAR</span>
        </h2>
      </div>

      {/* Feature rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5 border-y border-white/5">
        {FEATURES.map((f, i) => (
          <div key={f.tag} className="bg-[#131315] p-10 md:p-16 flex flex-col gap-10">
            {/* Text */}
            <div className="order-2 md:order-1">
              <span className="inline-block text-[10px] font-bold text-[#D4FF00] tracking-[0.2em] uppercase mb-6">
                {f.tag}
              </span>
              <h3 className="font-display text-2xl md:text-3xl font-bold uppercase tracking-tight leading-tight mb-6">
                {f.title}
              </h3>
              <p className="text-base text-white/50 leading-relaxed max-w-md mb-8">{f.desc}</p>
              <a
                href="/#pricing"
                className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:text-[#D4FF00] transition-colors"
              >
                RESTAURAR AGORA <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Before/After */}
            <div className="order-1 md:order-2 flex justify-center grayscale hover:grayscale-0 transition-all duration-700">
              <div className="w-full max-w-sm aspect-square relative overflow-hidden border border-white/5">
                <BeforeAfterSlider before={f.before} after={f.after} lazy />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

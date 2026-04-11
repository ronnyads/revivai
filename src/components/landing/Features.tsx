'use client'
import BeforeAfterSlider from '@/components/ui/BeforeAfterSlider'

const BASE = 'https://uuulhirkggwraklmegdb.supabase.co/storage/v1/object/public/photos/c4e1b0fa-66a9-41ba-a34b-625480a7d9e3'

const FEATURES = [
  {
    tag: 'Reparação de Danos',
    title: 'Repare arranhões, manchas e rasgos instantaneamente',
    desc: 'Nossa IA detecta e remove automaticamente riscos, rasgos, manchas de mofo e deterioração física. Sem trabalho manual — resultado profissional em segundos.',
    before: `${BASE}/1775696325720.jpg`,
    after:  `${BASE}/1775696341762_restored.jpg`,
  },
  {
    tag: 'Restauração de Rostos',
    title: 'Revele cada detalhe do rosto com clareza natural',
    desc: 'Tecnologia de ponta para reconstruir rostos desfocados, danificados ou degradados. Os modelos de IA preservam a identidade e a expressão da pessoa, tornando o resultado indistinguível de uma foto original.',
    before: `${BASE}/1775740634445.jpg`,
    after:  `${BASE}/1775740648406_restored.jpg`,
  },
  {
    tag: 'Colorização Automática',
    title: 'Adicione cores vibrantes com precisão de IA',
    desc: 'Transforme fotos em preto e branco ou sépia em imagens coloridas e realistas. Nosso modelo analisa o contexto histórico e aplica cores naturais em pele, roupas, cenário e objetos.',
    before: `${BASE}/1775683275662.jpg`,
    after:  `${BASE}/1775683301851_restored.jpg`,
  },
  {
    tag: 'Upscaling 4x',
    title: 'Amplie sem perder qualidade — até 4x a resolução original',
    desc: 'Fotos antigas têm resolução baixa. Nossa IA de nova geração aumenta a resolução em até 4x, recuperando detalhes que pareciam perdidos para sempre.',
    before: `${BASE}/1775730116128.jpg`,
    after:  `${BASE}/1775730143782_restored.jpg`,
  },
]

export default function Features() {
  return (
    <section id="recursos" className="py-24 overflow-hidden">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-8 md:px-12 mb-20 text-center">
        <p className="flex items-center justify-center gap-3 text-xs tracking-[2px] uppercase text-accent font-medium mb-4">
          <span className="w-6 h-px bg-accent" />Recursos<span className="w-6 h-px bg-accent" />
        </p>
        <h2 className="font-display text-5xl md:text-6xl font-normal tracking-tight leading-tight">
          Tudo que sua foto precisa,<br /><em className="italic text-accent">em um só lugar</em>
        </h2>
      </div>

      {/* Feature rows */}
      {FEATURES.map((f, i) => (
        <div key={f.tag} className={`max-w-7xl mx-auto px-8 md:px-12 py-16 border-t border-[#E8E8E8] ${i === FEATURES.length - 1 ? 'border-b' : ''}`}>
          <div className={`grid md:grid-cols-2 gap-16 items-center ${i % 2 === 1 ? 'md:[&>*:first-child]:order-2' : ''}`}>
            {/* Text */}
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-medium text-accent tracking-widest uppercase mb-5 bg-accent-light px-3 py-1.5 rounded-full">
                {f.tag}
              </span>
              <h3 className="font-display text-3xl md:text-4xl font-normal tracking-tight leading-tight mb-5">
                {f.title}
              </h3>
              <p className="text-base text-muted leading-relaxed mb-8">{f.desc}</p>
              <a
                href="/#pricing"
                className="inline-flex items-center gap-2 bg-ink text-white text-sm font-medium px-6 py-3 rounded border-[1.5px] border-ink hover:bg-accent hover:border-accent transition-all duration-200"
              >
                Restaurar minha foto →
              </a>
            </div>

            {/* Before/After */}
            <div className="flex justify-center">
              <div className="w-full max-w-sm">
                <BeforeAfterSlider before={f.before} after={f.after} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}

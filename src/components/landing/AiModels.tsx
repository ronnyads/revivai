export default function AiModels() {
  const models = [
    { icon: '📐', title: 'Upscaling de resolução', desc: 'Aumenta até 4x a resolução de fotos pixeladas ou borradas, preservando cada detalhe original.', tag: 'nightmareai/real-esrgan' },
    { icon: '👤', title: 'Restauração de rostos', desc: 'Reconstrói rostos danificados ou desfocados com altíssimo nível de detalhamento e naturalidade.', tag: 'sczhou/codeformer' },
    { icon: '🎨', title: 'Colorização automática', desc: 'Adiciona cores realistas a fotos em preto e branco, respeitando o contexto histórico da imagem.', tag: 'arielreplicate/deoldify' },
    { icon: '✦',  title: 'Remoção de danos', desc: 'Elimina rasgos, manchas, riscos e deterioração física com inpainting por difusão estável.', tag: 'stability-ai/sd-inpainting' },
  ]

  return (
    <section id="modelos" className="bg-surface py-28">
      <div className="max-w-7xl mx-auto px-8 md:px-12">
        <p className="flex items-center gap-3 text-xs tracking-[2px] uppercase text-accent font-medium mb-4">
          <span className="w-6 h-px bg-accent" />Tecnologia
        </p>
        <div className="flex justify-between items-end flex-wrap gap-6 mb-16">
          <h2 className="font-display text-5xl md:text-6xl font-normal tracking-tight leading-tight">
            4 modelos de IA.<br /><em className="italic text-accent">Um diagnóstico</em> preciso.
          </h2>
          <p className="text-base text-muted max-w-xs leading-relaxed">
            Cada foto tem um problema diferente. Por isso usamos o modelo certo para cada caso.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-[#E8E8E8] gap-px border border-[#E8E8E8] rounded-xl overflow-hidden">
          {models.map(m => (
            <div key={m.tag} className="bg-white p-10 hover:bg-accent-light transition-colors duration-200 cursor-default group">
              <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-xl mb-5 group-hover:bg-white transition-colors">{m.icon}</div>
              <h3 className="text-base font-medium mb-2">{m.title}</h3>
              <p className="text-sm text-muted leading-relaxed mb-4">{m.desc}</p>
              <span className="text-xs font-mono text-accent">{m.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function HowItWorks() {
  const steps = [
    { n: '01', title: 'Faça o upload da sua foto', desc: 'Suporta JPG, PNG, TIFF e BMP até 50MB. Arraste e solte ou selecione do seu dispositivo.' },
    { n: '02', title: 'Nossa IA faz o diagnóstico', desc: 'O sistema detecta automaticamente o tipo de dano e seleciona o melhor modelo de IA para cada caso.' },
    { n: '03', title: 'Restauração em segundos', desc: 'O modelo processa sua foto e entrega o resultado em alta resolução, pronto para download.' },
    { n: '04', title: 'Baixe e compartilhe', desc: 'Download em resolução máxima. Seu histórico fica salvo na conta para acessar sempre que quiser.' },
  ]

  return (
    <section id="como-funciona" className="max-w-7xl mx-auto px-8 md:px-12 py-28">
      <div className="grid md:grid-cols-2 gap-20 items-center">
        {/* Left */}
        <div>
          <p className="flex items-center gap-3 text-xs tracking-[2px] uppercase text-accent font-medium mb-4">
            <span className="w-6 h-px bg-accent" />Como funciona
          </p>
          <h2 className="font-display text-5xl md:text-6xl font-normal tracking-tight leading-tight mb-12">
            Simples como<br /><em className="italic text-accent">deve ser</em>
          </h2>
          <div className="flex flex-col">
            {steps.map((s, i) => (
              <div key={s.n} className="flex gap-8 py-9 border-b border-[#E8E8E8] first:pt-0 hover:opacity-100 opacity-50 transition-opacity duration-300 group cursor-default">
                <span className="text-accent text-xs font-semibold tracking-widest mt-1 min-w-[24px]">{s.n}</span>
                <div>
                  <h3 className="text-lg font-medium mb-2 group-hover:text-accent transition-colors">{s.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Upload visual */}
        <div className="bg-surface rounded-2xl aspect-[4/5] border border-[#E8E8E8] flex items-center justify-center p-8">
          <div className="w-full bg-white border-2 border-dashed border-[#E8E8E8] rounded-xl p-12 text-center hover:border-accent hover:bg-accent-light transition-all duration-300 cursor-pointer">
            <div className="w-14 h-14 rounded-full bg-accent-light flex items-center justify-center text-accent mx-auto mb-5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <h4 className="text-base font-medium text-ink mb-1.5">Solte sua foto aqui</h4>
            <p className="text-sm text-muted mb-5">ou clique para selecionar</p>
            <div className="flex gap-2 flex-wrap justify-center">
              {['JPG','PNG','TIFF','BMP','até 50MB'].map(f => (
                <span key={f} className="text-xs px-2.5 py-1 rounded bg-surface border border-[#E8E8E8] text-muted font-medium">{f}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

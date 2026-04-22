'use client'

export default function Economics() {
  return (
    <section className="relative overflow-hidden border-y border-white/5 py-28 px-6 lg:px-20 tonal-layer-0">
      <div className="absolute left-1/2 top-1/2 h-[420px] w-[820px] -translate-x-1/2 -translate-y-1/2 bg-[#00ADCC]/6 blur-[120px] pointer-events-none" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center gap-16 lg:flex-row">
        <div className="flex-1 text-center lg:text-left">
          <p className="font-label mb-6 text-[11px] text-[#54D6F6]">Sistema operacional</p>
          <h2 className="font-display mb-8 text-5xl font-bold uppercase tracking-tight leading-[0.95] md:text-[5rem]">
            Quanto sua operação
            <br />
            <span className="text-white/25">economiza com RevivAI?</span>
          </h2>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-white/50 lg:mx-0">
            Um pipeline premium substitui casting, set, locação e pós-produção por uma camada visual de alta precisão,
            pronta para campanhas, restauração e conteúdo iterável com consistência.
          </p>
        </div>

        <div className="w-full transition-transform duration-1000 hover:scale-[1.02] lg:w-[500px]">
          <div className="panel-card group relative overflow-hidden p-10">
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#00ADCC]/0 via-[#00ADCC]/0 to-[#00ADCC]/6 opacity-0 transition-opacity duration-1000 group-hover:opacity-100" />
            <div className="absolute -right-3 -top-3 z-20">
              <span className="bg-cyan-gradient font-label block px-4 py-2 text-[10px] text-[#003641] shadow-[0_0_20px_rgba(0,173,204,0.2)]">
                Estrutura premium
              </span>
            </div>

            <h3 className="relative z-10 mb-8 border-b border-white/5 pb-4 font-display text-white uppercase tracking-widest">
              Operação tradicional
            </h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between text-sm">
                <span className="font-label text-white/55">Fotógrafo & equipe</span>
                <span className="font-mono text-white/80">R$ 15.000</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-label text-white/55">Modelos & casting</span>
                <span className="font-mono text-white/80">R$ 8.000</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-label text-white/55">Locação & estúdio</span>
                <span className="font-mono text-white/80">R$ 5.000</span>
              </div>
            </div>

            <div className="relative z-10 mt-8 flex items-end justify-between border-t border-white/5 pt-8">
              <span className="font-label text-[10px] text-white/35">Custo tradicional</span>
              <span className="font-display text-3xl font-bold tracking-tight text-white line-through decoration-white/20">R$ 28.000</span>
            </div>

            <div className="relative z-10 mt-6 flex w-full items-center justify-between border border-white/10 bg-white/4 p-6 backdrop-blur-md transition-all duration-700 hover:border-[#00ADCC]/40 hover:bg-[#00ADCC]/5">
              <span className="font-label text-[11px] text-[#54D6F6]">Custo RevivAI</span>
              <span className="font-display text-2xl font-bold tracking-tight text-[#54D6F6]">R$ 149</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

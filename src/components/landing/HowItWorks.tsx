'use client'

export default function Economics() {
  return (
    <section className="py-32 px-6 lg:px-20 bg-[#131315] relative overflow-hidden border-y border-white/5">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#7C0DF2]/5 blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row gap-16 items-center">
        
        <div className="flex-1 text-center lg:text-left">
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold mb-6 text-[#7C0DF2]">
            VANTAGEM COMPETITIVA
          </p>
          <h2 className="font-display text-5xl md:text-[5rem] font-bold uppercase tracking-tighter leading-[0.95] mb-8">
            QUANTO VOCÊ <br /><span className="text-white/20">ECONOMIZA COM RevivAI?</span>
          </h2>
          <p className="text-lg text-white/50 leading-relaxed font-sans max-w-xl mx-auto lg:mx-0">
            Esqueça o orçamento astronômico de uma campanha física offline. O futuro da marcação e do branding editorial digital permite escalar seu conteúdo pagando uma fração.
          </p>
        </div>

        <div className="w-full lg:w-[500px] hover:scale-[1.02] transition-transform duration-1000">
          <div className="bg-white/5 backdrop-blur-2xl border border-white/5 p-10 relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-[#7C0DF2]/0 via-[#7C0DF2]/0 to-[#7C0DF2]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 z-0" />
             <div className="absolute -top-3 -right-3 z-20">
               <span className="bg-[#7C0DF2] text-white text-[9px] font-bold uppercase tracking-[0.3em] px-4 py-2 shadow-[0_0_20px_rgba(124,13,242,0.2)] block">
                 ESTIMATIVA LOCAL
               </span>
             </div>
             
             <h3 className="text-white font-bold font-display tracking-widest uppercase mb-8 pb-4 border-b border-white/5 relative z-10">Custos Tradicionais</h3>
             
             <div className="space-y-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60 uppercase tracking-wider font-bold">Fotógrafo & Equipe</span>
                  <span className="text-white font-mono opacity-80">R$ 15.000</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60 uppercase tracking-wider font-bold">Modelos & Casting</span>
                  <span className="text-white font-mono opacity-80">R$ 8.000</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/60 uppercase tracking-wider font-bold">Locação & Estúdio</span>
                  <span className="text-white font-mono opacity-80">R$ 5.000</span>
                </div>
             </div>

             <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-end relative z-10">
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Custo Tradicional</span>
                <span className="text-3xl text-white font-display font-bold tracking-tighter decoration-white/20 line-through">R$ 28.000</span>
             </div>
             
             <div className="mt-6 p-6 bg-white/5 backdrop-blur-md border border-white/10 flex justify-between items-center relative z-10 hover:border-[#7C0DF2]/40 hover:bg-[#7C0DF2]/5 transition-all duration-700 w-full rounded-none">
                <span className="text-xs text-[#7C0DF2] font-bold uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(124,13,242,0)] group-hover:shadow-[0_0_20px_rgba(124,13,242,0.1)]">Custo RevivAI</span>
                 <span className="text-2xl text-[#7C0DF2] font-display font-bold tracking-tighter">R$ 149</span>
             </div>
          </div>
        </div>

      </div>
    </section>
  )
}

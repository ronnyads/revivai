'use client'

export default function Economics() {
  return (
    <section className="py-32 px-6 lg:px-20 bg-[#131315] relative overflow-hidden border-y border-white/5">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#D4FF00]/5 blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row gap-16 items-center">
        
        <div className="flex-1 text-center lg:text-left">
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold mb-6 text-[#D4FF00]">
            VANTAGEM COMPETITIVA
          </p>
          <h2 className="font-display text-5xl md:text-[5rem] font-bold uppercase tracking-tighter leading-[0.95] mb-8">
            QUANTO VOCÊ <br /><span className="text-white/20">ECONOMIZA COM REVIVAI?</span>
          </h2>
          <p className="text-lg text-white/50 leading-relaxed font-sans max-w-xl mx-auto lg:mx-0">
            Esqueça o orçamento astronômico de uma campanha física offline. O futuro da marcação e do branding editorial digital permite escalar seu conteúdo pagando uma fração.
          </p>
        </div>

        <div className="w-full lg:w-[500px]">
          <div className="bg-[#201f22] border border-white/10 p-10 relative">
             <div className="absolute -top-3 -right-3 z-20">
               <span className="bg-[#D4FF00] text-[#131315] text-[9px] font-bold uppercase tracking-[0.3em] px-4 py-2 shadow-lg">
                 ESTIMATIVA LOCAL
               </span>
             </div>
             
             <h3 className="text-white font-bold font-display tracking-widest uppercase mb-8 pb-4 border-b border-white/10">Custos Tradicionais</h3>
             
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

             <div className="mt-8 pt-8 border-t border-white/10 flex justify-between items-end">
                <span className="text-xs text-white/40 font-bold uppercase tracking-widest">Custo Tradicional</span>
                <span className="text-3xl text-white font-display font-bold tracking-tighter">R$ 28.000</span>
             </div>
             
             <div className="mt-6 p-4 bg-[#D4FF00]/10 border border-[#D4FF00]/20 flex justify-between items-center">
                <span className="text-xs text-[#D4FF00] font-bold uppercase tracking-widest">Custo RevivAI</span>
                 <span className="text-xl text-[#D4FF00] font-display font-bold tracking-tighter">R$ 149</span>
             </div>
          </div>
        </div>

      </div>
    </section>
  )
}

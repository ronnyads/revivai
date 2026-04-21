import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[#131315] border-t border-white/5 px-8 md:px-20 py-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="flex flex-col items-center md:items-start gap-4">
          <Link href="/" className="font-display font-bold text-3xl tracking-[-0.05em] uppercase text-white hover:text-[#D94F2E] transition-colors duration-500">
            REVIV<span className="text-[#D94F2E]">.</span>AI
          </Link>
          <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/20">
            CRAFTED BY THE DIGITAL ATELIER 2025
          </p>
        </div>

        <div className="flex gap-12">
          {[
            ['PRIVACIDADE', '#'],
            ['TERMOS', '#'],
            ['CONTATO', '#'],
          ].map(([label, href]) => (
            <Link 
              key={label} 
              href={href} 
              className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/40 hover:text-[#D94F2E] transition-all duration-500 border-b border-transparent hover:border-[#D94F2E]/40 pb-1"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4 bg-white/5 border border-white/5 px-6 py-2.5 rounded-full group cursor-pointer hover:border-[#D94F2E]/40 transition-all duration-700">
           <div className="w-1.5 h-1.5 rounded-full bg-[#D94F2E] animate-pulse shadow-[0_0_8px_#D94F2E]" />
           <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-white/40 group-hover:text-white transition-colors">ESTADO DO SISTEMA: OPERACIONAL</span>
        </div>
      </div>
    </footer>
  )
}

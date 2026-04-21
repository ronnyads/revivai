import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[#131315] border-t border-white/5 px-8 md:px-20 py-20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
        <div className="flex flex-col items-center md:items-start gap-4">
          <Link href="/" className="font-display font-bold text-2xl tracking-tighter uppercase text-white">
            REVIV<span className="text-[#D4FF00]">.</span>AI
          </Link>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
            THE NEO-COUTURE SYNTHESIS © 2025
          </p>
        </div>

        <div className="flex gap-10">
          {[
            ['PRIVACIDADE', '#'],
            ['TERMOS', '#'],
            ['CONTATO', '#'],
          ].map(([label, href]) => (
            <Link 
              key={label} 
              href={href} 
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-[#D4FF00] transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
           <div className="w-1.5 h-1.5 rounded-full bg-[#D4FF00]" />
           <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">SISTEMA ONLINE</span>
        </div>
      </div>
    </footer>
  )
}

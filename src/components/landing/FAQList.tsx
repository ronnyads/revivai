'use client'
import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'

type FaqItem = { question: string; answer: string }

export default function FAQList({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="flex flex-col border-t border-white/5">
      {items.map((item, i) => (
        <div key={i} className="border-b border-white/5 bg-[#131315] hover:bg-[#201f22] transition-colors">
          <button
            className="w-full flex items-center justify-between gap-6 py-8 text-left group px-4"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-sm md:text-base font-bold uppercase tracking-tight text-white group-hover:text-[#D4FF00] transition-colors">
              {item.question}
            </span>
            <div className="shrink-0 flex items-center justify-center w-8 h-8 border border-white/10 group-hover:border-[#D4FF00] transition-colors">
               {open === i ? <Minus size={14} className="text-[#D4FF00]" /> : <Plus size={14} className="text-white/40" />}
            </div>
          </button>
          
          <div 
            className={`overflow-hidden transition-all duration-500 ease-in-out ${open === i ? 'max-h-96 opacity-100 mb-8' : 'max-h-0 opacity-0'}`}
          >
            <p className="px-4 text-sm text-white/50 leading-relaxed max-w-2xl font-sans">
               {item.answer}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

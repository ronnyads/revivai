'use client'
import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'

type FaqItem = { question: string; answer: string }

export default function FAQList({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="flex flex-col border-t border-white/5 max-w-5xl mx-auto">
      {items.map((item, i) => (
        <div key={i} className="border-b border-white/5 bg-transparent hover:bg-white/[0.01] transition-all duration-500">
          <button
            className="w-full flex items-center justify-between gap-6 py-10 text-left group px-6"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className={`text-base md:text-lg font-bold uppercase tracking-tight transition-all duration-700 ${open === i ? 'text-[#7C0DF2]' : 'text-white/80 group-hover:text-white'}`}>
              {item.question}
            </span>
            <div className={`shrink-0 flex items-center justify-center w-10 h-10 border transition-all duration-700 ${open === i ? 'border-[#7C0DF2] bg-[#7C0DF2]/10 rotate-180' : 'border-white/10 group-hover:border-white/20'}`}>
               {open === i ? <Minus size={16} className="text-[#7C0DF2]" /> : <Plus size={16} className="text-white/40" />}
            </div>
          </button>
          
          <div 
            className={`overflow-hidden transition-all duration-700 ease-in-out ${open === i ? 'max-h-96 opacity-100 pb-10' : 'max-h-0 opacity-0'}`}
          >
            <p className="px-6 text-sm md:text-base text-white/40 leading-relaxed max-w-3xl font-sans">
               {item.answer}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

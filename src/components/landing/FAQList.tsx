'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

type FaqItem = { question: string; answer: string }

export default function FAQList({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="flex flex-col divide-y divide-[#E8E8E8] border-t border-b border-[#E8E8E8]">
      {items.map((item, i) => (
        <div key={i}>
          <button
            className="w-full flex items-center justify-between gap-4 py-6 text-left group"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-base font-medium group-hover:text-accent transition-colors">{item.question}</span>
            <ChevronDown
              size={18}
              className={`shrink-0 text-muted transition-transform duration-300 ${open === i ? 'rotate-180 text-accent' : ''}`}
            />
          </button>
          {open === i && (
            <p className="pb-6 text-sm text-muted leading-relaxed">{item.answer}</p>
          )}
        </div>
      ))}
    </div>
  )
}

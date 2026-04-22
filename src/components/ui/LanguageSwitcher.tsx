'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Lang } from '@/lib/translations'

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: 'pt-BR', flag: '🇧🇷', label: 'PT-BR' },
  { code: 'en',    flag: '🇺🇸', label: 'EN' },
  { code: 'es',    flag: '🇪🇸', label: 'ES' },
]

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = LANGS.find(l => l.code === lang) ?? LANGS[0]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 rounded-full border transition-all font-label ${
          compact
            ? 'border-white/8 bg-white/[0.03] px-3 py-2 text-[10px] text-white/58 hover:border-[#54D6F6]/30 hover:text-white'
            : 'w-full justify-between border-white/8 bg-white/[0.03] px-4 py-3 text-[10px] text-white/58 hover:border-[#54D6F6]/30 hover:text-white'
        }`}
      >
        <span className="text-sm">{current.flag}</span>
        <span>{current.label}</span>
        <ChevronDown size={11} className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute z-50 overflow-hidden rounded-[20px] border border-white/8 bg-[#0C171A] shadow-[0_24px_60px_rgba(0,0,0,0.38)] min-w-[118px] ${
          compact ? 'bottom-full mb-1 right-0' : 'bottom-full mb-1 left-0 right-0'
        }`}>
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false) }}
              className={`flex w-full items-center gap-2 px-3 py-2.5 text-[11px] transition-colors hover:bg-white/[0.06] ${
                l.code === lang ? 'bg-white/[0.08] font-semibold text-[#54D6F6]' : 'text-white/62'
              }`}
            >
              <span className="text-sm">{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

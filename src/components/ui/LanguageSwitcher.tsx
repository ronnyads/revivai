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
        className={`flex items-center gap-1.5 rounded-lg transition-colors font-medium ${
          compact
            ? 'px-2 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800'
            : 'w-full px-3 py-2 text-xs text-zinc-500 hover:text-white hover:bg-zinc-900 border border-zinc-800 justify-between'
        }`}
      >
        <span className="text-sm">{current.flag}</span>
        <span>{current.label}</span>
        <ChevronDown size={11} className={`ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute z-50 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden min-w-[110px] ${
          compact ? 'bottom-full mb-1 right-0' : 'bottom-full mb-1 left-0 right-0'
        }`}>
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false) }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors hover:bg-zinc-800 ${
                l.code === lang ? 'text-white font-semibold bg-zinc-800/60' : 'text-zinc-400'
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

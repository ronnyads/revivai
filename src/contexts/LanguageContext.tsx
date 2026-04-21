'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, Lang } from '@/lib/translations'

interface LanguageContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'pt-BR',
  setLang: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('pt-BR')

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null
    if (saved && translations[saved]) setLangState(saved)
  }, [])

  const setLang = (newLang: Lang) => {
    setLangState(newLang)
    localStorage.setItem('lang', newLang)
  }

  const t = (key: string): string =>
    translations[lang]?.[key] ?? translations['pt-BR']?.[key] ?? key

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
export const useT = () => useContext(LanguageContext).t

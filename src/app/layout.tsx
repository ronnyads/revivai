import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Cormorant_Garamond, DM_Sans, Newsreader } from 'next/font/google'
import './globals.css'
import MetaPixelLoader from '@/components/MetaPixelLoader'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display-gf',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  display: 'swap',
  variable: '--font-sans-gf',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400'],
  style: ['italic'],
  display: 'optional',
  variable: '--font-hero-gf',
})

export const metadata: Metadata = {
  title: 'reviv.ai — Restaure Memórias com Inteligência Artificial',
  description: 'Restaure fotos antigas, danificadas ou em preto e branco com IA de última geração. Resultados profissionais em segundos.',
  keywords: ['restaurar fotos', 'restauração de fotos', 'IA', 'colorização', 'inteligência artificial'],
  openGraph: {
    title: 'reviv.ai — Traga o passado de volta à vida',
    description: 'Restaure fotos antigas com IA. Resultados profissionais em segundos.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${dmSans.variable} ${newsreader.variable}`}>
      <head>
        {/* Material Symbols loaded async after paint — 3.8MB icon font must not block FCP */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=block';document.head.appendChild(l)})()` }} />
      </head>
      <body>
        <Suspense>
          <MetaPixelLoader />
        </Suspense>
        {children}
      </body>
    </html>
  )
}

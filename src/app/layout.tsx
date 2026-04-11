import type { Metadata } from 'next'
import './globals.css'
import MetaPixel from '@/components/MetaPixel'
import { createAdminClient } from '@/lib/supabase/admin'

async function getPixelId() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('settings').select('value').eq('key', 'meta_pixel_id').single()
    return data?.value || ''
  } catch { return '' }
}

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pixelId = await getPixelId()
  return (
    <html lang="pt-BR">
      <head>
        {/* Preconnect to speed up font negotiation */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* UI fonts — swap: minimal files, text visible immediately */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap" />
        {/* Newsreader — loaded after paint via JS to never block FCP */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@1,48,400&display=swap';document.head.appendChild(l)})()` }} />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" />
      </head>
      <body>
        <MetaPixel pixelId={pixelId} />
        {children}
      </body>
    </html>
  )
}

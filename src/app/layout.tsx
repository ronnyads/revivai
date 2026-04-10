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
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body>
        <MetaPixel pixelId={pixelId} />
        {children}
      </body>
    </html>
  )
}

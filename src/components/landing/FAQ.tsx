import { createAdminClient } from '@/lib/supabase/admin'
import FAQList from './FAQList'

const DEFAULTS = [
  { question: 'Quanto tempo leva para restaurar uma foto?', answer: 'A maioria das restaurações é concluída em 15 a 60 segundos, dependendo do nível de dano e do tipo de processamento necessário.' },
  { question: 'Quais formatos de arquivo são suportados?', answer: 'Aceitamos JPG, JPEG, PNG, TIFF e BMP. O tamanho máximo por arquivo é 50MB.' },
  { question: 'A IA consegue restaurar fotos muito danificadas?', answer: 'Sim. Nossos modelos foram treinados para lidar com rasgos, buracos, manchas severas de mofo, desbotamento extremo e partes faltando. Quanto mais informação visual restante, melhor o resultado.' },
  { question: 'O que é colorização e quando usar?', answer: 'Colorização transforma fotos em preto e branco ou sépia em imagens coloridas e realistas. É ideal para fotos de família antigas ou registros históricos.' },
  { question: 'Minha foto fica salva na plataforma?', answer: 'Sim. Todas as fotos restauradas ficam salvas na sua conta para você acessar, baixar ou compartilhar quando quiser, sem limite de tempo.' },
  { question: 'Como funciona o sistema de créditos?', answer: 'Cada restauração consome 1 crédito. Colorização e upscaling 4x consomem 1 crédito adicional cada. Você pode comprar créditos avulsos ou assinar um plano mensal com créditos inclusos.' },
]

export default async function FAQ() {
  let items = DEFAULTS
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('faqs').select('question, answer').eq('active', true).order('order')
    if (data && data.length > 0) items = data
  } catch {}

  return (
    <section id="faq" className="max-w-3xl mx-auto px-8 md:px-12 py-28">
      <div className="text-center mb-16">
        <p className="flex items-center justify-center gap-3 text-xs tracking-[2px] uppercase text-accent font-medium mb-4">
          <span className="w-6 h-px bg-accent" />Dúvidas frequentes<span className="w-6 h-px bg-accent" />
        </p>
        <h2 className="font-display text-5xl font-normal tracking-tight">
          Respondemos tudo
        </h2>
      </div>
      <FAQList items={items} />
    </section>
  )
}

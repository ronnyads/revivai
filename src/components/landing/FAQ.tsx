import { createAdminClient } from '@/lib/supabase/admin'
import FAQList from './FAQList'

const DEFAULTS = [
  { question: 'Quanto tempo leva para restaurar uma foto?', answer: 'A maioria das restaurações é concluída em 15 a 60 segundos, dependendo do nível de dano e do tipo de processamento necessário.' },
  { question: 'Quais formatos de arquivo são suportados?', answer: 'Aceitamos JPG, JPEG, PNG, TIFF e BMP. O tamanho máximo por arquivo é 50MB.' },
  { question: 'A IA consegue restaurar fotos muito danificadas?', answer: 'Sim. Nossos modelos foram treinados para lidar com rasgos, buracos, manchas severas de mofo e desbotamento extremo.' },
  { question: 'Minha foto fica salva na plataforma?', answer: 'Sim. Todas as fotos restauradas ficam salvas na sua conta para você acessar, baixar ou compartilhar quando quiser.' },
  { question: 'Como funciona o sistema de créditos?', answer: 'Cada restauração consome 1 crédito. Pacotes de créditos podem ser adquiridos via Pix ou Cartão.' },
]

export default async function FAQ() {
  let items = DEFAULTS
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.from('faqs').select('question, answer').eq('active', true).order('order')
    if (data && data.length > 0) items = data
  } catch {}

  return (
    <section id="faq" className="bg-[#0E0E0E] py-28 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center lg:text-left mb-20">
          <p className="font-label mb-6 text-[11px] text-[#54D6F6]">FAQ</p>
          <h2 className="font-display text-5xl md:text-7xl font-bold uppercase tracking-tight leading-[0.95] text-white">
            RESPONDEMOS <br /><span className="text-white/20">QUASE TUDO</span>
          </h2>
        </div>
        <FAQList items={items} />
      </div>
    </section>
  )
}

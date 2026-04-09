'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const ITEMS = [
  {
    q: 'Quanto tempo leva para restaurar uma foto?',
    a: 'A maioria das restaurações é concluída em 15 a 60 segundos, dependendo do nível de dano e do tipo de processamento necessário.',
  },
  {
    q: 'Quais formatos de arquivo são suportados?',
    a: 'Aceitamos JPG, JPEG, PNG, TIFF e BMP. O tamanho máximo por arquivo é 50MB.',
  },
  {
    q: 'A IA consegue restaurar fotos muito danificadas?',
    a: 'Sim. Nossos modelos foram treinados para lidar com rasgos, buracos, manchas severas de mofo, desbotamento extremo e partes faltando. Quanto mais informação visual restante, melhor o resultado.',
  },
  {
    q: 'O que é colorização e quando usar?',
    a: 'Colorização transforma fotos em preto e branco ou sépia em imagens coloridas e realistas. É ideal para fotos de família antigas ou registros históricos. O sistema detecta automaticamente quando a foto pode se beneficiar da colorização.',
  },
  {
    q: 'Minha foto fica salva na plataforma?',
    a: 'Sim. Todas as fotos restauradas ficam salvas na sua conta para você acessar, baixar ou compartilhar quando quiser, sem limite de tempo.',
  },
  {
    q: 'O resultado pode ficar pior que o original?',
    a: 'Não. Implementamos um sistema de controle de qualidade com IA que avalia cada restauração antes de entregar. Se o resultado não atingir o padrão mínimo, o sistema tenta automaticamente com um modelo diferente.',
  },
  {
    q: 'Posso restaurar fotos com vários rostos?',
    a: 'Sim. Nosso modelo de restauração de rostos detecta e processa múltiplos rostos na mesma foto de forma independente, mantendo a naturalidade de cada pessoa.',
  },
  {
    q: 'Como funciona o sistema de créditos?',
    a: 'Cada restauração consome 1 crédito. Colorização e upscaling 4x consomem 1 crédito adicionais cada. Você pode comprar créditos avulsos ou assinar um plano mensal com créditos inclusos.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

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

      <div className="flex flex-col divide-y divide-[#E8E8E8] border-t border-b border-[#E8E8E8]">
        {ITEMS.map((item, i) => (
          <div key={i}>
            <button
              className="w-full flex items-center justify-between gap-4 py-6 text-left group"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span className="text-base font-medium group-hover:text-accent transition-colors">{item.q}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-muted transition-transform duration-300 ${open === i ? 'rotate-180 text-accent' : ''}`}
              />
            </button>
            {open === i && (
              <p className="pb-6 text-sm text-muted leading-relaxed">{item.a}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

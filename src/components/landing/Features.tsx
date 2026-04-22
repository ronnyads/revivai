'use client'

import { ArrowRight } from 'lucide-react'

const STRUCTURE_ITEMS = [
  {
    id: '01',
    title: 'Estúdio UGC',
    description: 'Geração de conteúdo realista para redes sociais com estética humana processada por IA.',
  },
  {
    id: '02',
    title: 'Provedor Virtual',
    description: 'Ambientes e cenários ultra-detalhados para campanhas que desafiam a física e a geografia.',
  },
  {
    id: '03',
    title: 'Campanhas Generativas',
    description: 'Sistemas autônomos de criação de ativos visuais em massa para performance escalável.',
  },
]

const PORTRAIT_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBzbh-2si6l4m2hd2IlsT5HiXwV7rVquQJQb-A6jdl1vRKcYXNG3oohzWX4Oh__z53Ral7zgSexR3vyxb238SXs4MRJV7C9ijm_091l8Cmq47B1oBbOQlxFLfyxyj5VSxOJT7ss6cWxGD3cNft6sAZSvw5fzY5373ALrE3bDYVj7mgYfJKZv6treFqo8JLH4-hm1IJTtQwDH6J_x5tshZUEo8rvW61C5H9Bh1cTaTaCCdBhh1MVT8lQOLdJ39Xk-upEZKIImLbjuW5l'

export default function Features() {
  return (
    <section id="estrutura" className="py-28 tonal-layer-2">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-14 px-6 md:grid-cols-2 md:px-8">
        <div className="space-y-10">
          <h2 className="font-display text-5xl font-bold uppercase leading-none tracking-tight text-white md:text-6xl">
            Estrutura
            <br />
            <span className="italic text-[#54D6F6]">RevivAI</span>
          </h2>

          <div className="space-y-7">
            {STRUCTURE_ITEMS.map((item) => (
              <div key={item.id} className="group border-b border-white/6 pb-7">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-label text-[11px] text-[#54D6F6]">{item.id}</span>
                  <ArrowRight size={16} className="text-white/25 transition-colors group-hover:text-[#54D6F6]" />
                </div>
                <h3 className="font-display text-2xl font-bold uppercase text-white">{item.title}</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/45">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute -top-8 -right-4 h-32 w-32 border-t border-r border-[#54D6F6]/20" />
          <img src={PORTRAIT_IMAGE} alt="Retrato editorial RevivAI" className="aspect-[3/4] w-full object-cover grayscale transition-all duration-700 hover:grayscale-0" />
          <div className="obsidian-chip absolute bottom-5 left-0 hidden translate-x-[-14%] p-5 lg:block">
            <span className="font-label block text-[10px] text-white/35">Código de status</span>
            <span className="font-label mt-2 block text-[11px] text-[#54D6F6]">Fluxo criptografado ativo</span>
          </div>
        </div>
      </div>
    </section>
  )
}

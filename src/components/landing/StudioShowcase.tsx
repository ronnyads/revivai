'use client'

import Image from 'next/image'

const UGC_MODEL_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBzbh-2si6l4m2hd2IlsT5HiXwV7rVquQJQb-A6jdl1vRKcYXNG3oohzWX4Oh__z53Ral7zgSexR3vyxb238SXs4MRJV7C9ijm_091l8Cmq47B1oBbOQlxFLfyxyj5VSxOJT7ss6cWxGD3cNft6sAZSvw5fzY5373ALrE3bDYVj7mgYfJKZv6treFqo8JLH4-hm1IJTtQwDH6J_x5tshZUEo8rvW61C5H9Bh1cTaTaCCdBhh1MVT8lQOLdJ39Xk-upEZKIImLbjuW5l'

const SHOWCASE_ITEMS = [
  {
    id: '01 / Branding',
    title: 'Metallic Pulse',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC30azfUzGKcew13JhZoAebtN7nBAxvHt6mNjh2-ndbJsNwOUkJfHPhgT_CA8RQLXFbUptsu_K1Yc2ZF8D_9-oqA9_5xzqGglGCi0o1AZZFgHd4h3cQC36Kg3MgQ-gAQmLKgtkYIrxCKQhJdzUYhl7OAG0ssetls_PyA2gVWmNfRPoeD_qNGGO3RNvbeOH89osMp96_g2tfZEsr8S_FJZsHgx1fBBypDFwpj-n4N4NyqMQFD36Reb2w9wBTlODtZH5TvmUlkz5sIFJL',
    className: 'md:col-span-7 aspect-[4/3]',
  },
  {
    id: '02 / Conteudo',
    title: 'Modelo UGC',
    image: UGC_MODEL_IMAGE,
    className: 'md:col-span-5 aspect-square md:mt-20',
  },
  {
    id: '03 / Ambiente',
    title: 'Provedor Virtual',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB8BnC7_z3qS3tDlNnKDpa4wSkT0AZwlSFNm7LaFc8OYIfl_UEp_D6esH5qdqo8-blRYVHihQVTvtrtj5fnQ7uMByA_35eGXT1QNhvdiDXfXS140g2POxb5XXnBNyQvNoh1rC9xLQqgc_Qhw17_HsieyuQngQGdatEMfsj-lQ5ej2zQL3KaTHdgp8KSk0_ZLBpK_OnSGfKUCok89V5z15Mt0UCzdm4oMI6sKKyNYjgLKuYR0ZLKQ3lLDWZyQuenKrlMAgXOIJCgNK4a',
    className: 'md:col-span-5 aspect-square',
  },
  {
    id: '04 / Arquitetura',
    title: 'Sonhos Brutalistas',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAlg7AzJs86iBKI3tDUSb3IzuSDl_Mwx3sBsRvD5CE03LOXf1PYU-ySZ8DP9rDhYXIxbX0pcpzyFWDZmX0ytN-srVZq8eI87ti4LaSQBV73cDFu1YplhK2kGiwh3M5YQ86fbTs3x8zEB0SRATN8ip-3-SZtbEhPWZkjNmrYXuUiwpknIWaEiX1tvhd73XcTmihaLJL-mPYdmkr6Udgjvpwoh3VPv9fw4-NKcX8LaKpK6oY0O8El8eVeixweLz4LMXrPLSQakIQzvoaD',
    className: 'md:col-span-7 aspect-[16/9] md:-mt-10',
  },
]

export default function StudioShowcase() {
  return (
    <section id="recursos" className="py-28 tonal-layer-0">
      <div className="mx-auto mb-12 max-w-[1440px] px-6 md:px-8">
        <h2 className="font-display text-4xl font-bold uppercase tracking-tight text-white md:text-5xl">
          Trabalhos Recentes
        </h2>
      </div>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-6 md:grid-cols-12 md:px-8">
        {SHOWCASE_ITEMS.map((item) => (
          <article key={item.title} className={`group relative overflow-hidden rounded-sm ${item.className}`}>
            <Image
              src={item.image}
              alt={item.title}
              fill
              quality={66}
              sizes="(max-width: 768px) 100vw, 58vw"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_34%,rgba(14,14,14,0.82)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
              <p className="font-label mb-2 text-[11px] text-[#54D6F6]">{item.id}</p>
              <h3 className="font-display text-3xl font-bold uppercase italic tracking-tight text-white">{item.title}</h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

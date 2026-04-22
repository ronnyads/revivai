import Link from 'next/link'

const FOOTER_COLUMNS = [
  {
    title: 'Navegação',
    items: [
      ['Arquitetura', '#estrutura'],
      ['Cases', '#recursos'],
      ['Laboratório', '/dashboard/studio'],
    ],
  },
  {
    title: 'Sistema',
    items: [
      ['Privacidade', '#'],
      ['Status da API', '/dashboard/studio'],
      ['Acesso ao terminal', '/dashboard'],
    ],
  },
  {
    title: 'Conectar',
    items: [
      ['Estúdio', '/dashboard/studio'],
      ['Login', '/auth/login'],
      ['Planos', '/#pricing'],
    ],
  },
] as const

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#080808] px-6 py-16 md:px-8">
      <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-5">
          <Link href="/" className="font-display text-2xl font-bold tracking-[-0.05em] text-white">
            RevivAI
          </Link>
          <p className="max-w-sm text-sm leading-relaxed text-white/34">
            Plataforma premium de restauração e produção visual com IA para marcas, acervos e operações criativas.
          </p>
          <div className="obsidian-chip inline-flex items-center gap-3 rounded-full px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-[#54D6F6] shadow-[0_0_12px_rgba(84,214,246,0.8)]" />
            <span className="font-label text-[10px] text-white/55">Sistema ativo</span>
          </div>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="font-label mb-5 text-[11px] text-[#54D6F6]">{column.title}</p>
            <div className="space-y-3">
              {column.items.map(([label, href]) => (
                <Link key={label} href={href} className="block text-sm text-white/38 transition-colors hover:text-white">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </footer>
  )
}

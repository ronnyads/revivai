import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-[#E8E8E8] px-8 md:px-12 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
      <Link href="/" className="font-display text-xl font-semibold">
        reviv<span className="text-accent">.</span>ai
      </Link>
      <p className="text-sm text-muted">© 2025 reviv.ai · Todos os direitos reservados</p>
      <div className="flex gap-6">
        {[['Privacidade','#'],['Termos','#'],['Suporte','#']].map(([label, href]) => (
          <Link key={label} href={href} className="text-sm text-muted hover:text-ink transition-colors">{label}</Link>
        ))}
      </div>
    </footer>
  )
}

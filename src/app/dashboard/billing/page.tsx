import Pricing from '@/components/landing/Pricing'

export const dynamic = 'force-dynamic'

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Page Header */}
      <div className="bg-[#0F172A] border-b border-white/5 px-8 md:px-12 py-12 mb-10">
        <div className="max-w-7xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4FF00] mb-3">REVIVAI — PLANOS</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-display uppercase">Investimento <span className="text-white/20">Honesto</span></h1>
          <p className="text-sm text-white/50 mt-4 max-w-xl font-sans leading-relaxed">
            Sem contratos. Escolha o pacote de créditos que melhor se adapta ao seu volume. Faça upgrade, downgrade ou cancele a qualquer momento.
          </p>
        </div>
      </div>

      {/* Pricing Module imported directly from our Dark Theme landing! */}
      {/* We reuse the global component to guarantee it's always the same pricing logic */}
      <div className="-mt-16 bg-transparent">
        <Pricing />
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Check, ShieldCheck, Loader2, Copy, CheckCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fbq } from '@/components/MetaPixel'

const PLANS_META: Record<string, { period: string; features: string[] }> = {
  perPhoto:     { period: 'por foto',    features: ['1 foto restaurada', 'Download em alta resolução', 'Resultado em segundos', 'PIX, cartão ou boleto'] },
  subscription: { period: 'por mês',    features: ['10 fotos por mês', 'Histórico completo', 'Download em 4K', 'Suporte prioritário'] },
  package:      { period: '10 créditos', features: ['10 créditos permanentes', 'Sem expiração', 'Download em alta resolução', 'Histórico salvo'] },
  starter:      { period: '600 créditos', features: ['500 créditos + 100 bônus', 'Gera imagens, vídeos e áudios', 'Sem expiração', 'PIX, cartão ou boleto'] },
  popular:      { period: '1.100 créditos', features: ['1.000 créditos + 100 bônus', 'Gera imagens, vídeos e áudios', 'Sem expiração', 'PIX, cartão ou boleto'] },
  pro:          { period: '2.100 créditos', features: ['2.000 créditos + 100 bônus', 'Gera imagens, vídeos e áudios', 'Sem expiração', 'PIX, cartão ou boleto'] },
  agency:       { period: '5.100 créditos', features: ['5.000 créditos + 100 bônus', 'Gera imagens, vídeos e áudios', 'Suporte exclusivo no WhatsApp', 'PIX, cartão ou boleto'] },
}
type PlanId = keyof typeof PLANS_META

function formatCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
         .replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3')
         .replace(/(\d{3})(\d{3})/, '$1.$2')
}
function formatCard(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim()
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4)
  return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d
}

function CheckoutForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const planId = (searchParams.get('plan') as PlanId) || 'perPhoto'
  const meta = PLANS_META[planId] || PLANS_META['perPhoto']

  const [planData, setPlanData]   = useState<{ name: string; price: number } | null>(null)
  const [pixDiscount, setPixDiscount] = useState(5)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [tab, setTab]             = useState<'pix' | 'card'>('pix')
  const [email, setEmail]         = useState('')
  const [cpf, setCpf]             = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardName, setCardName]   = useState('')
  const [expiry, setExpiry]       = useState('')
  const [cvv, setCvv]             = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  // PIX state
  const [pix, setPix] = useState<{ qrCode: string; qrCodeBase64: string; paymentId: number } | null>(null)
  const [copied, setCopied]       = useState(false)
  const [polling, setPolling]     = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setUserEmail(data.user.email)
        setEmail(data.user.email)
      }
    })
    // Buscar preços e configurações do DB
    fetch('/api/plans').then(r => r.json()).then(data => {
      const p = data[planId]
      if (p) setPlanData({ name: p.name, price: p.price })
    }).catch(() => {})
    fetch('/api/settings').then(r => r.json()).then(data => {
      const d = parseFloat(data['pix_discount'])
      if (!isNaN(d)) setPixDiscount(d)
    }).catch(() => {})
  }, [planId])

  // Poll PIX status
  useEffect(() => {
    if (!pix || !polling) return
    const interval = setInterval(async () => {
      const res = await fetch(`/api/checkout/status?id=${pix.paymentId}`)
      const data = await res.json()
      if (data.status === 'approved') {
        clearInterval(interval)
        setPolling(false)
        fbq('track', 'Purchase', { value: planData?.price, currency: 'BRL', content_ids: [planId], content_type: 'product' })
        if (data.dashboardLink) window.location.href = data.dashboardLink
        else router.push(`/dashboard?success=1&plan=${planId}`)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [pix, polling])

  const copyPix = () => {
    navigator.clipboard.writeText(pix!.qrCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    fbq('track', 'AddPaymentInfo', { value: planData?.price, currency: 'BRL', payment_type: tab })

    try {
      if (tab === 'pix') {
        const res = await fetch('/api/checkout/pix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId, email, cpf: cpf.replace(/\D/g, '') }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) throw new Error(data.error || 'Erro ao gerar PIX')
        setPix({ qrCode: data.qrCode, qrCodeBase64: data.qrCodeBase64, paymentId: data.paymentId })
        setPolling(true)
      } else {
        // Tokenizar cartão diretamente via API do MP (sem SDK)
        const [month, year] = expiry.split('/')
        if (!month || !year || year.length !== 2) throw new Error('Validade inválida. Use MM/AA.')
        const cleanCard = cardNumber.replace(/\D/g, '')
        if (cleanCard.length < 13) throw new Error('Número do cartão inválido.')

        const tokenRes = await fetch(
          `https://api.mercadopago.com/v1/card_tokens?public_key=${process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              card_number: cleanCard,
              security_code: cvv,
              expiration_month: parseInt(month, 10),
              expiration_year: parseInt(`20${year}`, 10),
              cardholder: {
                name: cardName,
                identification: { type: 'CPF', number: cpf.replace(/\D/g, '') },
              },
            }),
          }
        )
        const tokenData = await tokenRes.json()
        if (!tokenData.id) throw new Error('Dados do cartão recusados pela operadora.')

        // Detectar bandeira
        const first = cleanCard[0]
        const brand = first === '5' || first === '2' ? 'master' : first === '3' ? 'amex' : first === '6' ? 'elo' : 'visa'

        const res = await fetch('/api/checkout/card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId, email, cpf: cpf.replace(/\D/g, ''), token: tokenData.id, brand, name: cardName }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) throw new Error(data.error || 'Pagamento recusado')

        fbq('track', 'Purchase', { value: planData?.price, currency: 'BRL', content_ids: [planId], content_type: 'product' })
        if (data.dashboardLink) window.location.href = data.dashboardLink
        else router.push(`/dashboard?success=1&plan=${planId}`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!meta) return null

  // Tela do PIX gerado
  if (pix) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-6 py-12">
        <div className="bg-white rounded-2xl border border-[#E8E8E8] p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D94F2E" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 className="font-display text-2xl mb-2">PIX gerado!</h2>
          <p className="text-sm text-muted mb-6">Escaneie o QR code ou copie o código. Após o pagamento você será redirecionado automaticamente.</p>

          {pix.qrCodeBase64 && (
            <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code PIX" className="w-48 h-48 mx-auto mb-4 rounded-lg" />
          )}

          <button onClick={copyPix} className="w-full flex items-center justify-center gap-2 border border-[#E8E8E8] rounded-xl py-3 text-sm font-medium mb-4 hover:border-accent transition-colors">
            {copied ? <><CheckCheck size={16} className="text-green-500" /> Copiado!</> : <><Copy size={16} /> Copiar código PIX</>}
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-muted">
            <Loader2 size={12} className="animate-spin" />
            Aguardando pagamento...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white border-b border-[#E8E8E8] px-6 py-4">
        <a href="/" className="font-display text-xl font-normal tracking-tight">reviv<span className="text-accent">.</span>ai</a>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-[1fr_1.3fr] gap-8 items-start">

          {/* Resumo */}
          <div className="bg-white rounded-2xl border border-[#E8E8E8] p-8">
            <p className="text-xs font-medium tracking-widest uppercase text-muted mb-6">Resumo do pedido</p>
            <h2 className="font-display text-3xl font-normal tracking-tight mb-1">{planData?.name ?? '...'}</h2>
            <p className="text-xs text-muted mb-6">{meta.period}</p>
            <ul className="flex flex-col gap-3 mb-6">
              {meta.features.map(f => (
                <li key={f} className="flex items-center gap-3 text-sm">
                  <span className="w-4 h-4 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0"><Check size={10} className="text-accent" /></span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="border-t border-[#E8E8E8] pt-6 flex justify-between items-end">
              <span className="text-sm text-muted">Total</span>
              <span className="font-display text-4xl">{planData ? `R$${planData.price.toFixed(2).replace('.', ',')}` : '...'}</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted">
              <ShieldCheck size={14} className="text-accent flex-shrink-0" />
              Pagamento seguro via Mercado Pago
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E8E8E8] p-8 flex flex-col gap-5">
            <p className="text-xs font-medium tracking-widest uppercase text-muted">Dados do pagamento</p>

            {/* Email */}
            {userEmail ? (
              <div className="bg-surface rounded-xl px-4 py-3 text-sm text-muted flex items-center gap-2">
                <Check size={14} className="text-accent flex-shrink-0" />
                Logado como <strong className="text-ink">{userEmail}</strong>
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-muted mb-1.5 block uppercase tracking-wide">E-mail</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                  className="w-full px-4 py-3 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-accent transition-colors" />
                <p className="text-xs text-muted mt-1">Usaremos para criar seu acesso após o pagamento.</p>
              </div>
            )}

            {/* CPF */}
            <div>
              <label className="text-xs font-medium text-muted mb-1.5 block uppercase tracking-wide">CPF</label>
              <input type="text" required value={cpf} onChange={e => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00"
                className="w-full px-4 py-3 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-accent transition-colors" />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-surface rounded-lg p-1">
              {(['pix', 'card'] as const).map(t => (
                <button key={t} type="button" onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${tab === t ? 'bg-white shadow-sm text-ink' : 'text-muted'}`}>
                  {t === 'pix' ? `🔑 PIX (${pixDiscount}% off)` : '💳 Cartão'}
                </button>
              ))}
            </div>

            {/* PIX info */}
            {tab === 'pix' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
                Pague via PIX e ganhe <strong>{pixDiscount}% de desconto</strong>. O QR code será gerado após confirmar.
              </div>
            )}

            {/* Card fields */}
            {tab === 'card' && (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium text-muted mb-1.5 block uppercase tracking-wide">Nome no cartão</label>
                  <input type="text" required value={cardName} onChange={e => setCardName(e.target.value.toUpperCase())} placeholder="NOME COMO NO CARTÃO"
                    className="w-full px-4 py-3 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-accent transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted mb-1.5 block uppercase tracking-wide">Número do cartão</label>
                  <input type="text" required value={cardNumber} onChange={e => setCardNumber(formatCard(e.target.value))} placeholder="0000 0000 0000 0000"
                    className="w-full px-4 py-3 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-accent transition-colors font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted mb-1.5 block uppercase tracking-wide">Validade</label>
                    <input type="text" required value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))} placeholder="MM/AA"
                      className="w-full px-4 py-3 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-accent transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted mb-1.5 block uppercase tracking-wide">CVV</label>
                    <input type="text" required value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123"
                      className="w-full px-4 py-3 rounded-lg border border-[#E8E8E8] text-sm focus:outline-none focus:border-accent transition-colors" />
                  </div>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full py-4 rounded-xl bg-accent text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Aguarde...</> : tab === 'pix' ? 'Gerar código PIX →' : 'Pagar com cartão →'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default function CheckoutPage() {
  return <Suspense><CheckoutForm /></Suspense>
}

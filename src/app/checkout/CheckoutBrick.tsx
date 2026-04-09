'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

declare global {
  interface Window {
    MercadoPago: any
  }
}

interface Props {
  planId: string
  publicKey: string
  amount: number
  userEmail?: string
}

export default function CheckoutBrick({ planId, publicKey, amount, userEmail }: Props) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const brickRef = useRef<any>(null)

  useEffect(() => {
    let mounted = true

    function initBrick() {
      if (!window.MercadoPago || !mounted) return

      const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' })
      const bricks = mp.bricks()

      const settings = {
        initialization: {
          amount,
          payer: userEmail ? { email: userEmail } : undefined,
        },
        customization: {
          paymentMethods: {
            creditCard: 'all',
            debitCard: 'all',
            ticket: 'all',      // boleto
            bankTransfer: 'all', // PIX
            mercadoPago: 'all',
          },
          visual: {
            style: {
              theme: 'default',
              customVariables: {
                baseColor: '#E85C2E',
                baseColorSecondVariant: '#C44A1F',
                borderRadiusLarge: '12px',
              },
            },
          },
        },
        callbacks: {
          onReady: () => { if (mounted) setStatus('ready') },
          onError: (err: any) => {
            console.error('[brick] error:', err)
            if (mounted) { setStatus('error'); setErrorMsg('Erro ao carregar o formulário de pagamento.') }
          },
          onSubmit: async ({ selectedPaymentMethod, formData }: any) => {
            if (!mounted) return
            setStatus('processing')
            try {
              const res = await fetch('/api/checkout/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formData, planId }),
              })
              const data = await res.json()

              if (!res.ok) throw new Error(data.error ?? 'Erro no pagamento')

              if (data.status === 'approved') {
                router.push(`/dashboard?success=1&plan=${planId}`)
              } else if (data.status === 'pending' || data.status === 'in_process') {
                router.push(`/dashboard?pending=1`)
              } else {
                throw new Error(`Pagamento ${data.status}. Tente novamente.`)
              }
            } catch (err: any) {
              setStatus('error')
              setErrorMsg(err.message)
            }
          },
        },
      }

      bricks.create('payment', '#payment-brick-container', settings)
        .then((b: any) => { brickRef.current = b })
        .catch((err: any) => {
          console.error('[brick] create error:', err)
          if (mounted) { setStatus('error'); setErrorMsg('Não foi possível carregar o checkout.') }
        })
    }

    // Load MP SDK
    if (window.MercadoPago) {
      initBrick()
    } else {
      const script = document.createElement('script')
      script.src = 'https://sdk.mercadopago.com/v2/mercadopago.js'
      script.onload = initBrick
      script.onerror = () => { if (mounted) { setStatus('error'); setErrorMsg('Erro ao carregar SDK do Mercado Pago.') } }
      document.head.appendChild(script)
    }

    return () => {
      mounted = false
      brickRef.current?.unmount?.()
    }
  }, [planId, publicKey, amount, userEmail])

  return (
    <div className="relative">
      {status === 'loading' && (
        <div className="flex items-center justify-center gap-3 py-16 text-muted text-sm">
          <Loader2 size={18} className="animate-spin text-accent" />
          Carregando formulário de pagamento...
        </div>
      )}

      {status === 'processing' && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={28} className="animate-spin text-accent" />
            <p className="text-sm font-medium text-ink">Processando pagamento...</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600 mb-4">{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <div id="payment-brick-container" />
    </div>
  )
}

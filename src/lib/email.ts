import { Resend } from 'resend'
import { createElement } from 'react'
import PurchaseEmail from '@/emails/PurchaseEmail'
import RefundEmail from '@/emails/RefundEmail'
import AbandonedCartEmail from '@/emails/AbandonedCartEmail'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'RevivAI <noreply@adsliberty.com>'

export async function sendPurchaseEmail(opts: {
  email: string
  name: string
  planName: string
  credits: number
  password: string
  loginUrl: string
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.email,
    subject: `Sua conta RevivAI está pronta — Plano ${opts.planName}`,
    react: createElement(PurchaseEmail, opts),
  })
}

export async function sendRefundEmail(opts: {
  email: string
  name: string
  planName: string
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.email,
    subject: `Reembolso do plano ${opts.planName} processado — RevivAI`,
    react: createElement(RefundEmail, opts),
  })
}

export async function sendAbandonedCartEmail(opts: {
  email: string
  name: string
  planName: string
  credits: number
  price: number
  checkoutUrl: string
}) {
  return resend.emails.send({
    from: FROM,
    to: opts.email,
    subject: `Você esqueceu ${opts.credits.toLocaleString('pt-BR')} créditos no carrinho 👀`,
    react: createElement(AbandonedCartEmail, opts),
  })
}

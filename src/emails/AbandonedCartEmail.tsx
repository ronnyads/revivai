import {
  Body, Button, Container, Head, Hr, Html,
  Preview, Section, Text,
} from '@react-email/components'

interface AbandonedCartEmailProps {
  name: string
  email: string
  planName: string
  credits: number
  price: number
  checkoutUrl: string
}

export default function AbandonedCartEmail({ name, email, planName, credits, price, checkoutUrl }: AbandonedCartEmailProps) {
  const firstName = name?.split(' ')[0] ?? 'criador'
  const discountedPrice = Math.floor(price * 0.8)

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Voce deixou {credits.toLocaleString('pt-BR')} creditos no carrinho.</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* Top bar blue */}
          <div style={{ height: 3, background: 'linear-gradient(90deg, #3b82f6, #6366f1)', borderRadius: '4px 4px 0 0' }} />

          <Section style={header}>
            <Text style={wordmark}>reviv<span style={{ color: '#3b82f6' }}>.ai</span></Text>
          </Section>

          <Hr style={divider} />

          <Section style={content}>
            <Text style={greeting}>Ola, {firstName}.</Text>
            <Text style={headline}>Voce deixou algo para tras.</Text>
            <Text style={body_text}>
              O plano <strong style={{ color: '#ffffff' }}>{planName}</strong> com {credits.toLocaleString('pt-BR')} creditos estava no seu carrinho. Ainda esta disponivel.
            </Text>

            {/* Cart block */}
            <div style={cartBlock}>
              <div style={cartTop}>
                <Text style={cartPlanLabel}>{planName.toUpperCase()}</Text>
                <Text style={cartCredits}>{credits.toLocaleString('pt-BR')} creditos</Text>
              </div>
              <Hr style={innerDivider} />
              <div style={cartPriceRow}>
                <Text style={cartPriceOriginal}>R$ {price},00</Text>
                <Text style={cartPriceDiscount}>R$ {discountedPrice},00 com cupom</Text>
              </div>
            </div>

            {/* Coupon */}
            <div style={couponBlock}>
              <Text style={couponPre}>CUPOM DE DESCONTO</Text>
              <Text style={couponCode}>RevivAI</Text>
              <Text style={couponDesc}>20% de desconto — aplicar no checkout</Text>
            </div>

            <Button href={checkoutUrl} style={ctaButton}>
              Finalizar compra com desconto
            </Button>

            <Text style={expiry}>
              Este cupom e valido por tempo limitado.
            </Text>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              E-mail enviado para {email} pois voce iniciou um checkout em revivads.com.
            </Text>
            <Text style={footerMeta}>RevivAI — Geracao de conteudo com inteligencia artificial</Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

const body: React.CSSProperties = {
  backgroundColor: '#050505',
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: 0,
  padding: '40px 16px',
}
const container: React.CSSProperties = {
  maxWidth: 520,
  margin: '0 auto',
  backgroundColor: '#0f0f0f',
  borderRadius: 8,
  border: '1px solid #1f1f1f',
  overflow: 'hidden',
}
const header: React.CSSProperties = { padding: '28px 36px 20px' }
const wordmark: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: '#ffffff',
  letterSpacing: '-0.5px',
  margin: 0,
}
const divider: React.CSSProperties = { borderColor: '#1f1f1f', margin: 0 }
const content: React.CSSProperties = { padding: '32px 36px' }
const greeting: React.CSSProperties = { color: '#71717a', fontSize: 13, margin: '0 0 4px' }
const headline: React.CSSProperties = {
  color: '#ffffff',
  fontSize: 26,
  fontWeight: 700,
  letterSpacing: '-0.5px',
  margin: '0 0 16px',
  lineHeight: 1.2,
}
const body_text: React.CSSProperties = {
  color: '#a1a1aa',
  fontSize: 14,
  lineHeight: 1.6,
  margin: '0 0 24px',
}
const cartBlock: React.CSSProperties = {
  backgroundColor: '#141414',
  border: '1px solid #1f1f1f',
  borderRadius: 6,
  marginBottom: 4,
  overflow: 'hidden',
}
const cartTop: React.CSSProperties = { padding: '20px 20px 16px' }
const cartPlanLabel: React.CSSProperties = {
  color: '#3f3f46',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 2,
  margin: '0 0 6px',
  fontFamily: '"Courier New", monospace',
}
const cartCredits: React.CSSProperties = {
  color: '#ffffff',
  fontSize: 32,
  fontWeight: 800,
  letterSpacing: '-1px',
  margin: 0,
  fontFamily: '"Courier New", monospace',
}
const innerDivider: React.CSSProperties = { borderColor: '#1f1f1f', margin: 0 }
const cartPriceRow: React.CSSProperties = { padding: '14px 20px', display: 'flex', gap: 12, alignItems: 'center' }
const cartPriceOriginal: React.CSSProperties = {
  color: '#3f3f46',
  fontSize: 13,
  textDecoration: 'line-through',
  margin: 0,
}
const cartPriceDiscount: React.CSSProperties = {
  color: '#22c55e',
  fontSize: 14,
  fontWeight: 700,
  margin: 0,
}
const couponBlock: React.CSSProperties = {
  backgroundColor: '#0a0a0a',
  border: '1px solid #1f1f1f',
  borderRadius: 6,
  padding: '16px 20px',
  marginBottom: 24,
  marginTop: 4,
}
const couponPre: React.CSSProperties = {
  color: '#3f3f46',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 2,
  textTransform: 'uppercase',
  margin: '0 0 4px',
  fontFamily: '"Courier New", monospace',
}
const couponCode: React.CSSProperties = {
  color: '#f59e0b',
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: 4,
  margin: '0 0 2px',
  fontFamily: '"Courier New", monospace',
}
const couponDesc: React.CSSProperties = {
  color: '#52525b',
  fontSize: 11,
  margin: 0,
}
const ctaButton: React.CSSProperties = {
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  fontSize: 13,
  fontWeight: 700,
  padding: '12px 24px',
  borderRadius: 6,
  textDecoration: 'none',
  display: 'inline-block',
  letterSpacing: '0.2px',
}
const expiry: React.CSSProperties = {
  color: '#3f3f46',
  fontSize: 11,
  margin: '12px 0 0',
}
const footer: React.CSSProperties = { padding: '20px 36px 24px' }
const footerText: React.CSSProperties = {
  color: '#3f3f46',
  fontSize: 11,
  margin: '0 0 4px',
  lineHeight: 1.6,
}
const footerMeta: React.CSSProperties = {
  color: '#27272a',
  fontSize: 10,
  letterSpacing: 1,
  textTransform: 'uppercase',
  margin: 0,
}

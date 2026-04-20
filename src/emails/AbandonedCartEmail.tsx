import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Link, Preview, Section, Text,
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
      <Preview>Você esqueceu {credits.toLocaleString('pt-BR')} créditos no carrinho 👀</Preview>
      <Body style={body}>
        <Container style={container}>

          <Section style={{ textAlign: 'center', padding: '32px 0 16px' }}>
            <Text style={logo}>reviv.ai</Text>
          </Section>

          <Heading style={h1}>Ei, {firstName}! Seus créditos estão esperando 👀</Heading>
          <Text style={subtitle}>Você começou a adquirir o plano <strong style={{ color: '#fff' }}>{planName}</strong> mas não finalizou. Seus créditos ainda estão reservados.</Text>

          {/* Cart summary */}
          <Section style={cartBox}>
            <Text style={cartPlan}>{planName}</Text>
            <Text style={cartCredits}>{credits.toLocaleString('pt-BR')} créditos</Text>
            <Text style={cartPriceOld}>De R$ {price},00</Text>
            <Text style={cartPriceNew}>Por R$ {discountedPrice},00</Text>
          </Section>

          {/* Coupon */}
          <Section style={couponBox}>
            <Text style={couponLabel}>USE O CUPOM</Text>
            <Text style={couponCode}>REVIVAI</Text>
            <Text style={couponDiscount}>e ganhe 20% de desconto</Text>
          </Section>

          <Section style={{ textAlign: 'center', margin: '24px 0 8px' }}>
            <Button href={checkoutUrl} style={ctaButton}>
              Finalizar compra com desconto →
            </Button>
          </Section>

          <Text style={urgency}>⏰ Este cupom expira em 48 horas</Text>

          <Hr style={divider} />
          <Text style={footer}>
            Enviado para <Link href={`mailto:${email}`} style={{ color: '#71717a' }}>{email}</Link>. Se não quer receber esses e-mails,{' '}
            <Link href="#" style={{ color: '#71717a' }}>descadastre-se</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const body: React.CSSProperties = {
  backgroundColor: '#09090b',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}
const container: React.CSSProperties = {
  maxWidth: 480,
  margin: '0 auto',
  backgroundColor: '#18181b',
  borderRadius: 16,
  border: '1px solid #27272a',
}
const logo: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  color: '#ffffff',
  letterSpacing: '-1px',
  margin: 0,
}
const h1: React.CSSProperties = {
  color: '#ffffff',
  fontSize: 22,
  fontWeight: 800,
  textAlign: 'center',
  margin: '0 24px 8px',
}
const subtitle: React.CSSProperties = {
  color: '#71717a',
  fontSize: 14,
  textAlign: 'center',
  margin: '0 24px 24px',
}
const cartBox: React.CSSProperties = {
  margin: '0 24px',
  padding: '20px',
  backgroundColor: '#09090b',
  borderRadius: 12,
  border: '1px solid #27272a',
  textAlign: 'center',
}
const cartPlan: React.CSSProperties = {
  color: '#a1a1aa',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 2,
  margin: '0 0 4px',
}
const cartCredits: React.CSSProperties = {
  color: '#ffffff',
  fontSize: 28,
  fontWeight: 900,
  margin: '0 0 8px',
}
const cartPriceOld: React.CSSProperties = {
  color: '#52525b',
  fontSize: 13,
  textDecoration: 'line-through',
  margin: 0,
}
const cartPriceNew: React.CSSProperties = {
  color: '#10b981',
  fontSize: 22,
  fontWeight: 800,
  margin: '2px 0 0',
}
const couponBox: React.CSSProperties = {
  margin: '16px 24px 0',
  padding: '16px',
  backgroundColor: '#1c1917',
  borderRadius: 10,
  border: '1px dashed #f59e0b',
  textAlign: 'center',
}
const couponLabel: React.CSSProperties = {
  color: '#78716c',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 2,
  margin: '0 0 4px',
}
const couponCode: React.CSSProperties = {
  color: '#f59e0b',
  fontSize: 28,
  fontWeight: 900,
  fontFamily: 'monospace',
  letterSpacing: 4,
  margin: 0,
}
const couponDiscount: React.CSSProperties = {
  color: '#a8a29e',
  fontSize: 12,
  margin: '4px 0 0',
}
const ctaButton: React.CSSProperties = {
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  fontSize: 15,
  fontWeight: 700,
  padding: '14px 32px',
  borderRadius: 12,
  textDecoration: 'none',
}
const urgency: React.CSSProperties = {
  color: '#71717a',
  fontSize: 12,
  textAlign: 'center',
  margin: '8px 0 24px',
}
const divider: React.CSSProperties = { borderColor: '#27272a', margin: '0 24px' }
const footer: React.CSSProperties = {
  color: '#52525b',
  fontSize: 11,
  textAlign: 'center',
  margin: '12px 24px 24px',
  lineHeight: 1.6,
}

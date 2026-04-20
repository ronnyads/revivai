import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Link, Preview, Section, Text,
} from '@react-email/components'

interface RefundEmailProps {
  name: string
  email: string
  planName: string
}

export default function RefundEmail({ name, email, planName }: RefundEmailProps) {
  const firstName = name?.split(' ')[0] ?? 'cliente'

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Seu reembolso do plano {planName} foi processado</Preview>
      <Body style={body}>
        <Container style={container}>

          <Section style={{ textAlign: 'center', padding: '32px 0 16px' }}>
            <Text style={logo}>reviv.ai</Text>
          </Section>

          <Heading style={h1}>Reembolso confirmado</Heading>
          <Text style={subtitle}>Olá, {firstName}. Seu pedido de reembolso do plano <strong style={{ color: '#fff' }}>{planName}</strong> foi processado com sucesso.</Text>

          <Section style={infoBox}>
            <Text style={infoRow}><span style={infoLabel}>Plano</span><span style={infoValue}>{planName}</span></Text>
            <Hr style={innerDivider} />
            <Text style={infoRow}><span style={infoLabel}>Status</span><span style={{ ...infoValue, color: '#10b981' }}>Reembolsado</span></Text>
            <Hr style={innerDivider} />
            <Text style={infoRow}><span style={infoLabel}>Prazo de estorno</span><span style={infoValue}>5–7 dias úteis</span></Text>
          </Section>

          <Text style={note}>O valor será estornado no método de pagamento utilizado. Em caso de dúvidas, entre em contato pelo nosso suporte.</Text>

          <Section style={{ textAlign: 'center', margin: '24px 0 32px' }}>
            <Button href="https://wa.me/5511999999999" style={ctaButton}>
              Falar com suporte →
            </Button>
          </Section>

          <Hr style={divider} />
          <Text style={footer}>
            E-mail enviado para <Link href={`mailto:${email}`} style={{ color: '#71717a' }}>{email}</Link>
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
  fontSize: 24,
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
const infoBox: React.CSSProperties = {
  margin: '0 24px',
  backgroundColor: '#09090b',
  borderRadius: 12,
  border: '1px solid #27272a',
  padding: '0 16px',
}
const infoRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 13,
  margin: '12px 0',
}
const infoLabel: React.CSSProperties = { color: '#71717a' }
const infoValue: React.CSSProperties = { color: '#e4e4e7', fontWeight: 600 }
const innerDivider: React.CSSProperties = { borderColor: '#27272a', margin: 0 }
const note: React.CSSProperties = {
  color: '#52525b',
  fontSize: 12,
  textAlign: 'center',
  margin: '16px 24px 0',
}
const ctaButton: React.CSSProperties = {
  backgroundColor: '#27272a',
  color: '#e4e4e7',
  fontSize: 14,
  fontWeight: 600,
  padding: '12px 28px',
  borderRadius: 10,
  textDecoration: 'none',
}
const divider: React.CSSProperties = { borderColor: '#27272a', margin: '0 24px' }
const footer: React.CSSProperties = {
  color: '#52525b',
  fontSize: 12,
  textAlign: 'center',
  margin: '12px 24px 24px',
}

import {
  Body, Button, Container, Head, Hr, Html,
  Preview, Section, Text,
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
      <Preview>Reembolso do plano {planName} processado com sucesso.</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* Top bar neutral */}
          <div style={{ height: 3, background: '#27272a', borderRadius: '4px 4px 0 0' }} />

          <Section style={header}>
            <Text style={wordmark}>reviv<span style={{ color: '#71717a' }}>.ai</span></Text>
          </Section>

          <Hr style={divider} />

          <Section style={content}>
            <Text style={greeting}>Ola, {firstName}.</Text>
            <Text style={headline}>Reembolso confirmado.</Text>
            <Text style={body_text}>
              Seu pedido de cancelamento do plano <strong style={{ color: '#e4e4e7' }}>{planName}</strong> foi processado. O valor sera estornado no metodo de pagamento utilizado.
            </Text>

            {/* Status block */}
            <div style={statusBlock}>
              <div style={statusRow}>
                <Text style={statusKey}>Plano cancelado</Text>
                <Text style={statusVal}>{planName}</Text>
              </div>
              <Hr style={innerDivider} />
              <div style={statusRow}>
                <Text style={statusKey}>Status</Text>
                <Text style={{ ...statusVal, color: '#22c55e' }}>Reembolsado</Text>
              </div>
              <Hr style={innerDivider} />
              <div style={statusRow}>
                <Text style={statusKey}>Prazo de estorno</Text>
                <Text style={statusVal}>5 a 7 dias uteis</Text>
              </div>
            </div>

            <Text style={note}>
              Se tiver duvidas sobre o prazo ou o valor, entre em contato com nosso suporte.
            </Text>

            <Button href="https://wa.me/5511969656723" style={ctaButton}>
              Falar com suporte
            </Button>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              E-mail enviado para {email} referente a uma compra em revivads.com.
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
const statusBlock: React.CSSProperties = {
  backgroundColor: '#141414',
  border: '1px solid #1f1f1f',
  borderRadius: 6,
  padding: '0 20px',
  marginBottom: 24,
}
const statusRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 0',
}
const statusKey: React.CSSProperties = {
  color: '#52525b',
  fontSize: 12,
  margin: 0,
}
const statusVal: React.CSSProperties = {
  color: '#e4e4e7',
  fontSize: 12,
  fontWeight: 600,
  margin: 0,
}
const innerDivider: React.CSSProperties = { borderColor: '#1f1f1f', margin: 0 }
const note: React.CSSProperties = {
  color: '#52525b',
  fontSize: 12,
  margin: '0 0 16px',
  lineHeight: 1.5,
}
const ctaButton: React.CSSProperties = {
  backgroundColor: '#1f1f1f',
  color: '#e4e4e7',
  fontSize: 13,
  fontWeight: 600,
  padding: '11px 22px',
  borderRadius: 6,
  textDecoration: 'none',
  display: 'inline-block',
  border: '1px solid #27272a',
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

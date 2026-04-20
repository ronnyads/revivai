import {
  Body, Button, Container, Head, Heading, Hr, Html,
  Img, Link, Preview, Section, Text,
} from '@react-email/components'

const PLAN_COLORS: Record<string, string> = {
  Rookie:  '#71717a',
  Creator: '#3b82f6',
  Pro:     '#a855f7',
  Studio:  '#f59e0b',
}

interface PurchaseEmailProps {
  name: string
  email: string
  planName: string
  credits: number
  magicLink: string
}

export default function PurchaseEmail({ name, email, planName, credits, magicLink }: PurchaseEmailProps) {
  const color = PLAN_COLORS[planName] ?? '#3b82f6'
  const images = Math.floor(credits / 8)
  const videos = Math.floor(credits / 15)
  const upscales = Math.floor(credits / 3)
  const firstName = name?.split(' ')[0] ?? 'criador'

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Sua conta RevivAI está pronta — clique para acessar</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* Header */}
          <Section style={{ textAlign: 'center', padding: '32px 0 16px' }}>
            <Text style={{ ...logo, color }}>reviv.ai</Text>
            <Text style={badge}>Plano {planName}</Text>
          </Section>

          {/* Headline */}
          <Heading style={h1}>Bem-vindo, {firstName}! 🎉</Heading>
          <Text style={subtitle}>Sua conta foi criada e seus créditos já estão disponíveis.</Text>

          {/* Credits box */}
          <Section style={{ ...box, borderColor: color }}>
            <Text style={{ ...bigNumber, color }}>{credits.toLocaleString('pt-BR')}</Text>
            <Text style={boxLabel}>créditos disponíveis</Text>
          </Section>

          {/* Unlocks */}
          <Section style={unlocksRow}>
            <UnlockItem label="Imagens" value={images} />
            <UnlockItem label="Vídeos" value={videos} />
            <UnlockItem label="Upscales 4K" value={upscales} />
          </Section>

          {/* CTA */}
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Text style={ctaNote}>Clique no botão abaixo para acessar sua conta pela primeira vez. O link expira em <strong>24 horas</strong>.</Text>
            <Button href={magicLink} style={{ ...ctaButton, backgroundColor: color }}>
              Acessar minha conta →
            </Button>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Text style={footer}>
            Este e-mail foi enviado para <Link href={`mailto:${email}`} style={{ color }}>{email}</Link> porque você realizou uma compra em revivads.com.<br />
            Dúvidas? Fale conosco pelo <Link href="https://wa.me/5511999999999" style={{ color }}>WhatsApp</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

function UnlockItem({ label, value }: { label: string; value: number }) {
  return (
    <div style={unlockItem}>
      <Text style={unlockValue}>{value.toLocaleString('pt-BR')}</Text>
      <Text style={unlockLabel}>{label}</Text>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
  backgroundColor: '#09090b',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: 0,
  padding: 0,
}
const container: React.CSSProperties = {
  maxWidth: 480,
  margin: '0 auto',
  backgroundColor: '#18181b',
  borderRadius: 16,
  overflow: 'hidden',
  border: '1px solid #27272a',
}
const logo: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  letterSpacing: '-1px',
  margin: 0,
}
const badge: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#27272a',
  color: '#a1a1aa',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 2,
  padding: '4px 12px',
  borderRadius: 99,
  margin: '8px 0 0',
}
const h1: React.CSSProperties = {
  color: '#ffffff',
  fontSize: 26,
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
const box: React.CSSProperties = {
  margin: '0 24px',
  padding: '24px',
  backgroundColor: '#09090b',
  borderRadius: 12,
  border: '1px solid',
  textAlign: 'center',
}
const bigNumber: React.CSSProperties = {
  fontSize: 48,
  fontWeight: 900,
  margin: 0,
  lineHeight: 1,
}
const boxLabel: React.CSSProperties = {
  color: '#71717a',
  fontSize: 12,
  margin: '4px 0 0',
  textTransform: 'uppercase',
  letterSpacing: 1,
}
const unlocksRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-around',
  margin: '16px 24px 0',
  gap: 8,
}
const unlockItem: React.CSSProperties = {
  flex: 1,
  textAlign: 'center',
  backgroundColor: '#27272a',
  borderRadius: 10,
  padding: '12px 8px',
}
const unlockValue: React.CSSProperties = {
  color: '#ffffff',
  fontSize: 20,
  fontWeight: 800,
  margin: 0,
}
const unlockLabel: React.CSSProperties = {
  color: '#71717a',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  margin: '2px 0 0',
}
const ctaNote: React.CSSProperties = {
  color: '#71717a',
  fontSize: 13,
  margin: '0 24px 16px',
}
const ctaButton: React.CSSProperties = {
  color: '#ffffff',
  fontSize: 15,
  fontWeight: 700,
  padding: '14px 32px',
  borderRadius: 12,
  textDecoration: 'none',
  display: 'inline-block',
}
const divider: React.CSSProperties = {
  borderColor: '#27272a',
  margin: '0 24px',
}
const footer: React.CSSProperties = {
  color: '#52525b',
  fontSize: 12,
  textAlign: 'center',
  margin: '16px 24px 24px',
  lineHeight: 1.6,
}

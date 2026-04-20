import {
  Body, Button, Container, Head, Hr, Html,
  Preview, Section, Text,
} from '@react-email/components'

const PLAN_CONFIG: Record<string, { color: string; accent: string; tier: string }> = {
  Explorador: { color: '#22c55e', accent: '#16a34a', tier: '00' },
  Rookie:     { color: '#71717a', accent: '#52525b', tier: '01' },
  Creator:    { color: '#3b82f6', accent: '#2563eb', tier: '02' },
  Pro:        { color: '#a855f7', accent: '#9333ea', tier: '03' },
  Studio:     { color: '#f59e0b', accent: '#d97706', tier: '04' },
}

interface PurchaseEmailProps {
  name: string
  email: string
  planName: string
  credits: number
  magicLink: string
}

export default function PurchaseEmail({ name, email, planName, credits, magicLink }: PurchaseEmailProps) {
  const cfg = PLAN_CONFIG[planName] ?? PLAN_CONFIG['Creator']
  const firstName = name?.split(' ')[0] ?? 'criador'
  const images   = Math.floor(credits / 8)
  const videos   = Math.floor(credits / 15)
  const upscales = Math.floor(credits / 3)

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Sua conta RevivAI esta pronta. Acesse agora.</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* Top bar */}
          <div style={{ height: 3, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.accent})`, borderRadius: '4px 4px 0 0' }} />

          {/* Header */}
          <Section style={header}>
            <Text style={wordmark}>reviv<span style={{ color: cfg.color }}>.ai</span></Text>
          </Section>

          <Hr style={divider} />

          {/* Body */}
          <Section style={content}>
            <Text style={greeting}>Ola, {firstName}.</Text>
            <Text style={headline}>Sua conta foi criada.</Text>
            <Text style={body_text}>
              Voce adquiriu o plano <span style={{ color: cfg.color, fontWeight: 700 }}>{planName}</span> e seus creditos ja estao disponiveis na plataforma.
            </Text>

            {/* Credits block */}
            <div style={creditsBlock}>
              <Text style={creditsLabel}>CREDITOS DISPONIVEIS</Text>
              <Text style={{ ...creditsNumber, color: cfg.color }}>{credits.toLocaleString('pt-BR')}</Text>
            </div>

            {/* Capacity grid */}
            <div style={grid}>
              <div style={gridItem}>
                <Text style={gridValue}>{images.toLocaleString('pt-BR')}</Text>
                <Text style={gridLabel}>Imagens</Text>
              </div>
              <div style={{ ...gridItem, borderLeft: `1px solid #27272a`, borderRight: `1px solid #27272a` }}>
                <Text style={gridValue}>{videos.toLocaleString('pt-BR')}</Text>
                <Text style={gridLabel}>Videos</Text>
              </div>
              <div style={gridItem}>
                <Text style={gridValue}>{upscales.toLocaleString('pt-BR')}</Text>
                <Text style={gridLabel}>Upscales 4K</Text>
              </div>
            </div>

            {/* CTA */}
            <Text style={ctaNote}>
              Use o link abaixo para acessar sua conta pela primeira vez. Expira em 24 horas.
            </Text>
            <Button href={magicLink} style={{ ...ctaButton, backgroundColor: cfg.color }}>
              Acessar minha conta
            </Button>

            <Text style={ctaAlt}>
              Ou copie e cole este link no seu navegador:{' '}
              <span style={{ color: cfg.color, wordBreak: 'break-all', fontSize: 11 }}>{magicLink}</span>
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Este e-mail foi enviado para {email} porque voce realizou uma compra em revivads.com.
            </Text>
            <Text style={footerMeta}>
              RevivAI — Geracao de conteudo com inteligencia artificial
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

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
const header: React.CSSProperties = {
  padding: '28px 36px 20px',
}
const wordmark: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: '#ffffff',
  letterSpacing: '-0.5px',
  margin: 0,
}
const divider: React.CSSProperties = {
  borderColor: '#1f1f1f',
  margin: 0,
}
const content: React.CSSProperties = {
  padding: '32px 36px',
}
const greeting: React.CSSProperties = {
  color: '#71717a',
  fontSize: 13,
  margin: '0 0 4px',
}
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
  margin: '0 0 28px',
}
const creditsBlock: React.CSSProperties = {
  backgroundColor: '#141414',
  border: '1px solid #1f1f1f',
  borderRadius: 6,
  padding: '20px 24px',
  marginBottom: 4,
}
const creditsLabel: React.CSSProperties = {
  color: '#3f3f46',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 2,
  margin: '0 0 6px',
  fontFamily: '"Courier New", monospace',
}
const creditsNumber: React.CSSProperties = {
  fontSize: 44,
  fontWeight: 800,
  letterSpacing: '-2px',
  margin: 0,
  lineHeight: 1,
  fontFamily: '"Courier New", monospace',
}
const grid: React.CSSProperties = {
  display: 'flex',
  border: '1px solid #1f1f1f',
  borderRadius: 6,
  overflow: 'hidden',
  marginBottom: 28,
  marginTop: 4,
}
const gridItem: React.CSSProperties = {
  flex: 1,
  padding: '14px 0',
  textAlign: 'center',
  backgroundColor: '#141414',
}
const gridValue: React.CSSProperties = {
  color: '#ffffff',
  fontSize: 18,
  fontWeight: 700,
  margin: '0 0 2px',
  fontFamily: '"Courier New", monospace',
}
const gridLabel: React.CSSProperties = {
  color: '#3f3f46',
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 1,
  margin: 0,
}
const ctaNote: React.CSSProperties = {
  color: '#52525b',
  fontSize: 12,
  margin: '0 0 12px',
  lineHeight: 1.5,
}
const ctaButton: React.CSSProperties = {
  color: '#000000',
  fontSize: 13,
  fontWeight: 700,
  padding: '12px 24px',
  borderRadius: 6,
  textDecoration: 'none',
  display: 'inline-block',
  letterSpacing: '0.2px',
}
const ctaAlt: React.CSSProperties = {
  color: '#3f3f46',
  fontSize: 11,
  margin: '16px 0 0',
  lineHeight: 1.6,
}
const footer: React.CSSProperties = {
  padding: '20px 36px 24px',
}
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

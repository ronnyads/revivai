import {
  Body, Button, Column, Container, Head, Hr, Html, Preview, Row, Section, Text,
} from '@react-email/components'
import {
  accentDotStyle,
  bodyStyle,
  brandRowStyle,
  cardStyle,
  containerStyle,
  ctaStyle,
  dividerStyle,
  eyebrowStyle,
  footerBodyStyle,
  footerMetaStyle,
  footerStyle,
  heroStyle,
  headlineStyle,
  leadStyle,
  panelLabelStyle,
  pillStyle,
  PLAN_PALETTES,
  secondaryCtaStyle,
  sectionStyle,
  shellChromeStyle,
  shellDotRowStyle,
  shellDotStyle,
  shellFrameStyle,
  statValueStyle,
  subtleTextStyle,
  wordmarkStyle,
} from '@/emails/theme'

interface AbandonedCartEmailProps {
  name: string
  email: string
  planName: string
  credits: number
  price: number
  checkoutUrl: string
}

export default function AbandonedCartEmail({
  name,
  email,
  planName,
  credits,
  price,
  checkoutUrl,
}: AbandonedCartEmailProps) {
  const firstName = name?.split(' ')[0] ?? 'criador'
  const discountedPrice = Number((price * 0.8).toFixed(2))
  const palette = PLAN_PALETTES[planName] ?? PLAN_PALETTES.Creator
  const formatPrice = (value: number) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Voce deixou {credits.toLocaleString('pt-BR')} creditos no carrinho.</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={shellFrameStyle}>
            <div style={shellChromeStyle}>
              <div style={shellDotRowStyle}>
                <span style={shellDotStyle('#F87171')} />
                <span style={shellDotStyle('#FBBF24')} />
                <span style={shellDotStyle(palette.accent)} />
              </div>
            </div>
          </Section>

          <Section style={brandRowStyle}>
            <Text style={wordmarkStyle()}>
              REVIVAI
              <span style={accentDotStyle(palette.accent)} />
            </Text>
          </Section>

          <Section style={heroStyle(palette.glow)}>
            <Text style={eyebrowStyle}>RECOVERY FLOW</Text>
            <Text style={headlineStyle}>VOCE DEIXOU ALGO PARA TRAS.</Text>
            <Text style={leadStyle}>
              Ola, {firstName}. O plano <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{planName}</span> com{' '}
              {credits.toLocaleString('pt-BR')} creditos ainda esta te esperando, agora com incentivo extra para fechar seu acesso.
            </Text>
          </Section>

          <Section style={sectionStyle}>
            <div style={cardStyle}>
              <Text style={pillStyle(palette)}>{planName.toUpperCase()}</Text>
              <Text style={{ ...statValueStyle(palette.accent), marginTop: 14 }}>
                {credits.toLocaleString('pt-BR')}
              </Text>
              <Text style={subtleTextStyle}>creditos prontos para entrar no seu studio</Text>

              <Hr style={{ ...dividerStyle, margin: '18px 0' }} />

              <Row>
                <Column>
                  <Text style={panelLabelStyle}>VALOR ORIGINAL</Text>
                  <Text style={{ ...subtleTextStyle, textDecoration: 'line-through', fontSize: 16 }}>
                    R$ {formatPrice(price)}
                  </Text>
                </Column>
                <Column>
                  <Text style={panelLabelStyle}>COM CUPOM</Text>
                  <Text style={{ ...statValueStyle('#86EFAC'), fontSize: 30 }}>
                    R$ {formatPrice(discountedPrice)}
                  </Text>
                </Column>
              </Row>
            </div>
          </Section>

          <Section style={sectionStyle}>
            <div style={{ ...cardStyle, backgroundColor: '#101214' }}>
              <Text style={panelLabelStyle}>CUPOM DE DESCONTO</Text>
              <Text
                style={{
                  color: palette.accent,
                  fontSize: 32,
                  fontWeight: 800,
                  letterSpacing: 4,
                  margin: '0 0 8px',
                  fontFamily: '"IBM Plex Mono", "Courier New", monospace',
                  textTransform: 'uppercase',
                }}
              >
                REVIVAI
              </Text>
              <Text style={subtleTextStyle}>20% de desconto para concluir seu checkout por tempo limitado.</Text>
            </div>
          </Section>

          <Section style={sectionStyle}>
            <Button href={checkoutUrl} style={ctaStyle(palette.accent)}>
              Finalizar compra com desconto
            </Button>
          </Section>

          <Section style={{ ...sectionStyle, paddingTop: 14 }}>
            <Button href={checkoutUrl} style={secondaryCtaStyle}>
              Retomar checkout
            </Button>
          </Section>

          <Hr style={{ ...dividerStyle, marginTop: 26 }} />

          <Section style={footerStyle}>
            <Text style={footerBodyStyle}>
              E-mail enviado para {email} pois voce iniciou um checkout em revivads.com.
            </Text>
            <Text style={footerMetaStyle}>REVIVAI | GERACAO DE CONTEUDO COM INTELIGENCIA ARTIFICIAL</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

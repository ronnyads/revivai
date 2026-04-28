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
  dataBlockStyle,
  dataKeyStyle,
  dataValueStyle,
  dividerStyle,
  eyebrowStyle,
  footerBodyStyle,
  footerMetaStyle,
  footerStyle,
  heroStyle,
  headlineStyle,
  leadStyle,
  metricCellStyle,
  metricLabelStyle,
  metricValueStyle,
  panelLabelStyle,
  PLAN_PALETTES,
  sectionStyle,
  shellChromeStyle,
  shellDotRowStyle,
  shellDotStyle,
  shellFrameStyle,
  statValueStyle,
  subtleTextStyle,
  wordmarkStyle,
} from '@/emails/theme'

interface PurchaseEmailProps {
  name: string
  email: string
  planName: string
  credits: number
  loginUrl: string
}

export default function PurchaseEmail({ name, email, planName, credits, loginUrl }: PurchaseEmailProps) {
  const palette = PLAN_PALETTES[planName] ?? PLAN_PALETTES.Creator
  const firstName = name?.split(' ')[0] ?? 'criador'
  const images = Math.floor(credits / 8)
  const videos = Math.floor(credits / 15)
  const upscales = Math.floor(credits / 3)

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Sua conta RevivAI esta pronta. Entre com um clique.</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={shellFrameStyle}>
            <div style={shellChromeStyle}>
              <div style={shellDotRowStyle}>
                <span style={shellDotStyle('#F87171')} />
                <span style={shellDotStyle('#FBBF24')} />
                <span style={shellDotStyle('#54D6F6')} />
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
            <Text style={eyebrowStyle}>CONTA LIBERADA</Text>
            <Text style={headlineStyle}>SEU TERMINAL ESTA PRONTO.</Text>
            <Text style={leadStyle}>
              Ola, {firstName}. O plano <span style={{ color: palette.accent, fontWeight: 700 }}>{planName}</span> ja foi
              ativado e seus creditos estao disponiveis para voce entrar no studio sem nenhuma etapa extra.
            </Text>
          </Section>

          <Section style={sectionStyle}>
            <div style={cardStyle}>
              <Text style={panelLabelStyle}>CREDITOS DISPONIVEIS</Text>
              <Text style={statValueStyle(palette.accent)}>{credits.toLocaleString('pt-BR')}</Text>
              <Text style={subtleTextStyle}>Capacidade premium liberada para criacao, restauracao e upscale.</Text>
            </div>
          </Section>

          <Section style={sectionStyle}>
            <Row>
              <Column style={metricCellStyle}>
                <Text style={metricValueStyle}>{images.toLocaleString('pt-BR')}</Text>
                <Text style={metricLabelStyle}>Imagens</Text>
              </Column>
              <Column style={{ width: 10 }} />
              <Column style={metricCellStyle}>
                <Text style={metricValueStyle}>{videos.toLocaleString('pt-BR')}</Text>
                <Text style={metricLabelStyle}>Videos</Text>
              </Column>
              <Column style={{ width: 10 }} />
              <Column style={metricCellStyle}>
                <Text style={metricValueStyle}>{upscales.toLocaleString('pt-BR')}</Text>
                <Text style={metricLabelStyle}>Upscales 4K</Text>
              </Column>
            </Row>
          </Section>

          <Section style={sectionStyle}>
            <div style={dataBlockStyle}>
              <Row style={{ padding: '16px 0' }}>
                <Column style={{ width: '32%' }}>
                  <Text style={dataKeyStyle}>E-mail</Text>
                </Column>
                <Column>
                  <Text style={dataValueStyle}>{email}</Text>
                </Column>
              </Row>
              <Hr style={dividerStyle} />
              <Row style={{ padding: '16px 0' }}>
                <Column style={{ width: '32%' }}>
                  <Text style={dataKeyStyle}>Acesso</Text>
                </Column>
                <Column>
                  <Text style={{ ...dataValueStyle, color: palette.accentSoft }}>
                    Use o botao abaixo para entrar automaticamente com este e-mail. Nenhuma senha temporaria foi criada.
                  </Text>
                </Column>
              </Row>
            </div>
          </Section>

          <Section style={sectionStyle}>
            <Button href={loginUrl} style={ctaStyle(palette.accent)}>
              Acessar minha conta
            </Button>
          </Section>

          <Hr style={{ ...dividerStyle, marginTop: 26 }} />

          <Section style={footerStyle}>
            <Text style={footerBodyStyle}>
              Este e-mail foi enviado para {email} porque voce realizou uma compra em revivads.com.
            </Text>
            <Text style={footerMetaStyle}>REVIVAI | GERACAO DE CONTEUDO COM INTELIGENCIA ARTIFICIAL</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

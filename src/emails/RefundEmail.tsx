import {
  Body, Button, Column, Container, Head, Hr, Html, Preview, Row, Section, Text,
} from '@react-email/components'
import {
  accentDotStyle,
  bodyStyle,
  brandRowStyle,
  containerStyle,
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
  REFUND_PALETTE,
  secondaryCtaStyle,
  sectionStyle,
  shellChromeStyle,
  shellDotRowStyle,
  shellDotStyle,
  shellFrameStyle,
  wordmarkStyle,
} from '@/emails/theme'

interface RefundEmailProps {
  name: string
  email: string
  planName: string
}

export default function RefundEmail({ name, email, planName }: RefundEmailProps) {
  const firstName = name?.split(' ')[0] ?? 'cliente'
  const palette = REFUND_PALETTE

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Reembolso do plano {planName} processado com sucesso.</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={shellFrameStyle}>
            <div style={shellChromeStyle}>
              <div style={shellDotRowStyle}>
                <span style={shellDotStyle('#F87171')} />
                <span style={shellDotStyle('#FBBF24')} />
                <span style={shellDotStyle('#71717A')} />
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
            <Text style={{ ...eyebrowStyle, color: '#A1A1AA' }}>STATUS FINANCEIRO</Text>
            <Text style={headlineStyle}>REEMBOLSO CONFIRMADO.</Text>
            <Text style={leadStyle}>
              Ola, {firstName}. O cancelamento do plano <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{planName}</span> foi
              processado e o estorno agora segue para o metodo de pagamento original.
            </Text>
          </Section>

          <Section style={sectionStyle}>
            <div style={dataBlockStyle}>
              <Row style={{ padding: '16px 0' }}>
                <Column style={{ width: '34%' }}>
                  <Text style={dataKeyStyle}>Plano cancelado</Text>
                </Column>
                <Column>
                  <Text style={dataValueStyle}>{planName}</Text>
                </Column>
              </Row>
              <Hr style={dividerStyle} />
              <Row style={{ padding: '16px 0' }}>
                <Column style={{ width: '34%' }}>
                  <Text style={dataKeyStyle}>Status</Text>
                </Column>
                <Column>
                  <Text style={{ ...dataValueStyle, color: '#86EFAC' }}>Reembolsado</Text>
                </Column>
              </Row>
              <Hr style={dividerStyle} />
              <Row style={{ padding: '16px 0' }}>
                <Column style={{ width: '34%' }}>
                  <Text style={dataKeyStyle}>Prazo</Text>
                </Column>
                <Column>
                  <Text style={dataValueStyle}>5 a 7 dias uteis</Text>
                </Column>
              </Row>
            </div>
          </Section>

          <Section style={{ ...sectionStyle, paddingTop: 18 }}>
            <Text style={leadStyle}>
              Se precisar validar o prazo, valor ou proximo ciclo, nosso suporte responde rapido e com contexto da sua compra.
            </Text>
          </Section>

          <Section style={sectionStyle}>
            <Button href="https://wa.me/5511969656723" style={secondaryCtaStyle}>
              Falar com suporte
            </Button>
          </Section>

          <Hr style={{ ...dividerStyle, marginTop: 26 }} />

          <Section style={footerStyle}>
            <Text style={footerBodyStyle}>
              E-mail enviado para {email} referente a uma compra em revivads.com.
            </Text>
            <Text style={footerMetaStyle}>REVIVAI | GERACAO DE CONTEUDO COM INTELIGENCIA ARTIFICIAL</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

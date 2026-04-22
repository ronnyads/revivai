export type EmailPalette = {
  accent: string
  accentSoft: string
  glow: string
  pillBg: string
}

export const PLAN_PALETTES: Record<string, EmailPalette> = {
  Explorador: { accent: '#5EEAD4', accentSoft: '#99F6E4', glow: '#0B2E2B', pillBg: '#0B2321' },
  Rookie: { accent: '#54D6F6', accentSoft: '#AFECFF', glow: '#082A33', pillBg: '#0C2027' },
  Creator: { accent: '#54D6F6', accentSoft: '#AFECFF', glow: '#082A33', pillBg: '#0C2027' },
  Pro: { accent: '#8FE7FF', accentSoft: '#D8F7FF', glow: '#0B2530', pillBg: '#0D1C22' },
  Studio: { accent: '#F6C454', accentSoft: '#FFE6A6', glow: '#352607', pillBg: '#231B0B' },
}

export const REFUND_PALETTE: EmailPalette = {
  accent: '#A1A1AA',
  accentSoft: '#E4E4E7',
  glow: '#17171A',
  pillBg: '#141416',
}

export const bodyStyle: React.CSSProperties = {
  backgroundColor: '#050505',
  backgroundImage:
    'radial-gradient(circle at top right, rgba(84,214,246,0.10), transparent 28%), radial-gradient(circle at bottom left, rgba(0,173,204,0.08), transparent 24%)',
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: 0,
  padding: '36px 14px',
}

export const containerStyle: React.CSSProperties = {
  maxWidth: 560,
  margin: '0 auto',
  backgroundColor: '#0e0e0e',
  borderRadius: 28,
  border: '1px solid #1E2427',
  overflow: 'hidden',
  boxShadow: '0 30px 90px rgba(0,0,0,0.55)',
}

export const shellFrameStyle: React.CSSProperties = { padding: '18px 28px 0' }

export const shellChromeStyle: React.CSSProperties = {
  border: '1px solid #1E2427',
  borderBottom: 'none',
  borderRadius: '18px 18px 0 0',
  backgroundColor: '#111315',
  padding: '10px 14px',
}

export const shellDotRowStyle: React.CSSProperties = { fontSize: 0, lineHeight: 0 }

export const shellDotStyle = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  width: 8,
  height: 8,
  borderRadius: 999,
  backgroundColor: color,
  marginRight: 7,
})

export const brandRowStyle: React.CSSProperties = { padding: '14px 28px 0' }

export const wordmarkStyle = (): React.CSSProperties => ({
  color: '#FFFFFF',
  fontSize: 24,
  fontWeight: 800,
  letterSpacing: '-1px',
  margin: 0,
})

export const accentDotStyle = (accent: string): React.CSSProperties => ({
  display: 'inline-block',
  width: 9,
  height: 9,
  borderRadius: 999,
  backgroundColor: accent,
  boxShadow: `0 0 18px ${accent}`,
  marginLeft: 10,
})

export const heroStyle = (glow: string): React.CSSProperties => ({
  margin: '22px 28px 0',
  borderRadius: 24,
  border: '1px solid #1E2427',
  backgroundColor: '#101214',
  backgroundImage: `radial-gradient(circle at top right, ${glow}, transparent 45%), linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))`,
  padding: '28px 28px 26px',
})

export const eyebrowStyle: React.CSSProperties = {
  color: '#54D6F6',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 3,
  textTransform: 'uppercase',
  margin: '0 0 12px',
  fontFamily: '"IBM Plex Mono", "Courier New", monospace',
}

export const headlineStyle: React.CSSProperties = {
  color: '#FFFFFF',
  fontSize: 34,
  fontWeight: 800,
  lineHeight: 1.02,
  letterSpacing: '-1.8px',
  textTransform: 'uppercase',
  margin: '0 0 14px',
  fontFamily: '"Space Grotesk", "Inter", sans-serif',
}

export const leadStyle: React.CSSProperties = {
  color: '#AAB8BD',
  fontSize: 15,
  lineHeight: 1.72,
  margin: 0,
}

export const sectionStyle: React.CSSProperties = { padding: '24px 28px 0' }

export const cardStyle: React.CSSProperties = {
  backgroundColor: '#131618',
  border: '1px solid #20282C',
  borderRadius: 22,
  padding: '22px 22px',
}

export const panelLabelStyle: React.CSSProperties = {
  color: '#7F9096',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 2.6,
  textTransform: 'uppercase',
  margin: '0 0 8px',
  fontFamily: '"IBM Plex Mono", "Courier New", monospace',
}

export const statValueStyle = (accent: string): React.CSSProperties => ({
  color: accent,
  fontSize: 46,
  fontWeight: 800,
  lineHeight: 1,
  letterSpacing: '-2px',
  margin: 0,
  fontFamily: '"Space Grotesk", "Inter", sans-serif',
})

export const subtleTextStyle: React.CSSProperties = {
  color: '#7F9096',
  fontSize: 12,
  lineHeight: 1.65,
  margin: 0,
}

export const metricCellStyle: React.CSSProperties = {
  backgroundColor: '#101214',
  border: '1px solid #20282C',
  borderRadius: 18,
  padding: '18px 10px',
  textAlign: 'center',
}

export const metricValueStyle: React.CSSProperties = {
  color: '#FFFFFF',
  fontSize: 22,
  fontWeight: 800,
  margin: '0 0 4px',
  fontFamily: '"Space Grotesk", "Inter", sans-serif',
}

export const metricLabelStyle: React.CSSProperties = {
  color: '#7F9096',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: 1.8,
  margin: 0,
  fontFamily: '"IBM Plex Mono", "Courier New", monospace',
}

export const dataBlockStyle: React.CSSProperties = {
  backgroundColor: '#101214',
  border: '1px solid #20282C',
  borderRadius: 22,
  padding: '0 18px',
}

export const dataKeyStyle: React.CSSProperties = {
  color: '#7F9096',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: 1.8,
  margin: 0,
  fontFamily: '"IBM Plex Mono", "Courier New", monospace',
}

export const dataValueStyle: React.CSSProperties = {
  color: '#F6F7F8',
  fontSize: 13,
  fontWeight: 700,
  margin: 0,
  lineHeight: 1.55,
}

export const dividerStyle: React.CSSProperties = { borderColor: '#20282C', margin: 0 }

export const ctaStyle = (accent: string): React.CSSProperties => ({
  backgroundColor: accent,
  color: '#001F26',
  fontSize: 13,
  fontWeight: 800,
  padding: '14px 26px',
  borderRadius: 999,
  textDecoration: 'none',
  display: 'inline-block',
  letterSpacing: '1.2px',
  textTransform: 'uppercase',
  fontFamily: '"IBM Plex Mono", "Courier New", monospace',
})

export const secondaryCtaStyle: React.CSSProperties = {
  backgroundColor: '#14181A',
  color: '#E5E7EB',
  fontSize: 13,
  fontWeight: 700,
  padding: '14px 24px',
  borderRadius: 999,
  textDecoration: 'none',
  display: 'inline-block',
  letterSpacing: '0.8px',
  border: '1px solid #20282C',
  fontFamily: '"IBM Plex Mono", "Courier New", monospace',
  textTransform: 'uppercase',
}

export const pillStyle = (palette: EmailPalette): React.CSSProperties => ({
  display: 'inline-block',
  padding: '6px 10px',
  borderRadius: 999,
  backgroundColor: palette.pillBg,
  color: palette.accent,
  border: `1px solid ${palette.glow}`,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.8,
  textTransform: 'uppercase',
  fontFamily: '"IBM Plex Mono", "Courier New", monospace',
})

export const footerStyle: React.CSSProperties = { padding: '26px 28px 30px' }

export const footerBodyStyle: React.CSSProperties = {
  color: '#67757A',
  fontSize: 11,
  lineHeight: 1.7,
  margin: '0 0 6px',
}

export const footerMetaStyle: React.CSSProperties = {
  color: '#4B5559',
  fontSize: 10,
  letterSpacing: 1.6,
  textTransform: 'uppercase',
  margin: 0,
  fontFamily: '"IBM Plex Mono", "Courier New", monospace',
}

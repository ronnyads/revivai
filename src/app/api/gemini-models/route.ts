import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GOOGLE_API_KEY não configurada' }, { status: 500 })

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
  const data = await res.json()

  const all = (data.models ?? [])
    .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m: any) => ({
      name: m.name,
      displayName: m.displayName,
      description: m.description,
      supportsImage: !!(
        m.name?.toLowerCase().includes('image') ||
        m.displayName?.toLowerCase().includes('image') ||
        m.description?.toLowerCase().includes('image generation')
      ),
    }))

  return NextResponse.json({ models: all, total: all.length })
}

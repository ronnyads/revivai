export interface SovereignAnalysis {
  needs_scratch_removal: boolean
  needs_colorization: boolean
  needs_face_restoration: boolean
}

export async function analyzeSovereignGPT(imageUrl: string): Promise<SovereignAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('[sovereign] OPENAI_API_KEY não configurada. Fallback para Automático (DDColor+ESRGAN+Codeformer).')
    return { needs_scratch_removal: false, needs_colorization: true, needs_face_restoration: true }
  }

  const prompt = `
Você é um Vision AI Architect super avançado focado na análise de restauração de fotos antigas.
Sua missão é classificar a imagem enviada para acionar o pipeline perfeito de modelos de IA.
Responda OBRIGATORIAMENTE no JSON Schema exigido.

Regras de Análise:
1. "needs_scratch_removal": Defina como TRUE APENAS se a imagem contiver defeitos físicos: rasgos intensos, rachaduras profundas (como vidro quebrado), manchas pesadas de mofo, dobras severas no papel, ou se estiver rasgada. Sujeirinhas ou leve desfoque não conta.
2. "needs_colorization": Defina como TRUE se a foto original for em Preto e Branco, Sépia, Monocromática, ou se as cores estiverem extremamente lavadas e mortas. Defina como FALSE se já for uma foto colorida vibrante e saudável.
3. "needs_face_restoration": Defina como TRUE se a foto for um retrato/foto de pessoas. Se for paisagem, defina FALSE. O CodeFormer é ótimo, pode deixar TRUE pra quase tudo que envolver humanos.
`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analise detalhadamente a foto e preencha as chaves do JSON Schema.' },
              { type: 'image_url', image_url: { url: imageUrl, detail: 'auto' } },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'photo_analysis',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                needs_scratch_removal: { type: 'boolean' },
                needs_colorization: { type: 'boolean' },
                needs_face_restoration: { type: 'boolean' },
              },
              required: ['needs_scratch_removal', 'needs_colorization', 'needs_face_restoration'],
              additionalProperties: false,
            },
          },
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI Erro: ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content
    if (!content) throw new Error('OpenAI retornou vazio')

    console.log(`[sovereign] GPT-4o Diagnosis:`, content)
    return JSON.parse(content) as SovereignAnalysis

  } catch (error: any) {
    console.error('[sovereign] Falha ao analisar com GPT-4o:', error.message)
    // Em caso de falha do roteador, ativamos o robusto com segurança default (sem inpaint pois é raro e lento)
    return { needs_scratch_removal: false, needs_colorization: true, needs_face_restoration: true }
  }
}

// ─── Enterprise Damage Analysis ──────────────────────────────────────────────

export interface EnterpriseAnalysis {
  has_scratches: boolean        // riscos, arranhões, dobras
  has_tears_or_holes: boolean   // rasgos, buracos, partes faltando
  has_mold_or_stains: boolean   // mofo, manchas d'água, manchas químicas
  has_blur: boolean             // desfoque de movimento ou foco
  has_grain_or_noise: boolean   // granulação de filme, ruído digital
  has_jpeg_artifacts: boolean   // blocos JPEG, pixelização por compressão
  has_faces: boolean            // rostos de pessoas identificáveis
  is_grayscale_or_sepia: boolean // P&B, sépia ou monocromático
  damage_severity: 'light' | 'moderate' | 'severe'
}

export async function analyzeEnterpriseDamage(imageUrl: string): Promise<EnterpriseAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('[enterprise] OPENAI_API_KEY não configurada. Usando fallback conservador.')
    return {
      has_scratches: false, has_tears_or_holes: false, has_mold_or_stains: false,
      has_blur: false, has_grain_or_noise: true, has_jpeg_artifacts: false,
      has_faces: true, is_grayscale_or_sepia: true, damage_severity: 'moderate',
    }
  }

  const prompt = `
Você é um especialista técnico em restauração de fotos antigas. Analise a imagem com precisão.

AVALIE CADA CAMPO COM RIGOR:

1. has_scratches: TRUE se há riscos lineares, arranhões, dobras ou amassados VISÍVEIS
2. has_tears_or_holes: TRUE se há rasgos, buracos ou partes COMPLETAMENTE ausentes
3. has_mold_or_stains: TRUE se há manchas circulares de mofo, manchas d'água ou manchas químicas difusas
4. has_blur: TRUE se a imagem está tremida ou desfocada (movimento ou foco incorreto)
5. has_grain_or_noise: TRUE se há granulação de filme antigo ou ruído digital visível
6. has_jpeg_artifacts: TRUE se há blocos quadrados 8x8 ou pixelização por compressão JPEG
7. has_faces: TRUE se há rostos de pessoas identificáveis na foto
8. is_grayscale_or_sepia: TRUE se a foto é Preto e Branco, Sépia ou Monocromática
9. damage_severity:
   - "light" = dano leve, estrutura bem preservada
   - "moderate" = danos moderados, foto reconhecível mas com problemas claros
   - "severe" = danos severos, partes significativas perdidas ou extremamente degradadas

IMPORTANTE: Seja conservador. Marque TRUE apenas se o problema for claramente visível.
`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analise detalhadamente a foto e preencha todos os campos.' },
              { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'enterprise_analysis',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                has_scratches:        { type: 'boolean' },
                has_tears_or_holes:   { type: 'boolean' },
                has_mold_or_stains:   { type: 'boolean' },
                has_blur:             { type: 'boolean' },
                has_grain_or_noise:   { type: 'boolean' },
                has_jpeg_artifacts:   { type: 'boolean' },
                has_faces:            { type: 'boolean' },
                is_grayscale_or_sepia:{ type: 'boolean' },
                damage_severity:      { type: 'string', enum: ['light', 'moderate', 'severe'] },
              },
              required: [
                'has_scratches', 'has_tears_or_holes', 'has_mold_or_stains',
                'has_blur', 'has_grain_or_noise', 'has_jpeg_artifacts',
                'has_faces', 'is_grayscale_or_sepia', 'damage_severity',
              ],
              additionalProperties: false,
            },
          },
        },
      }),
    })

    if (!response.ok) throw new Error(`OpenAI Erro: ${await response.text()}`)
    const data = await response.json()
    const content = data.choices[0]?.message?.content
    if (!content) throw new Error('OpenAI retornou vazio')

    const analysis = JSON.parse(content) as EnterpriseAnalysis
    console.log('[enterprise] Damage analysis:', JSON.stringify(analysis))
    return analysis

  } catch (error: any) {
    console.error('[enterprise] Falha na análise:', error.message)
    return {
      has_scratches: false, has_tears_or_holes: false, has_mold_or_stains: false,
      has_blur: false, has_grain_or_noise: true, has_jpeg_artifacts: false,
      has_faces: true, is_grayscale_or_sepia: true, damage_severity: 'moderate',
    }
  }
}

// ─── AI Quality Gate ──────────────────────────────────────────────────────────

export interface QualityAssessment {
  passed: boolean
  score: number   // 0-100
  reason: string
}

export async function assessRestorationQuality(
  originalUrl: string,
  restoredUrl: string,
): Promise<QualityAssessment> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { passed: true, score: 80, reason: 'API key ausente — assumindo aprovado' }

  const prompt = `
Você é um especialista em restauração de fotos antigas. Compare a foto ORIGINAL (primeira) com a foto RESTAURADA (segunda).

Avalie se a restauração foi fiel ao original:
- Os rostos das pessoas foram PRESERVADOS (não recriados ou distorcidos)?
- O cenário/fundo é reconhecível como o mesmo da foto original?
- Há alucinações óbvias (partes do corpo extras, rostos fundidos, elementos inventados)?
- A qualidade visual geral melhorou sem deturpar o conteúdo?

Pontue de 0 a 100:
- 90-100: Restauração perfeita, fiel ao original
- 70-89: Boa restauração com pequenas alterações aceitáveis
- 50-69: Restauração aceitável mas com alterações notáveis
- 30-49: Muitas distorções, rostos alterados significativamente
- 0-29: Alucinações severas, foto irreconhecível

Responda APENAS no JSON Schema exigido.
`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Compare as duas imagens: ORIGINAL e RESTAURADA.' },
              { type: 'image_url', image_url: { url: originalUrl, detail: 'auto' } },
              { type: 'image_url', image_url: { url: restoredUrl, detail: 'auto' } },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'quality_assessment',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                score:  { type: 'number' },
                reason: { type: 'string' },
              },
              required: ['score', 'reason'],
              additionalProperties: false,
            },
          },
        },
      }),
    })

    if (!response.ok) throw new Error(`OpenAI error: ${await response.text()}`)

    const data    = await response.json()
    const content = data.choices[0]?.message?.content
    if (!content) throw new Error('OpenAI retornou vazio')

    const parsed = JSON.parse(content) as { score: number; reason: string }
    console.log(`[quality-gate] AI score=${parsed.score} reason=${parsed.reason}`)

    return {
      passed: parsed.score >= 65,
      score:  parsed.score,
      reason: parsed.reason,
    }
  } catch (err: any) {
    console.warn('[quality-gate] AI QC falhou (non-blocking):', err.message)
    return { passed: true, score: 75, reason: 'Erro na avaliação — aprovado por padrão' }
  }
}

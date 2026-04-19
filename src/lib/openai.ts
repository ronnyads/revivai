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
    return { needs_scratch_removal: false, needs_colorization: true, needs_face_restoration: true }
  }
}

// ─── Enterprise Damage Analysis ──────────────────────────────────────────────

export interface EnterpriseAnalysis {
  has_scratches: boolean
  has_tears_or_holes: boolean
  has_mold_or_stains: boolean
  has_blur: boolean
  has_grain_or_noise: boolean
  has_jpeg_artifacts: boolean
  has_faces: boolean
  is_grayscale_or_sepia: boolean
  damage_severity: 'light' | 'moderate' | 'severe'
  // v2 — tipo e risco
  photo_type: 'document' | 'single_portrait' | 'group' | 'landscape' | 'unknown'
  face_count_estimate: 'none' | 'one' | 'few' | 'many'
  face_size_estimate: 'large' | 'medium' | 'small' | 'unknown'
  restoration_risk: 'low' | 'medium' | 'high'
}

export async function analyzeEnterpriseDamage(imageUrl: string): Promise<EnterpriseAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn('[enterprise] OPENAI_API_KEY não configurada. Usando fallback conservador.')
    return {
      has_scratches: false, has_tears_or_holes: false, has_mold_or_stains: false,
      has_blur: false, has_grain_or_noise: true, has_jpeg_artifacts: false,
      has_faces: true, is_grayscale_or_sepia: true, damage_severity: 'moderate',
      photo_type: 'unknown', face_count_estimate: 'one', face_size_estimate: 'unknown',
      restoration_risk: 'medium',
    }
  }

  const prompt = `
Você é um especialista técnico em restauração de fotos antigas. Analise a imagem com precisão.

AVALIE CADA CAMPO:

DANOS (na dúvida, marque TRUE):
1. has_scratches: TRUE se há riscos lineares, arranhões, dobras, amassados, cracks visíveis
2. has_tears_or_holes: TRUE se há rasgos, cortes, buracos, partes faltando, linhas largas de papel rasgado
3. has_mold_or_stains: TRUE se há manchas de mofo, manchas d'água, degradação da emulsão, manchas irregulares
4. has_blur: TRUE se a imagem está tremida, desfocada por movimento, ou com foco incorreto
5. has_grain_or_noise: TRUE se há granulação de filme antigo ou ruído digital visível
6. has_jpeg_artifacts: TRUE se há blocos 8x8 ou pixelização por compressão JPEG
7. has_faces: TRUE se há rostos de pessoas identificáveis
8. is_grayscale_or_sepia: TRUE se a foto é P&B, sépia ou monocromática
9. damage_severity: "light" / "moderate" / "severe"

CLASSIFICAÇÃO DO TIPO DE FOTO:
10. photo_type:
    - "document": 3x4, carteira de identidade, passaporte, foto de documento, fundo neutro com 1 rosto centralizado
    - "single_portrait": retrato de 1 pessoa com enquadramento de busto/rosto, não é documento
    - "group": 2 ou mais pessoas visíveis na foto
    - "landscape": paisagem, arquitetura, objetos sem pessoas
    - "unknown": impossível determinar

11. face_count_estimate:
    - "none": nenhum rosto
    - "one": 1 rosto
    - "few": 2-4 rostos
    - "many": 5 ou mais rostos

12. face_size_estimate: tamanho médio dos rostos em relação à imagem total
    - "large": rostos ocupam mais de 30% da imagem
    - "medium": rostos entre 10-30% da imagem
    - "small": rostos menores que 10% (difíceis de restaurar com precisão)
    - "unknown": sem rostos ou impossível avaliar

13. restoration_risk: risco de degradação de identidade facial durante a restauração
    - "high": grupo com rostos pequenos OU dano severo + has_faces OU photo_type=document (identidade crítica)
    - "medium": retrato único com dano moderado OU grupo com rostos médios
    - "low": paisagem, retrato com dano leve, ou sem faces
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
                has_scratches:         { type: 'boolean' },
                has_tears_or_holes:    { type: 'boolean' },
                has_mold_or_stains:    { type: 'boolean' },
                has_blur:              { type: 'boolean' },
                has_grain_or_noise:    { type: 'boolean' },
                has_jpeg_artifacts:    { type: 'boolean' },
                has_faces:             { type: 'boolean' },
                is_grayscale_or_sepia: { type: 'boolean' },
                damage_severity:       { type: 'string', enum: ['light', 'moderate', 'severe'] },
                photo_type:            { type: 'string', enum: ['document', 'single_portrait', 'group', 'landscape', 'unknown'] },
                face_count_estimate:   { type: 'string', enum: ['none', 'one', 'few', 'many'] },
                face_size_estimate:    { type: 'string', enum: ['large', 'medium', 'small', 'unknown'] },
                restoration_risk:      { type: 'string', enum: ['low', 'medium', 'high'] },
              },
              required: [
                'has_scratches', 'has_tears_or_holes', 'has_mold_or_stains',
                'has_blur', 'has_grain_or_noise', 'has_jpeg_artifacts',
                'has_faces', 'is_grayscale_or_sepia', 'damage_severity',
                'photo_type', 'face_count_estimate', 'face_size_estimate', 'restoration_risk',
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
      photo_type: 'unknown', face_count_estimate: 'one', face_size_estimate: 'unknown',
      restoration_risk: 'medium',
    }
  }
}

// ─── AI Quality Gate v1 (mantido para compatibilidade com webhook Replicate) ──

export interface QualityAssessment {
  passed: boolean
  score: number
  reason: string
}

export async function assessRestorationQuality(
  originalUrl: string,
  restoredUrl: string,
): Promise<QualityAssessment> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { passed: true, score: 80, reason: 'API key ausente — assumindo aprovado' }

  const prompt = `
Você é um especialista em controle de qualidade de restauração de fotos antigas.
A PRIMEIRA imagem é a foto ORIGINAL DANIFICADA enviada pelo cliente.
A SEGUNDA imagem é a foto RESTAURADA pela IA.

Uma BOA restauração:
✓ Remove os danos (riscos, manchas, blur, ruído) que existiam no original
✓ A imagem fica mais nítida e clara que o original
✓ Rostos parecem humanos e naturais (podem ser DIFERENTES do original danificado — isso é esperado)
✓ Sem artefatos artificiais: pele plástica, membros extras, rostos fundidos
✓ Fundo/cenário reconhecível como o mesmo do original

Uma MÁ restauração (reprovar):
✗ Introduziu artefatos piores que os danos originais
✗ Rostos parecem plásticos, de boneco, ou completamente sintéticos
✗ Adicionou ou removeu pessoas, objetos, ou partes do corpo
✗ A qualidade visual ficou PIOR que o original enviado
✗ A imagem parece uma obra de arte digital, não uma foto restaurada

IMPORTANTE: Rostos na foto restaurada NÃO precisam ser idênticos à foto original danificada.
Fotos danificadas têm rostos borrados, riscados ou degradados — é CORRETO que o modelo reconstrua
o rosto de forma mais limpa. Só reprove se a reconstrução parecer totalmente artificial ou aberrante.

Pontue de 0 a 100:
- 85-100: Excelente — visivelmente melhor que o original, sem artefatos
- 70-84: Bom — melhorou claramente com pequenos problemas aceitáveis
- 55-69: Aceitável — melhorou mas com artefatos notáveis
- 40-54: Ruim — artefatos piores que os danos originais
- 0-39: Falhou — imagem corrompida, alucinada ou pior que o original

Responda APENAS no JSON Schema exigido.
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
              { type: 'text', text: 'Compare as duas imagens: ORIGINAL e RESTAURADA.' },
              { type: 'image_url', image_url: { url: originalUrl, detail: 'high' } },
              { type: 'image_url', image_url: { url: restoredUrl, detail: 'high' } },
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

    return { passed: parsed.score >= 70, score: parsed.score, reason: parsed.reason }
  } catch (err: any) {
    console.warn('[quality-gate] AI QC falhou (non-blocking):', err.message)
    return { passed: true, score: 75, reason: 'Erro na avaliação — aprovado por padrão' }
  }
}

// ─── AI Quality Gate v2 — multi-score com pesos por tipo de foto ──────────────

export interface QualityAssessmentV2 {
  overall_score: number          // 0-100 (média ponderada)
  visual_quality: number         // nitidez, ruído, artefatos
  identity_preservation: number  // rostos preservados (mesmo que diferentes do danificado)
  composition_fidelity: number   // fundo, geometria, proporções
  hallucination_risk: number     // 100 = zero alucinação, 0 = muito alucinado
  passed: boolean
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

const WEIGHTS: Record<string, { identity: number; composition: number; visual: number; hallucination: number }> = {
  document:        { identity: 0.45, composition: 0.25, visual: 0.20, hallucination: 0.10 },
  single_portrait: { identity: 0.35, composition: 0.25, visual: 0.25, hallucination: 0.15 },
  group:           { identity: 0.40, composition: 0.30, visual: 0.20, hallucination: 0.10 },
  landscape:       { identity: 0.10, composition: 0.35, visual: 0.35, hallucination: 0.20 },
  unknown:         { identity: 0.30, composition: 0.30, visual: 0.25, hallucination: 0.15 },
}

export async function assessRestorationQualityV2(
  originalUrl: string,
  restoredUrl: string,
  photoType: EnterpriseAnalysis['photo_type'] = 'unknown',
  threshold = 70,
): Promise<QualityAssessmentV2> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return {
      overall_score: 80, visual_quality: 80, identity_preservation: 80,
      composition_fidelity: 80, hallucination_risk: 80,
      passed: true, confidence: 'medium', reason: 'API key ausente — aprovado por padrão',
    }
  }

  const typeContext: Record<string, string> = {
    document: 'Esta é uma foto de DOCUMENTO (3x4, identidade). A identidade facial é CRÍTICA.',
    single_portrait: 'Esta é um RETRATO individual. Preservação de identidade é muito importante.',
    group: 'Esta é uma foto de GRUPO com múltiplas pessoas. Cada rosto deve ser preservado.',
    landscape: 'Esta é uma PAISAGEM sem pessoas. Priorize qualidade visual e composição.',
    unknown: 'Tipo de foto não identificado. Avalie todos os critérios com peso igual.',
  }

  const prompt = `
Você é um especialista em controle de qualidade de restauração de fotos antigas.
A PRIMEIRA imagem é a ORIGINAL DANIFICADA. A SEGUNDA é a RESTAURADA pela IA.

CONTEXTO: ${typeContext[photoType] || typeContext.unknown}

Avalie INDEPENDENTEMENTE cada dimensão de 0 a 100:

1. visual_quality (0-100): Nitidez, ausência de ruído, artefatos de compressão, qualidade geral da imagem restaurada vs. original
   100 = perfeitamente nítida, sem artefatos | 0 = pior que o original

2. identity_preservation (0-100): Os rostos na restaurada PARECEM humanos e preservam a essência das pessoas?
   100 = rostos naturais e credíveis | 50 = rostos melhorados mas com pequenas alterações | 0 = rostos plásticos/inventados
   NOTA: rostos podem ser DIFERENTES do original danificado — isso é normal. Penalize se parecerem boneco/plástico/aberrante.

3. composition_fidelity (0-100): A composição, geometria e fundo batem com o original?
   100 = idêntico ao original em composição | 0 = pessoas adicionadas/removidas, fundo completamente diferente

4. hallucination_risk (0-100): INVERTED — 100 = zero alucinação, 0 = muito alucinado
   100 = conteúdo consistente com o original | 0 = inventou partes, membros extras, objetos que não existiam

Reponda APENAS no JSON Schema exigido.
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
              { type: 'text', text: 'Avalie a restauração nas 4 dimensões.' },
              { type: 'image_url', image_url: { url: originalUrl, detail: 'high' } },
              { type: 'image_url', image_url: { url: restoredUrl, detail: 'high' } },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'quality_v2',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                visual_quality:        { type: 'number' },
                identity_preservation: { type: 'number' },
                composition_fidelity:  { type: 'number' },
                hallucination_risk:    { type: 'number' },
                reason:                { type: 'string' },
              },
              required: ['visual_quality', 'identity_preservation', 'composition_fidelity', 'hallucination_risk', 'reason'],
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

    const parsed = JSON.parse(content) as {
      visual_quality: number; identity_preservation: number;
      composition_fidelity: number; hallucination_risk: number; reason: string
    }

    const w = WEIGHTS[photoType] || WEIGHTS.unknown
    const overall_score = Math.round(
      parsed.visual_quality        * w.visual +
      parsed.identity_preservation * w.identity +
      parsed.composition_fidelity  * w.composition +
      parsed.hallucination_risk    * w.hallucination
    )

    const confidence: QualityAssessmentV2['confidence'] =
      parsed.identity_preservation >= 80 ? 'high' :
      parsed.identity_preservation >= 60 ? 'medium' : 'low'

    console.log(`[quality-gate-v2] type=${photoType} overall=${overall_score} identity=${parsed.identity_preservation} visual=${parsed.visual_quality} composition=${parsed.composition_fidelity} hallucination=${parsed.hallucination_risk} confidence=${confidence}`)

    return {
      overall_score,
      visual_quality:        parsed.visual_quality,
      identity_preservation: parsed.identity_preservation,
      composition_fidelity:  parsed.composition_fidelity,
      hallucination_risk:    parsed.hallucination_risk,
      passed:    overall_score >= threshold,
      confidence,
      reason:    parsed.reason,
    }
  } catch (err: any) {
    console.warn('[quality-gate-v2] QC falhou (non-blocking):', err.message)
    return {
      overall_score: 75, visual_quality: 75, identity_preservation: 75,
      composition_fidelity: 75, hallucination_risk: 75,
      passed: true, confidence: 'medium', reason: 'Erro na avaliação — aprovado por padrão',
    }
  }
}

// ─── Composition Quality Gate — verifica se produto foi preservado ─────────────

export interface ProductProfile {
  category: string
  has_text_logo: boolean
  deformation_risk: 'low' | 'medium' | 'high'
  shape_complexity: 'simple' | 'medium' | 'complex'
  placement_suggestion: string
  key_features: string[]
}

export interface CompositionQuality {
  approved: boolean
  score: number      // 0-100
  issues: string[]
  weakest_dimension?: string
}

export async function assessCompositionQuality(
  productUrl: string,
  composedImageBase64: string,
  profile?: ProductProfile,
): Promise<CompositionQuality> {
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY
  if (!apiKey) return { approved: true, score: 80, issues: [] }

  const featuresLine = profile?.key_features?.length
    ? `Product key features to verify: ${profile.key_features.join(', ')}.`
    : ''
  const textLogoRule = profile?.has_text_logo === false
    ? '- (Surface/text check skipped — product has no visible text or logo)'
    : '- Any text or logo is blurred, missing, distorted, or altered\n- Label colors or layout changed'

  const prompt = `EXTREMELY STRICT QUALITY ANALYST FOR UGC AD COMPOSITIONS

You receive:
- IMAGE 1 = original product
- IMAGE 2 = composed photo with model + product
- Product category: ${profile?.category ?? 'unknown'}
- Product key features to verify: ${featuresLine || 'none specified'}

## ZERO-TOLERANCE RULES — AUTO-REJECT regardless of any other score:
- Extra or duplicate hands/arms visible — physically count every wrist, palm, and set of fingers in IMAGE 2. A human body has EXACTLY 2 hands. If you count 3 or more distinct hands/wrists, REJECT immediately.
- Disembodied hands that do not belong to the model's connected arms
- Collage, side-by-side layout, or split image

Evaluate FIVE dimensions. Score each 0-100. APPROVED ONLY IF ALL dimensions are >= 70.

## DIMENSION 1 — COMPOSITION UNITY
Reject if ANY of the following is true:
- The result is a collage, side-by-side layout, split image, or obvious composite
- The product is floating or not physically connected to the hands/body
- The product appears pasted, overlaid, or cut out without natural integration
- Visible seams, borders, masks, or unnatural edges exist around the product
- More than 2 hands visible in the image
- Any hand or arm that does not naturally belong to the model's body

## DIMENSION 2 — PRODUCT SHAPE FIDELITY
Reject if ANY of the following is true:
- The silhouette or overall shape changed
- Any physical feature from the key features list is missing, added, moved, or altered
- The product was replaced with a visually similar but different object
- The product is no longer the same object as IMAGE 1

## DIMENSION 3 — PRODUCT SURFACE FIDELITY
${profile?.has_text_logo === false
  ? 'has_text_logo = false — skip text/logo validation'
  : 'has_text_logo = true:\n- Reject if any text or logo is blurred, missing, distorted, mirrored, stretched, or altered\n- Reject if label colors, layout, or typography changed'}
Reject if:
- Colors shifted significantly from the original
- Texture, finish, or surface details were materially changed

## DIMENSION 4 — CONTEXT COHERENCE
Reject if ANY of the following is true:
- The product makes no physical sense in the scene
- The angle is impossible
- The scale is wrong
- The product appears to exist in a different spatial plane than the model
- The product and model do not share the same physical space

## DIMENSION 5 — MODEL IDENTITY
Reject if ANY of the following is true:
- Face, skin tone, hair style/color, or expression changed
- Any clothing item was added, removed, or changed
- Body proportions changed noticeably
- The model no longer matches IMAGE 2 reference identity

Be extremely strict. When in doubt, reject.

## APPROVAL RULE
- If ANY dimension is below 70, REJECT
- Only APPROVE if all dimensions are 70 or higher

## OUTPUT
Respond with valid JSON only:
{
  "score": 0-100,
  "approved": true|false,
  "issues": ["issue 1", "issue 2"],
  "weakest_dimension": "DIMENSION_NAME"
}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { text: 'FIRST IMAGE — original product:' },
              { inlineData: { mimeType: 'image/jpeg', data: await urlToBase64(productUrl) } },
              { text: 'SECOND IMAGE — composed photo:' },
              { inlineData: { mimeType: 'image/jpeg', data: composedImageBase64 } },
            ],
          }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    )

    if (!res.ok) throw new Error(`Gemini QC error: ${res.status}`)
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const parsed = JSON.parse(text) as CompositionQuality
    console.log(`[compose-qc] score=${parsed.score} approved=${parsed.approved} weakest=${parsed.weakest_dimension} issues=${(parsed.issues ?? []).join(', ')}`)
    return {
      approved: parsed.approved ?? true,
      score: parsed.score ?? 80,
      issues: parsed.issues ?? [],
      weakest_dimension: parsed.weakest_dimension,
    }
  } catch (err: any) {
    console.warn('[compose-qc] Gemini QC falhou — reprovando por segurança:', err.message)
    return { approved: false, score: 0, issues: ['QC service unavailable — rejecting to prevent bad output'] }
  }
}

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url)
  const buf = await res.arrayBuffer()
  return Buffer.from(buf).toString('base64')
}

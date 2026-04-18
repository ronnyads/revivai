
export const UGC_POSITIONS = {
  // 1. CLOSE-UP ROSTO (Engagement)
  rosto_close: {
    prompt: `Rosto bem próximo, close-up, olhando para câmera, expressão de surpresa/felicidade, mesma modelo, fundo desfocado`,
    description: 'Close-up rosto - máxima emoção'
  },
  
  // 2. ROSTO DE LADO (Elegância)
  rosto_lado: {
    prompt: `Rosto de perfil/lado, olhando para frente pensativa, mesma modelo, cabelo visível, fundo neutro profissional`,
    description: 'Perfil rosto - elegância'
  },
  
  // 3. MEIA POSE (Produto em Mão)
  meia_pose_produto: {
    prompt: `Meia pose, mão indicando para frente com palma aberta em primeiro plano, rosto visível sorrindo, fundo estúdio branco, lighting profissional`,
    description: 'Meia pose com produto - CTA'
  },
  
  // 4. CORPO INTEIRO DE PÉ (Full Body)
  corpo_inteiro_pe: {
    prompt: `Corpo inteiro de pé, postura confiante, mão na cintura, sorrisso natural, fundo minimalista branco`,
    description: 'Corpo inteiro - confiança'
  },
  
  // 5. CORPO INTEIRO SENTADA (Casual)
  corpo_inteiro_sentada: {
    prompt: `Corpo inteiro sentada em cadeira moderna, relaxada, olhando para câmera, pose natural confortável, fundo warm acolhedor`,
    description: 'Corpo inteiro sentada - casual'
  },
  
  // 6. MOVIMENTO/DINÂMICA (Ação)
  movimento_dinamica: {
    prompt: `Corpo em movimento dinâmico, cabelo esvoaçante, mãos em gesto de caminhada, expressão energética, fundo rua moderna dia`,
    description: 'Movimento dinâmico - energia'
  },
  
  // 7. PLANO AMERICANO (Cintura Para Cima)
  plano_americano: {
    prompt: `Plano americano cintura para cima, cruzando os braços, rosto visível natural, fundo escritório moderno de vidro`,
    description: 'Plano americano - profissional'
  },
  
  // 8. DETALHE MÃOS FOCUS (Macro)
  detalhe_maos_produto: {
    prompt: `Plano detalhe nas mãos segurando as pontas de um objeto imaginário, rosto visível ao fundo com desfoque bokeh suave, lighting natural cinematográfico`,
    description: 'Detalhe mãos - foco produto'
  }
}

export async function generateUGCPositions(params: {
  sourceUrl: string
  userId: string
  assetId: string
}) {
  const admin = createAdminClient()
  
  console.log('[studio] Downloading source for UGC Positions...')
  const imgRes = await fetch(params.sourceUrl)
  if (!imgRes.ok) throw new Error('Falha ao baixar imagem base para posições UGC')
  const buffer = Buffer.from(await imgRes.arrayBuffer())
  const base64 = buffer.toString('base64')

  const vertexKey = process.env.GOOGLE_VERTEX_KEY
  const projectId = process.env.VERTEX_PROJECT_ID || 'project-9e7b4eec-0111-46d8-ae0'
  const location = process.env.VERTEX_LOCATION || 'us-central1'
  if (!vertexKey) throw new Error('GOOGLE_VERTEX_KEY não encontrada.')
  const vertexToken = await getVertexAccessToken(vertexKey)

  const vertexUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-capability-001:predict`

  console.log('[studio] Starting Parallel Generation of 8 UGC Positions using Vertex AI...')
  
  const positions = await Promise.all(
    Object.entries(UGC_POSITIONS).map(async ([posKey, posConfig]) => {
      try {
        const payload = {
          instances: [{
            prompt: `A photorealistic UGC style shot of the person[1]. ${posConfig.prompt}. MUST be the exact same person. High quality, cinematic lighting.`,
            referenceImages: [
              {
                referenceId: 1,
                referenceType: "REFERENCE_TYPE_RAW",
                referenceImage: {
                  bytesBase64Encoded: base64,
                  mimeType: 'image/jpeg'
                }
              }
            ]
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '9:16',
            addWatermark: false,
            safetyFilterLevel: 'BLOCK_ONLY_HIGH',
            personGeneration: 'ALLOW_ALL'
          }
        }

        const response = await fetch(vertexUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${vertexToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errText = await response.text()
          console.error(`[${posKey}] Error:`, errText)
          return null
        }

        const result = await response.json()
        const imageBase64 = result.predictions?.[0]?.bytesBase64Encoded
        if (!imageBase64) return null

        const imgBuf = Buffer.from(imageBase64, 'base64')
        const path = `${params.userId}/${params.assetId}-${posKey}.jpg`
        const { error } = await admin.storage.from('studio').upload(path, imgBuf, {
          contentType: 'image/jpeg',
          upsert: true
        })

        if (error) {
          console.error(`[${posKey}] Upload Error:`, error)
          return null
        }

        const { data: { publicUrl } } = admin.storage.from('studio').getPublicUrl(path)
        
        return {
          position: posKey,
          description: posConfig.description,
          url: publicUrl,
          status: 'success'
        }

      } catch (error: any) {
        console.error(`[${posKey}] Error:`, error.message)
        return { position: posKey, status: 'failed', error: error.message }
      }
    })
  )

  return positions.filter(p => p && p.status === 'success')
}

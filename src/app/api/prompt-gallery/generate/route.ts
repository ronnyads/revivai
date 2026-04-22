export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { composeProductScene, generatePresetIdentityScene } from '@/lib/studio'
import { getDefaultPromptTemplateById, normalizePromptTemplate, type PromptTemplateRow } from '@/lib/prompt-gallery'

function buildHiddenIdentityScenePrompt(templateTitle: string, templatePrompt: string, useTemplateOutfit: boolean) {
  const outfitInstructions = useTemplateOutfit
    ? [
        'Use a roupa da imagem-base, não a roupa da pessoa enviada.',
        'Preserve roupa, fantasia, uniforme, acessórios, cores, tecidos, caimento e todos os detalhes visíveis do personagem principal da imagem-base.',
        'Não copie camiseta, vestido, acessórios ou qualquer peça da foto enviada.',
      ]
    : [
        'Não altere a roupa da pessoa enviada: preserve tipo de peça, cor, textura, caimento, mangas, decote, estampas, acessórios e detalhes visíveis.',
        'Não invente fantasia, uniforme, traje de personagem, roupa premium ou roupa nova.',
      ]

  return [
    'Use a PRIMEIRA imagem como cena-base absoluta.',
    'Mantenha a composição, enquadramento, posição corporal, pose, gestos, distância de câmera, ângulo de câmera, fundo, personagens secundários, objetos e atmosfera da imagem-base.',
    'Use a foto enviada como referência exclusiva da nova pessoa principal.',
    'Substitua somente o indivíduo principal da imagem-base pela pessoa da foto enviada.',
    ...outfitInstructions,
    'Não mude a pose, posição, perspectiva, lente, distância focal ou ângulo da cena-base.',
    'Não troque o fundo.',
    'Não simplifique para retrato solo.',
    'Não remover personagens secundários.',
    'A saída deve parecer a mesma foto-base, apenas com a pessoa principal substituída.',
    `Preset selecionado: ${templateTitle}.`,
    `Direção criativa adicional: ${templatePrompt}`,
  ].join(' ')
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const templateId = String(body?.templateId ?? '').trim()
  const uploadedUrls = Array.isArray(body?.uploadedUrls)
    ? body.uploadedUrls.filter((url: unknown) => typeof url === 'string' && url.startsWith('http'))
    : []

  if (!templateId) {
    return NextResponse.json({ error: 'templateId obrigatório.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('prompt_templates')
    .select('*')
    .eq('id', templateId)
    .maybeSingle()

  const template = row
    ? normalizePromptTemplate(row as PromptTemplateRow)
    : getDefaultPromptTemplateById(templateId)

  if (!template || !template.isVisible) {
    return NextResponse.json({ error: 'Preset não encontrado.' }, { status: 404 })
  }

  if (uploadedUrls.length < template.requiredImagesCount) {
    return NextResponse.json(
      { error: `Envie ${template.requiredImagesCount} imagem(ns) para continuar.` },
      { status: 400 },
    )
  }

  const { data: profile } = await admin
    .from('users')
    .select('credits')
    .eq('id', user.id)
    .single()

  if (!profile || Number(profile.credits ?? 0) < template.creditCost) {
    return NextResponse.json(
      { error: `Saldo insuficiente. Necessário ${template.creditCost} cr.` },
      { status: 402 },
    )
  }

  const photoId = randomUUID()
  const originalUrl = uploadedUrls[0] ?? ''

  const { error: insertError } = await admin
    .from('photos')
    .insert({
      id: photoId,
      user_id: user.id,
      original_url: originalUrl,
      status: 'processing',
      model_used: `prompt-gallery:${template.id}`,
      diagnosis: template.title,
      damage_analysis: {
        source: 'prompt-gallery',
        template_id: template.id,
      title: template.title,
      generation_mode: template.generationMode,
      identity_lock: template.identityLock,
      outfit_source: template.outfitSource,
      },
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  try {
    await admin.rpc('debit_credits_bulk', {
      user_id_param: user.id,
      amount_param: template.creditCost,
    })
  } catch (chargeError: unknown) {
    await admin.from('photos').delete().eq('id', photoId).eq('user_id', user.id)
    const message = chargeError instanceof Error ? chargeError.message : 'Falha ao processar créditos.'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  try {
    const generationAssetId = randomUUID()
    let resultUrl = ''

    if (template.generationMode === 'product_model') {
      resultUrl = await composeProductScene({
        portrait_url: uploadedUrls[0] ?? '',
        product_url: uploadedUrls[1] ?? '',
        compose_mode: 'gemini',
        position: 'southeast',
        product_scale: 0.35,
        smart_prompt: template.prompt,
        assetId: generationAssetId,
        userId: user.id,
      })
    } else if (template.generationMode === 'virtual_tryon') {
      resultUrl = await composeProductScene({
        portrait_url: uploadedUrls[0] ?? '',
        product_url: uploadedUrls[1] ?? '',
        compose_mode: 'gemini',
        position: 'southeast',
        product_scale: 0.35,
        smart_prompt: template.prompt,
        assetId: generationAssetId,
        userId: user.id,
      })
    } else {
      const templateSceneUrl = template.coverImageUrl || template.exampleImages[0]

      const useTemplateOutfit = template.outfitSource === 'template'

      resultUrl = await generatePresetIdentityScene({
        template_scene_url: templateSceneUrl,
        identity_reference_urls: uploadedUrls,
        scene_prompt: buildHiddenIdentityScenePrompt(template.title, template.prompt, useTemplateOutfit),
        aspect_ratio: '9:16',
        assetId: generationAssetId,
        userId: user.id,
        outfit_source: useTemplateOutfit ? 'template' : 'identity',
      })
    }

    await admin
      .from('photos')
      .update({
        status: 'done',
        restored_url: resultUrl,
        diagnosis: `${template.title} concluído`,
      })
      .eq('id', photoId)
      .eq('user_id', user.id)

    return NextResponse.json({
      photoId,
      resultUrl,
      originalUrl,
      creditsUsed: template.creditCost,
    })
  } catch (generationError: unknown) {
    const message =
      generationError instanceof Error ? generationError.message : 'Falha ao gerar a imagem.'

    await admin
      .from('photos')
      .update({
        status: 'error',
        diagnosis: `Erro no preset ${template.title}`,
        restored_url: `❌ ${message}`,
      })
      .eq('id', photoId)
      .eq('user_id', user.id)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

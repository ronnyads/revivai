export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { insertPhotoCompat, updatePhotoCompat } from '@/lib/photos-schema-compat'
import { composeProductScene, generatePresetIdentityScene } from '@/lib/studio'
import { getDefaultPromptTemplateById, normalizePromptTemplate, type PromptTemplateRow } from '@/lib/prompt-gallery'
import {
  VERTEX_ANALYSIS_MODEL_ID,
  VERTEX_IDENTITY_SCENE_PRIMARY_MODEL_ID,
  getPromptEngineBadge,
  getPromptRuntimeModelId,
  resolvePromptEngineProfile,
  type VertexEngineProfile,
} from '@/lib/vertex-engines'

type PromptGalleryBranch = 'product_model' | 'virtual_tryon' | 'scene_identity'
type PromptGalleryErrorCode =
  | 'billing_failed'
  | 'generation_failed'
  | 'invalid_reference'
  | 'no_image_output'
  | 'provider_blocked'
  | 'provider_unavailable'
  | 'upload_failed'

type PromptGalleryPublicError = {
  code: PromptGalleryErrorCode
  message: string
  technicalMessage: string
}

function buildHiddenIdentityScenePrompt(templateTitle: string, templatePrompt: string, useTemplateOutfit: boolean) {
  const outfitInstructions = useTemplateOutfit
    ? [
        'Use a roupa da imagem-base, nao a roupa da pessoa enviada.',
        'Preserve roupa, fantasia, uniforme, acessorios, cores, tecidos, caimento e todos os detalhes visiveis do personagem principal da imagem-base.',
        'Nao copie camiseta, vestido, acessorios ou qualquer peca da foto enviada.',
      ]
    : [
        'Nao altere a roupa da pessoa enviada: preserve tipo de peca, cor, textura, caimento, mangas, decote, estampas, acessorios e detalhes visiveis.',
        'Nao invente fantasia, uniforme, traje de personagem, roupa premium ou roupa nova.',
      ]

  return [
    'Use a PRIMEIRA imagem como cena-base absoluta.',
    'Mantenha a composicao, enquadramento, posicao corporal, pose, gestos, distancia de camera, angulo de camera, fundo, personagens secundarios, objetos e atmosfera da imagem-base.',
    'Use a foto enviada como referencia exclusiva da nova pessoa principal.',
    'Substitua somente o individuo principal da imagem-base pela pessoa da foto enviada.',
    ...outfitInstructions,
    'Nao mude a pose, posicao, perspectiva, lente, distancia focal ou angulo da cena-base.',
    'Nao troque o fundo.',
    'Nao simplifique para retrato solo.',
    'Nao remover personagens secundarios.',
    'A saida deve parecer a mesma foto-base, apenas com a pessoa principal substituida.',
    `Preset selecionado: ${templateTitle}.`,
    `Direcao criativa adicional: ${templatePrompt}`,
  ].join(' ')
}

function logPromptGallery(
  stage: string,
  payload: Record<string, unknown>,
  level: 'info' | 'error' = 'info',
) {
  const line = `[prompt-gallery] ${JSON.stringify({ stage, ...payload })}`
  if (level === 'error') {
    console.error(line)
    return
  }
  console.log(line)
}

function resolvePromptGalleryBranch(generationMode: string): PromptGalleryBranch {
  if (generationMode === 'product_model') return 'product_model'
  if (generationMode === 'virtual_tryon') return 'virtual_tryon'
  return 'scene_identity'
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function classifyPromptGalleryError(error: unknown): PromptGalleryPublicError {
  const promptGalleryError =
    error && typeof error === 'object'
      ? error as {
          promptGalleryCode?: unknown
          promptGalleryUserMessage?: unknown
          message?: unknown
        }
      : {}

  const codeFromError =
    typeof promptGalleryError.promptGalleryCode === 'string'
      ? promptGalleryError.promptGalleryCode
      : ''
  const userMessageFromError =
    typeof promptGalleryError.promptGalleryUserMessage === 'string'
      ? promptGalleryError.promptGalleryUserMessage
      : ''

  if (codeFromError && userMessageFromError) {
    return {
      code: codeFromError as PromptGalleryErrorCode,
      message: userMessageFromError,
      technicalMessage: getErrorMessage(error),
    }
  }

  const technicalMessage = getErrorMessage(error)
  const normalized = technicalMessage.toLowerCase()

  if (/download falhou|url da cena-base|url da cena base|referencia do cliente|referencia invalida|envie arquivos validos|imagem-base invalida/.test(normalized)) {
    return {
      code: 'invalid_reference',
      message: 'Nao conseguimos ler uma das imagens desse preset. Envie referencias validas e tente novamente.',
      technicalMessage,
    }
  }

  if (/blocked|policy|safety|seguranca google|conteudo bloqueado/.test(normalized)) {
    return {
      code: 'provider_blocked',
      message: 'Esse preset foi bloqueado pelo provedor de imagem. Tente outra referencia ou outro preset.',
      technicalMessage,
    }
  }

  if (/upload falhou|falhou ao salvar|salvar o resultado final/.test(normalized)) {
    return {
      code: 'upload_failed',
      message: 'A imagem foi gerada, mas falhou ao salvar o resultado final. Tente novamente.',
      technicalMessage,
    }
  }

  if (/sem imagem|nao retornou imagem|nao retornou uma imagem|sem resulturl|terminou sem resulturl/.test(normalized)) {
    return {
      code: 'no_image_output',
      message: 'A geracao terminou sem uma imagem valida. Tente novamente.',
      technicalMessage,
    }
  }

  if (/vertex|google|flux|quota|429|503|502|500|network|fetch failed|timeout|temporar|temporari|provider/.test(normalized)) {
    return {
      code: 'provider_unavailable',
      message: 'Tivemos uma falha temporaria ao gerar esse preset. Tente novamente em instantes.',
      technicalMessage,
    }
  }

  return {
    code: 'generation_failed',
    message: 'Nao foi possivel gerar essa imagem agora. Tente novamente.',
    technicalMessage,
  }
}

function buildDamageAnalysis(params: {
  templateId: string
  templateTitle: string
  generationMode: string
  identityLock: boolean
  outfitSource: string
  engineProfile: VertexEngineProfile
  selectedModelId: string
  renderModelId?: string
  strategy?: string
  branch: PromptGalleryBranch
  debugId?: string
  errorCode?: string
  errorMessage?: string
  refunded?: boolean
  refundReason?: string
  technicalMessage?: string
}) {
  return {
    source: 'prompt-gallery',
    template_id: params.templateId,
    title: params.templateTitle,
    generation_mode: params.generationMode,
    identity_lock: params.identityLock,
    outfit_source: params.outfitSource,
    provider: 'vertex',
    engine_profile: params.engineProfile,
    engine_label: getPromptEngineBadge(params.engineProfile),
    target_model_id: params.selectedModelId,
    render_model_id: params.renderModelId,
    generation_strategy: params.strategy,
    prompt_branch: params.branch,
    support_debug_id: params.debugId,
    public_error_code: params.errorCode,
    public_error_message: params.errorMessage,
    credit_refunded: params.refunded,
    credit_refund_reason: params.refundReason,
    technical_error_message: params.technicalMessage,
  }
}

async function refundPromptGalleryCredits(params: {
  admin: ReturnType<typeof createAdminClient>
  userId: string
  amount: number
  debugId: string
  photoId: string
}) {
  const { error } = await params.admin.rpc('add_credits', {
    user_id_param: params.userId,
    amount: params.amount,
  })

  if (error) {
    logPromptGallery('refund_failure', {
      debugId: params.debugId,
      photoId: params.photoId,
      message: error.message,
      amount: params.amount,
    }, 'error')
    return {
      refunded: false,
      refundErrorMessage: error.message,
    }
  }

  logPromptGallery('refund_success', {
    debugId: params.debugId,
    photoId: params.photoId,
    amount: params.amount,
  })
  return {
    refunded: true,
    refundErrorMessage: null,
  }
}

function buildFailureResponse(params: {
  status: number
  debugId: string
  refunded: boolean
  promptError: PromptGalleryPublicError
  refundErrorMessage?: string | null
}) {
  const message = params.refunded
    ? params.promptError.message
    : `${params.promptError.message} Nao conseguimos devolver os creditos automaticamente agora. Se precisar, informe o codigo ${params.debugId}.`

  return NextResponse.json({
    error: message,
    code: params.promptError.code,
    debugId: params.debugId,
    refunded: params.refunded,
    refundError: params.refundErrorMessage ?? undefined,
  }, { status: params.status })
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
  const debugId = `prompt_${randomUUID().slice(0, 8)}`
  const templateId = String(body?.templateId ?? '').trim()
  const uploadedUrls = Array.isArray(body?.uploadedUrls)
    ? body.uploadedUrls.filter((url: unknown) => typeof url === 'string' && url.startsWith('http'))
    : []

  logPromptGallery('request_received', {
    debugId,
    userId: user.id,
    templateId,
    uploadedCount: uploadedUrls.length,
  })

  if (!templateId) {
    return NextResponse.json({ error: 'templateId obrigatorio.' }, { status: 400 })
  }

  const admin = createAdminClient()
  logPromptGallery('template_lookup', { debugId, templateId })
  const { data: row } = await admin
    .from('prompt_templates')
    .select('*')
    .eq('id', templateId)
    .maybeSingle()

  const template = row
    ? normalizePromptTemplate(row as PromptTemplateRow)
    : getDefaultPromptTemplateById(templateId)

  if (!template || !template.isVisible) {
    return NextResponse.json({ error: 'Preset nao encontrado.' }, { status: 404 })
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
      { error: `Saldo insuficiente. Necessario ${template.creditCost} cr.` },
      { status: 402 },
    )
  }

  const photoId = randomUUID()
  const originalUrl = uploadedUrls[0] ?? ''
  const engineProfile = resolvePromptEngineProfile(template.generationMode, template.engineProfile)
  const runtimeModelId = getPromptRuntimeModelId(template.generationMode, engineProfile)
  const selectedModelId = template.generationMode === 'identity_scene'
    ? VERTEX_IDENTITY_SCENE_PRIMARY_MODEL_ID
    : runtimeModelId
  const branch = resolvePromptGalleryBranch(template.generationMode)
  const baseDamageAnalysis = buildDamageAnalysis({
    templateId: template.id,
    templateTitle: template.title,
    generationMode: template.generationMode,
    identityLock: template.identityLock,
    outfitSource: template.outfitSource,
    engineProfile,
    selectedModelId,
    renderModelId: runtimeModelId,
    strategy: template.generationMode === 'identity_scene' ? 'scene_identity_edit_pending' : branch,
    branch,
  })

  logPromptGallery('photo_insert_start', {
    debugId,
    photoId,
    templateId: template.id,
    branch,
    generationMode: template.generationMode,
    engineProfile,
    selectedModelId,
    runtimeModelId,
  })

  const { error: insertError } = await insertPhotoCompat({
    client: admin,
    payload: {
      id: photoId,
      user_id: user.id,
      original_url: originalUrl,
      status: 'processing',
      model_used: `prompt-gallery:${template.id}`,
      engine_profile: engineProfile,
      analysis_model_id: VERTEX_ANALYSIS_MODEL_ID,
      render_model_id: runtimeModelId,
      diagnosis: template.title,
      damage_analysis: baseDamageAnalysis,
    },
  })

  if (insertError) {
    logPromptGallery('photo_insert_failure', {
      debugId,
      photoId,
      templateId: template.id,
      message: insertError.message,
    }, 'error')
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  logPromptGallery('credits_debit_start', {
    debugId,
    photoId,
    amount: template.creditCost,
  })

  const { error: debitError } = await admin.rpc('debit_credits_bulk', {
    user_id_param: user.id,
    amount_param: template.creditCost,
  })

  if (debitError) {
    await admin.from('photos').delete().eq('id', photoId).eq('user_id', user.id)
    logPromptGallery('credits_debit_failure', {
      debugId,
      photoId,
      amount: template.creditCost,
      message: debitError.message,
    }, 'error')
    return NextResponse.json({
      error: 'Nao foi possivel processar os creditos desse preset.',
      code: 'billing_failed',
      debugId,
      refunded: false,
    }, { status: 500 })
  }

  try {
    const generationAssetId = randomUUID()
    let resultUrl = ''
    let renderModelId = runtimeModelId
    let generationStrategy: string = branch

    logPromptGallery('generation_start', {
      debugId,
      photoId,
      generationAssetId,
      branch,
      templateId: template.id,
      generationMode: template.generationMode,
      engineProfile,
      selectedModelId,
      runtimeModelId,
      targetModelId: selectedModelId,
      uploadedCount: uploadedUrls.length,
    })

    if (template.generationMode === 'product_model') {
      const composeResult = await composeProductScene({
        portrait_url: uploadedUrls[0] ?? '',
        product_url: uploadedUrls[1] ?? '',
        product_urls: uploadedUrls.slice(1, 4),
        compose_mode: 'vertex',
        compose_variant: 'product',
        engine_profile: engineProfile,
        model_override: runtimeModelId,
        position: 'southeast',
        product_scale: 0.35,
        aspect_ratio: '9:16',
        smart_prompt: template.prompt,
        assetId: generationAssetId,
        userId: user.id,
      })
      resultUrl = composeResult.url
      renderModelId = String(composeResult.extraData?.render_model_id ?? runtimeModelId)
    } else if (template.generationMode === 'virtual_tryon') {
      const composeResult = await composeProductScene({
        portrait_url: uploadedUrls[0] ?? '',
        product_url: uploadedUrls[1] ?? '',
        product_urls: uploadedUrls.slice(1, 4),
        compose_mode: 'vertex',
        compose_variant: 'fitting',
        engine_profile: engineProfile,
        position: 'southeast',
        product_scale: 0.35,
        aspect_ratio: '9:16',
        fitting_pose_preset: 'three-quarter',
        fitting_energy_preset: 'natural',
        smart_prompt: template.prompt,
        assetId: generationAssetId,
        userId: user.id,
      })
      resultUrl = composeResult.url
      renderModelId = String(composeResult.extraData?.render_model_id ?? runtimeModelId)
    } else {
      const templateSceneUrl = template.coverImageUrl || template.exampleImages[0]
      const useTemplateOutfit = template.outfitSource === 'template'

      const presetResult = await generatePresetIdentityScene({
        template_scene_url: templateSceneUrl,
        identity_reference_urls: uploadedUrls,
        scene_prompt: buildHiddenIdentityScenePrompt(template.title, template.prompt, useTemplateOutfit),
        aspect_ratio: '9:16',
        assetId: generationAssetId,
        userId: user.id,
        outfit_source: useTemplateOutfit ? 'template' : 'identity',
        engine_profile: engineProfile,
        model_override: runtimeModelId,
      })
      resultUrl = presetResult.url
      renderModelId = presetResult.modelUsed
      generationStrategy = presetResult.strategyUsed
    }

    if (!resultUrl.trim()) {
      throw new Error('Fluxo de prompts terminou sem resultUrl.')
    }

    const successDamageAnalysis = buildDamageAnalysis({
      templateId: template.id,
      templateTitle: template.title,
      generationMode: template.generationMode,
      identityLock: template.identityLock,
      outfitSource: template.outfitSource,
      engineProfile,
      selectedModelId,
      renderModelId,
      strategy: generationStrategy,
      branch,
    })

    await updatePhotoCompat({
      client: admin,
      payload: {
        status: 'done',
        restored_url: resultUrl,
        render_model_id: renderModelId,
        damage_analysis: successDamageAnalysis,
        diagnosis: `${template.title} concluido`,
      },
      filters: [
        { column: 'id', value: photoId },
        { column: 'user_id', value: user.id },
      ],
    })

    logPromptGallery('generation_success', {
      debugId,
      photoId,
      branch,
      renderModelId,
      resultUrl,
    })

    return NextResponse.json({
      photoId,
      resultUrl,
      originalUrl,
      creditsUsed: template.creditCost,
    })
  } catch (generationError: unknown) {
    const promptError = classifyPromptGalleryError(generationError)
    logPromptGallery('generation_failure', {
      debugId,
      photoId,
      branch,
      templateId: template.id,
      code: promptError.code,
      technicalMessage: promptError.technicalMessage,
    }, 'error')

    const refundResult = await refundPromptGalleryCredits({
      admin,
      userId: user.id,
      amount: template.creditCost,
      debugId,
      photoId,
    })

    const failureDamageAnalysis = buildDamageAnalysis({
      templateId: template.id,
      templateTitle: template.title,
      generationMode: template.generationMode,
      identityLock: template.identityLock,
      outfitSource: template.outfitSource,
      engineProfile,
      selectedModelId,
      renderModelId: runtimeModelId,
      branch,
      debugId,
      errorCode: promptError.code,
      errorMessage: promptError.message,
      refunded: refundResult.refunded,
      refundReason: `prompt-gallery:${promptError.code}`,
      technicalMessage: promptError.technicalMessage,
    })

    await updatePhotoCompat({
      client: admin,
      payload: {
        status: 'error',
        diagnosis: `Erro no preset ${template.title}`,
        restored_url: `ERROR: ${promptError.message}`,
        damage_analysis: failureDamageAnalysis,
      },
      filters: [
        { column: 'id', value: photoId },
        { column: 'user_id', value: user.id },
      ],
    })

    return buildFailureResponse({
      status: 500,
      debugId,
      refunded: refundResult.refunded,
      promptError,
      refundErrorMessage: refundResult.refundErrorMessage,
    })
  }
}

export type StudioPublicErrorCode =
  | 'nao_conseguimos_vestir_esse_look'
  | 'precisamos_de_uma_foto_mais_limpa'
  | 'tentando_novamente_nos_bastidores'
  | 'resultado_pronto_para_revisao'
  | 'falha_na_geracao'

export type StudioPublicErrorEnvelope = {
  code: StudioPublicErrorCode
  title: string
  message: string
  supportDebugId?: string
}

const DEFAULT_PUBLIC_ERRORS: Record<StudioPublicErrorCode, Omit<StudioPublicErrorEnvelope, 'supportDebugId'>> = {
  nao_conseguimos_vestir_esse_look: {
    code: 'nao_conseguimos_vestir_esse_look',
    title: 'Nao conseguimos vestir esse look',
    message: 'Tivemos uma falha temporaria ao montar esse look. Voce pode tentar de novo sem refazer tudo.',
  },
  precisamos_de_uma_foto_mais_limpa: {
    code: 'precisamos_de_uma_foto_mais_limpa',
    title: 'Precisamos de uma foto mais limpa',
    message: 'Nao conseguimos separar o look com seguranca nessa imagem. Uma foto mais limpa ou referencias separadas ajudam bastante.',
  },
  tentando_novamente_nos_bastidores: {
    code: 'tentando_novamente_nos_bastidores',
    title: 'Tentando novamente nos bastidores',
    message: 'Estamos ajustando a peca principal e tentando recuperar o resultado automaticamente.',
  },
  resultado_pronto_para_revisao: {
    code: 'resultado_pronto_para_revisao',
    title: 'Resultado pronto para revisao',
    message: 'Preparamos as pecas principais para voce seguir com um look mais estavel em um clique.',
  },
  falha_na_geracao: {
    code: 'falha_na_geracao',
    title: 'Falha na geracao',
    message: 'Nao conseguimos gerar este card agora. Tente novamente em instantes.',
  },
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function getDefaultStudioPublicError(code: StudioPublicErrorCode = 'falha_na_geracao'): StudioPublicErrorEnvelope {
  return { ...DEFAULT_PUBLIC_ERRORS[code] }
}

export function resolveStudioPublicError(input: {
  code?: unknown
  title?: unknown
  message?: unknown
  supportDebugId?: unknown
  fallbackCode?: StudioPublicErrorCode
}): StudioPublicErrorEnvelope {
  const requestedCode = asNonEmptyString(input.code) as StudioPublicErrorCode | undefined
  const fallbackCode = input.fallbackCode ?? 'falha_na_geracao'
  const safeCode = requestedCode && requestedCode in DEFAULT_PUBLIC_ERRORS
    ? requestedCode
    : fallbackCode
  const defaults = DEFAULT_PUBLIC_ERRORS[safeCode]

  return {
    code: safeCode,
    title: asNonEmptyString(input.title) ?? defaults.title,
    message: asNonEmptyString(input.message) ?? defaults.message,
    supportDebugId: asNonEmptyString(input.supportDebugId),
  }
}


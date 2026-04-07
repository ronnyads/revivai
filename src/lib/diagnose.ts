export type ReplicateModel =
  | 'nightmareai/real-esrgan'
  | 'sczhou/codeformer'
  | 'arielreplicate/deoldify'
  | 'stability-ai/stable-diffusion-inpainting'

export interface DiagnosisResult {
  model: ReplicateModel
  label: string
  description: string
  icon: string
}

// Simple heuristic diagnosis based on image metadata
// In production: use a vision model or Sharp analysis
export function diagnosePhoto(params: {
  isGrayscale?: boolean
  hasLowResolution?: boolean
  hasPhysicalDamage?: boolean
  hasDamagedFace?: boolean
}): DiagnosisResult {
  const { isGrayscale, hasLowResolution, hasPhysicalDamage, hasDamagedFace } = params

  if (isGrayscale) {
    return {
      model: 'arielreplicate/deoldify',
      label: 'Colorização',
      description: 'Foto em preto e branco detectada. Adicionaremos cores realistas.',
      icon: '🎨',
    }
  }

  if (hasDamagedFace) {
    return {
      model: 'sczhou/codeformer',
      label: 'Restauração de rosto',
      description: 'Rosto danificado detectado. Reconstruiremos com precisão.',
      icon: '👤',
    }
  }

  if (hasPhysicalDamage) {
    return {
      model: 'stability-ai/stable-diffusion-inpainting',
      label: 'Remoção de danos',
      description: 'Rasgos ou manchas detectados. Eliminaremos com IA generativa.',
      icon: '✦',
    }
  }

  // Default: upscale
  return {
    model: 'nightmareai/real-esrgan',
    label: 'Upscaling',
    description: 'Aumentaremos a resolução em até 4x com preservação de detalhes.',
    icon: '📐',
  }
}

export const MODEL_VERSIONS: Record<ReplicateModel, string> = {
  'nightmareai/real-esrgan': 'nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd374',
  'sczhou/codeformer': 'sczhou/codeformer:7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53142edd9d2cd56',
  'arielreplicate/deoldify': 'arielreplicate/deoldify:0da600fab0c45a66211339f1c16b71345d22f26ef5fea3dfa1bb0ad586485d04',
  'stability-ai/stable-diffusion-inpainting': 'stability-ai/stable-diffusion-inpainting:95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3',
}

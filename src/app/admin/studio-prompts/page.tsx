export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { upsertStudioPrompt } from './actions'

const PROMPT_GROUPS: {
  label: string
  card: string
  color: string
  items: { key: string; label: string; description: string; rows: number; vars?: string }[]
}[] = [
  {
    label: 'Modelo UGC',
    card: 'model',
    color: 'border-indigo-500/30 bg-indigo-500/5',
    items: [
      {
        key: 'model_generation_system',
        label: '🧠 System GPT-4o — Descrição visual',
        description: 'Instrução do GPT-4o para gerar a descrição textual única do modelo. O seed de unicidade e os atributos do usuário (gênero, tom de pele etc.) são injetados automaticamente após este prompt.',
        rows: 7,
      },
      {
        key: 'model_flux_suffix',
        label: '📸 Sufixo FLUX — Estilo fotográfico',
        description: 'Texto adicionado após a descrição do modelo para guiar o FLUX na geração da foto. Controla o estilo de câmera, iluminação e autenticidade UGC.',
        rows: 3,
      },
    ],
  },
  {
    label: 'Script UGC',
    card: 'script',
    color: 'border-pink-500/30 bg-pink-500/5',
    items: [
      {
        key: 'script_generation_system',
        label: '✍️ System GPT-4o — Copywriter UGC',
        description: 'Instrução base do copywriter. O formato (Reels/Stories/Feed) é concatenado automaticamente. Use para ajustar tom de voz, estilo de linguagem e estrutura do script.',
        rows: 6,
      },
    ],
  },
  {
    label: 'Imagem',
    card: 'image',
    color: 'border-violet-500/30 bg-violet-500/5',
    items: [
      {
        key: 'image_style_ugc',
        label: '🤳 Prefixo estilo UGC',
        description: 'Adicionado antes do prompt do usuário quando o preset é "UGC / Influencer". Defina o tom fotográfico da geração DALL-E.',
        rows: 2,
      },
      {
        key: 'image_style_product',
        label: '📦 Prefixo estilo Produto',
        description: 'Adicionado antes do prompt do usuário quando o preset é "Produto Realista".',
        rows: 2,
      },
      {
        key: 'image_style_logo',
        label: '🎨 Prefixo estilo Logo',
        description: 'Adicionado antes do prompt do usuário quando o preset é "Logo Profissional".',
        rows: 2,
      },
      {
        key: 'image_style_lifestyle',
        label: '🌿 Prefixo estilo Lifestyle',
        description: 'Adicionado antes do prompt do usuário quando o preset é "Imagem Aleatória / Lifestyle".',
        rows: 2,
      },
    ],
  },
  {
    label: 'Fusão UGC (Compose)',
    card: 'compose',
    color: 'border-orange-500/30 bg-orange-500/5',
    items: [
      {
        key: 'compose_gpt_prompt',
        label: '🖼️ Prompt GPT Image 1 — Composição com produto',
        description: 'Enviado ao GPT Image 1 junto com a foto da modelo e a foto do produto. Controla como o produto é inserido na cena (na mão, sobre a bancada etc.). Manter em inglês para melhores resultados.',
        rows: 8,
      },
    ],
  },
]

export default async function StudioPromptsPage() {
  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('studio_prompts')
    .select('key, value, updated_at')

  const promptMap: Record<string, string> = {}
  const updatedMap: Record<string, string> = {}
  for (const row of rows ?? []) {
    promptMap[row.key] = row.value
    updatedMap[row.key] = row.updated_at
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-normal tracking-tight mb-1">Prompts do Studio IA</h1>
        <p className="text-white/40 text-sm">
          Configure os prompts usados na geração de cada card. Alterações entram em vigor imediatamente — sem redeploy.
          Se o campo estiver vazio, o sistema usa o prompt padrão do código.
        </p>
      </div>

      <div className="flex flex-col gap-10">
        {PROMPT_GROUPS.map(group => (
          <div key={group.card}>
            <div className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border mb-4 ${group.color}`}>
              {group.label}
            </div>

            <div className="flex flex-col gap-6">
              {group.items.map(def => (
                <div key={def.key} className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-white mb-1">{def.label}</h2>
                    <p className="text-xs text-white/40 leading-relaxed">{def.description}</p>
                    {def.vars && (
                      <p className="text-[10px] text-amber-400/60 mt-1.5 font-mono">Variáveis: {def.vars}</p>
                    )}
                    {updatedMap[def.key] && (
                      <p className="text-[10px] text-white/20 mt-1">
                        Última edição: {new Date(updatedMap[def.key]).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>

                  <form action={upsertStudioPrompt} className="flex flex-col gap-3">
                    <input type="hidden" name="key" value={def.key} />
                    <textarea
                      name="value"
                      rows={def.rows}
                      defaultValue={promptMap[def.key] ?? ''}
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 resize-y font-mono leading-relaxed"
                      placeholder={`Deixe vazio para usar o padrão do código...`}
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-white/20">
                        {promptMap[def.key] ? '✅ Prompt customizado ativo' : '⚙️ Usando prompt padrão do código'}
                      </p>
                      <div className="flex items-center gap-3">
                        {promptMap[def.key] && (
                          <span className="text-[10px] text-white/30">{promptMap[def.key].length} chars</span>
                        )}
                        <button
                          type="submit"
                          className="bg-accent hover:bg-accent-dark text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 p-4 bg-zinc-800/60 border border-white/10 rounded-xl">
        <p className="text-xs text-white/50 font-medium mb-3">📋 Mapa de cards do Studio</p>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-white/30">
          <span>🧑 <strong className="text-white/50">Modelo UGC</strong> — GPT-4o + FLUX</span>
          <span>📝 <strong className="text-white/50">Script UGC</strong> — GPT-4o copywriter</span>
          <span>🖼️ <strong className="text-white/50">Imagem</strong> — DALL-E 3</span>
          <span>🎙️ <strong className="text-white/50">Voz</strong> — ElevenLabs (sem prompt)</span>
          <span>🎬 <strong className="text-white/50">Vídeo</strong> — Kling AI via Replicate</span>
          <span>✨ <strong className="text-white/50">Imitar Movimentos</strong> — Fal AI LivePortrait</span>
          <span>💋 <strong className="text-white/50">Lip Sync</strong> — Fal AI LatentSync</span>
          <span>🧩 <strong className="text-white/50">Fusão UGC</strong> — GPT Image 1</span>
          <span>🔍 <strong className="text-white/50">Upscale</strong> — Real-ESRGAN (sem prompt)</span>
          <span>📄 <strong className="text-white/50">Legenda</strong> — Whisper (sem prompt)</span>
          <span>🎞️ <strong className="text-white/50">Vídeo Final</strong> — merge áudio+vídeo (sem prompt)</span>
          <span>🔗 <strong className="text-white/50">Continuação</strong> — entrada do card Vídeo (last_frame_url)</span>
        </div>
      </div>
    </div>
  )
}

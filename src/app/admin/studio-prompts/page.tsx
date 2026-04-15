export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { upsertStudioPrompt } from './actions'

const PROMPT_DEFS = [
  {
    key: 'compose_vision_system',
    label: '🔍 Análise GPT-4o Vision (Fusão UGC)',
    description: 'GPT-4o analisa modelo + produto. O JSON de saída deve conter: model_desc, product_desc, pose_action (pose SEM mencionar o produto), scene_style, product_gravity (valor sharp: center/north/south/east/west/northeast/northwest/southeast/southwest).',
    rows: 14,
  },
  {
    key: 'compose_flux_template',
    label: '🎨 Template FLUX (cena sem produto)',
    description: 'FLUX gera a cena com a modelo em pose — sem o produto. O produto original é colado depois pelo sharp (pixel-perfect). Variáveis: {model_desc}, {pose_action}, {scene_style}.',
    rows: 6,
  },
  {
    key: 'model_generation_system',
    label: '🧑‍🎨 Geração de Modelo UGC',
    description: 'Prompt base usado na geração da foto do modelo UGC. Complementado com os atributos escolhidos pelo usuário.',
    rows: 6,
  },
]

export default async function StudioPromptsPage() {
  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('studio_prompts')
    .select('key, value, description, updated_at')

  const promptMap: Record<string, string> = {}
  for (const row of rows ?? []) promptMap[row.key] = row.value

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-normal tracking-tight mb-1">Prompts do Studio IA</h1>
        <p className="text-white/40 text-sm">
          Configure os prompts usados na geração do Ad Studio. Alterações entram em vigor imediatamente — sem redeploy.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {PROMPT_DEFS.map(def => (
          <div key={def.key} className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-white mb-1">{def.label}</h2>
              <p className="text-xs text-white/40">{def.description}</p>
              {rows?.find(r => r.key === def.key)?.updated_at && (
                <p className="text-[10px] text-white/20 mt-1">
                  Última edição: {new Date(rows!.find(r => r.key === def.key)!.updated_at).toLocaleString('pt-BR')}
                </p>
              )}
            </div>

            <form action={upsertStudioPrompt} className="flex flex-col gap-3">
              <input type="hidden" name="key" value={def.key} />
              <textarea
                name="value"
                rows={def.rows}
                defaultValue={promptMap[def.key] ?? ''}
                required
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 resize-y font-mono leading-relaxed"
                placeholder={`Prompt para ${def.label}...`}
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-white/20">
                  {promptMap[def.key] ? '✅ Prompt customizado ativo' : '⚙️ Usando prompt padrão do código'}
                </p>
                <button
                  type="submit"
                  className="bg-accent hover:bg-accent-dark text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <p className="text-xs text-amber-400/80 font-medium mb-1">💡 Variáveis disponíveis no template FLUX:</p>
        <code className="text-[11px] text-white/50 font-mono">
          {'{model_desc}'} · {'{pose_action}'} · {'{scene_style}'}
        </code>
        <p className="text-[10px] text-white/30 mt-2">O produto é sempre o original do cliente, colado pixel-perfect pelo sharp após a geração.</p>
      </div>
    </div>
  )
}

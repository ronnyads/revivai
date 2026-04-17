import { createAdminClient } from '@/lib/supabase/admin'
import { upsertStudioPrompt, upsertAllPromptsJSON } from './actions'
import BooleanSwitch from '@/components/admin/BooleanSwitch'

const PROMPT_GROUPS: {
  label: string
  card: string
  color: string
  items: { key: string; label: string; description: string; rows?: number; type?: 'boolean' | 'text'; vars?: string; placeholder?: string }[]
}[] = [
  {
    label: 'Modelo UGC',
    card: 'model',
    color: 'border-blue-500/30 bg-blue-500/5',
    items: [
      {
        key: 'model_engine_google_active',
        label: '🌐 Motor Google Imagen 3 — Ativar?',
        description: 'Se desligado, a opção Google não aparecerá para o cliente.',
        type: 'boolean'
      },
      {
        key: 'model_engine_flux_active',
        label: '🚀 Motor FLUX Pro Ultra — Ativar?',
        description: 'Se desligado, a opção FLUX não aparecerá para o cliente.',
        type: 'boolean'
      },
      {
        key: 'model_generation_system',
        label: '🧠 System GPT-4o — Descrição visual',
        description: 'Instrução do GPT-4o para gerar a descrição textual única do modelo. O seed de unicidade e os atributos do usuário (gênero, tom de pele etc.) são injetados automaticamente.',
        rows: 7,
      },
      {
        key: 'model_flux_suffix',
        label: '📸 Sufixo Google Imagen 3 — Estilo fotográfico',
        description: 'Texto adicionado após a descrição do modelo para guiar o motor da Google na geração da foto. Controla o estilo de câmera e autenticidade.',
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
        description: 'Instrução base do copywriter. O formato (Reels/Stories/Feed) é concatenado automaticamente.',
        rows: 6,
      },
    ],
  },
  {
    label: 'Imagem (FLUX Pro Ultra)',
    card: 'image',
    color: 'border-purple-500/30 bg-purple-500/5',
    items: [
      {
        key: 'image_style_ugc',
        label: '🤳 Prefixo estilo UGC',
        description: 'Prompt para FLUX Pro 1.1 Ultra quando o preset é "UGC / Influencer".',
        rows: 2,
      },
      {
        key: 'image_style_product',
        label: '📦 Prefixo estilo Produto',
        description: 'Prompt para FLUX Pro 1.1 Ultra quando o preset é "Produto Realista".',
        rows: 2,
      },
    ],
  },
  {
    label: 'Vídeo & Movimento',
    card: 'video',
    color: 'border-cyan-500/30 bg-cyan-500/5',
    items: [
      {
        key: 'video_kling_config',
        label: '🎬 Kling / Veo — Configuração JSON',
        description: 'Parâmetros de geração de vídeo do Fal AI. Suporta Kling e Google Veo 3.1. Se vazio, o sistema usa as durações padrão.',
        rows: 4,
        placeholder: '{ "cfg_scale": 0.5, "duration": "5", "veo_duration": "8s" }'
      },
      {
        key: 'video_liveportrait_config',
        label: '✨ LivePortrait — Sensibilidade',
        description: 'Ajustes finos para a animação facial no motor LivePortrait (Fal AI).',
        rows: 3,
      },
      {
        key: 'video_latentsync_config',
        label: '💋 LatentSync — Lip Sync',
        description: 'Ajustes de sincronia labial no motor LatentSync (Fal AI).',
        rows: 3,
      },
    ],
  },
  {
    label: 'Áudio & Fusão',
    card: 'audio_compose',
    color: 'border-orange-500/30 bg-orange-500/5',
    items: [
      {
        key: 'audio_elevenlabs_config',
        label: '🎙️ ElevenLabs — Configuração',
        description: 'Instruções de estabilidade e similaridade da voz clonada via ElevenLabs.',
        rows: 3,
        placeholder: '{ "stability": 0.5, "similarity": 0.8 }'
      },
      {
        key: 'compose_gpt_prompt',
        label: '🖼️ Prompt GPT Compose — Composição',
        description: 'Controla como o produto é inserido na cena com a modelo via GPT-4o Vision.',
        rows: 8,
      },
    ],
  },
  {
    label: 'Pós-Produção',
    card: 'post',
    color: 'border-emerald-500/30 bg-emerald-500/5',
    items: [
      {
        key: 'upscale_esrgan_config',
        label: '🔍 Upscale — Parâmetros',
        description: 'Parâmetros para o motor ESRGAN (Realismo Extremo). Ex: { "face_enhance": true, "scale": 2 }',
        rows: 3,
      },
      {
        key: 'subtitle_whisper_config',
        label: '📄 Whisper — Legendas',
        description: 'Configurações de transcrição via OpenAI Whisper.',
        rows: 3,
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

  // Objeto JSON completo para o editor mestre
  const masterJSON = JSON.stringify(promptMap, null, 2)

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-normal tracking-tight mb-1">Prompts do Studio IA</h1>
        <p className="text-white/40 text-sm leading-relaxed">
          Configure as instruções de cada motor do RevivAI. Alterações entram em vigor imediatamente.<br/>
          Use campos vazios para reverter ao padrão do sistema.
        </p>
      </div>

      <div className="flex flex-col gap-10">
        {PROMPT_GROUPS.map(group => (
          <div key={group.card}>
            <div className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border mb-4 ${group.color}`}>
              {group.label}
            </div>

            <div className="grid grid-cols-1 gap-6">
              {group.items.map(def => (
                <div key={def.key} className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-white mb-1">{def.label}</h2>
                    <p className="text-xs text-white/40 leading-relaxed">{def.description}</p>
                    {updatedMap[def.key] && (
                      <p className="text-[10px] text-white/20 mt-1">
                        Editado em: {new Date(updatedMap[def.key]).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>

                   <form action={upsertStudioPrompt} className="flex flex-col gap-3">
                    <input type="hidden" name="key" value={def.key} />
                    
                    {def.type === 'boolean' ? (
                      <BooleanSwitch 
                        name="value" 
                        defaultValue={promptMap[def.key] ?? 'false'} 
                        label={def.label}
                      />
                    ) : (
                      <textarea
                        name="value"
                        rows={def.rows}
                        defaultValue={promptMap[def.key] ?? ''}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 resize-y font-mono leading-relaxed"
                        placeholder={def.placeholder || `Padrão do sistema...`}
                      />
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-white/20">
                        {promptMap[def.key] ? '✅ Ativo' : '⚙️ Padrão'}
                      </p>
                      <button type="submit" className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
                        Salvar
                      </button>
                    </div>
                  </form>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* EDITOR MESTRE JSON */}
      <div id="json-master" className="mt-20 border-t border-white/10 pt-10">
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-2">💎 Editor Mestra JSON (Modo God)</h2>
            <p className="text-sm text-indigo-300/60">Edite todos os prompts de uma vez ou faça backup da configuração completa.</p>
          </div>
          
          <form action={upsertAllPromptsJSON} className="flex flex-col gap-4">
            <textarea
              name="json"
              rows={15}
              defaultValue={masterJSON}
              className="w-full bg-black/50 border border-indigo-500/20 rounded-xl px-5 py-4 text-indigo-300 text-xs font-mono focus:outline-none focus:border-indigo-500/50 resize-y overflow-auto"
              spellCheck={false}
            />
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-indigo-400/50 italic">Cuidado: Salvar aqui sobrescreverá todas as chaves existentes no objeto.</p>
              <button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                Salvar Configuração Completa
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

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
    ],
  },
  {
    label: 'Imagem (FLUX Pro Ultra)',
    card: 'image',
    color: 'border-violet-500/30 bg-violet-500/5',
    items: [
      {
        key: 'image_ugc_prefix',
        label: '📱 Prefixo estilo UGC',
        description: 'Prompt para FLUX Pro 1.1 Ultra quando o preset é "UGC / Influencer".',
        rows: 4,
      },
      {
        key: 'image_cinematic_prefix',
        label: '🎬 Prefixo estilo Cinematic',
        description: 'Prompt para fotos de alta produção e estúdio.',
        rows: 4,
      },
    ],
  },
  {
    label: 'Voz (ElevenLabs)',
    card: 'voice',
    color: 'border-emerald-500/30 bg-emerald-500/5',
    items: [
      {
        key: 'audio_elevenlabs_config',
        label: '🎙️ Configuração de Voz',
        description: 'Parâmetros JSON para a API do ElevenLabs (voz default, estabilidade, etc).',
        rows: 5,
      },
    ],
  },
  {
    label: 'Vídeo (Kling / Veo)',
    card: 'video',
    color: 'border-blue-500/30 bg-blue-500/5',
    items: [
      {
        key: 'video_kling_config',
        label: '📹 Kling AI — Configurações',
        description: 'Configurações de câmera e movimento para o motor de vídeo principal.',
        rows: 4,
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
        description: 'Parâmetros para o motor ESRGAN (Realismo Extremo).',
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

  const masterJSON = JSON.stringify(promptMap, null, 2)

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-normal tracking-tight mb-1 font-white">Prompts do Studio IA</h1>
        <p className="text-white/40 text-sm leading-relaxed">
          Configure as instruções de cada motor do RevivAI. Alterações entram em vigor imediatamente.<br/>
          Use campos vazios para reverter ao padrão do sistema.
        </p>
      </div>

      <div className="flex flex-col gap-10">
        {PROMPT_GROUPS.map(group => (
          <div key={group.card} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className={`px-6 py-4 border-b border-white/10 flex items-center justify-between ${group.color}`}>
              <h2 className="text-sm font-bold uppercase tracking-widest text-white">{group.label}</h2>
              <span className="text-[10px] text-white/40 font-mono">{group.card.toUpperCase()}_CONFIG</span>
            </div>

            <form action={async (formData: FormData) => {
              'use server'
              const admin = createAdminClient()
              const entries = Array.from(formData.entries())
              for (const [key, value] of entries) {
                if (key.startsWith('$')) continue
                await admin.from('studio_prompts').upsert({ key, value: String(value) }, { onConflict: 'key' })
              }
            }} className="p-6 flex flex-col gap-8">
              <div className="grid grid-cols-1 gap-8">
                {group.items.map(def => (
                  <div key={def.key} className="relative">
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-white mb-1">{def.label}</h3>
                      <p className="text-[11px] text-white/40 leading-relaxed">{def.description}</p>
                    </div>
                    
                    {def.type === 'boolean' ? (
                      <div className="bg-black/20 rounded-xl px-4 py-3 border border-white/5">
                        <BooleanSwitch 
                          name={def.key} 
                          defaultValue={promptMap[def.key] ?? 'false'} 
                          label={def.label}
                        />
                      </div>
                    ) : (
                      <textarea
                        name={def.key}
                        rows={def.rows}
                        defaultValue={promptMap[def.key] ?? ''}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-indigo-500/50 resize-y font-mono leading-relaxed transition-all"
                        placeholder={def.placeholder || `Padrão do sistema...`}
                      />
                    )}
                    
                    {updatedMap[def.key] && (
                      <p className="text-[9px] text-white/20 mt-2 text-right">
                        Último ajuste: {new Date(updatedMap[def.key]).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-2">
                  {group.items.every(id => promptMap[id.key]) ? (
                    <span className="text-[9px] text-emerald-400 font-black">● CUSTOMIZADO</span>
                  ) : (
                    <span className="text-[9px] text-zinc-500 font-bold uppercase">○ PADRÃO</span>
                  )}
                </div>
                <button 
                  type="submit" 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                >
                  Salvar Seção {group.label}
                </button>
              </div>
            </form>
          </div>
        ))}
      </div>

      <div id="json-master" className="mt-20 border-t border-white/10 pt-10">
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-8">
          <div className="mb-6 text-center lg:text-left">
            <h2 className="text-xl font-bold text-white mb-2">💎 Editor Mestra JSON (Modo God)</h2>
            <p className="text-sm text-indigo-300/60 leading-relaxed">Edite todos os prompts de uma vez ou faça backup da configuração completa do Studio.</p>
          </div>
          
          <form action={upsertAllPromptsJSON} className="flex flex-col gap-4">
            <textarea
              name="json"
              rows={15}
              defaultValue={masterJSON}
              className="w-full bg-black/50 border border-indigo-500/20 rounded-xl px-5 py-4 text-indigo-300 text-xs font-mono focus:outline-none focus:border-indigo-500/50 resize-y overflow-auto"
              spellCheck={false}
            />
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <p className="text-[10px] text-indigo-400/50 italic text-center lg:text-left">Cuidado: Salvar aqui sobrescreverá todas as chaves existentes no objeto.</p>
              <button 
                type="submit" 
                className="w-full lg:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                Atualizar Tudo de uma Vez
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

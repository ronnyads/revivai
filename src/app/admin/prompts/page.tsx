export const dynamic = 'force-dynamic'
import { createAdminClient } from '@/lib/supabase/admin'
import { createMode, deleteMode, seedDefaultModes } from './actions'
import ModeEditor from './ModeEditor'

const MODELS = [
  { value: 'gemini-2.5-flash-image',          label: 'Nano Banana (rápido)' },
  { value: 'gemini-3.1-flash-image-preview',   label: 'Nano Banana 2 (qualidade)' },
  { value: 'gemini-3-pro-image-preview',        label: 'Nano Banana Pro (máxima qualidade)' },
]

export default async function PromptsPage() {
  const supabase = createAdminClient()
  const { data: modes } = await supabase
    .from('restoration_modes')
    .select('*')
    .order('sort_order', { ascending: true })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-4xl font-normal tracking-tight mb-1">Modos de Restauração</h1>
        <p className="text-white/40 text-sm">Crie e edite os modos que o cliente vê na tela de upload.</p>
      </div>

      {/* Existing modes */}
      <div className="flex flex-col gap-4 mb-10">
        {modes?.map(mode => (
          <ModeEditor key={mode.id} mode={mode} models={MODELS} deleteMode={deleteMode} />
        ))}
        {(!modes || modes.length === 0) && (
          <div className="text-center py-12">
            <p className="text-white/30 text-sm mb-4">Nenhum modo cadastrado.</p>
            <form action={seedDefaultModes}>
              <button type="submit" className="text-sm px-4 py-2 bg-white/10 hover:bg-white/20 text-white/60 rounded-lg transition-colors">
                ✦ Criar modos padrão
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Create new mode */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-sm font-semibold mb-5 text-white/70 uppercase tracking-widest">Novo modo</h2>
        <form action={createMode} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-white/40 mb-1 block">Ícone</label>
              <input name="icon" defaultValue="✨" className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-white/40 mb-1 block">Nome</label>
              <input name="name" placeholder="Ex: Foto danificada" required className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Descrição (aparece para o cliente)</label>
            <input name="description" placeholder="Ex: Rasgos, rachaduras, manchas" className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Modelo Gemini</label>
            <select name="model" className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30">
              {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Persona do Agente <span className="text-white/20">(system instruction)</span></label>
            <textarea name="persona" rows={4} placeholder="Ex: Você é um restaurador de fotos com 30 anos de experiência..." className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 resize-y font-mono" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Prompt Gemini <span className="text-white/20">(tarefa)</span></label>
            <textarea name="prompt" rows={6} required placeholder="Escreva o prompt completo aqui..." className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 resize-y font-mono" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Prompt de Retry <span className="text-white/20">(se QC score abaixo do limiar)</span></label>
            <textarea name="retry_prompt" rows={3} placeholder="Prompt conservador para segunda tentativa..." className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30 resize-y font-mono" />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Limiar de Qualidade <span className="text-white/20">(0–100, padrão 70)</span></label>
            <input name="qc_threshold" type="number" min={0} max={100} step={5} defaultValue={70} className="w-32 bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30" />
          </div>
          <p className="text-xs text-white/20">💡 Após criar, edite o modo para fazer upload das imagens de exemplo.</p>
          <button type="submit" className="self-start bg-accent text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors">
            Criar modo
          </button>
        </form>
      </div>
    </div>
  )
}

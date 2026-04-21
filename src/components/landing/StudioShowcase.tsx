'use client'
import { Play, Sparkles, Video, Mic } from 'lucide-react'

const FEATURES = [
  {
    badge: 'UGC COM IA',
    title: 'IMITE MOVIMENTOS REAIS COM QUALQUER ROSTO',
    desc: 'Faça qualquer foto falar, dançar ou se mover com expressões realistas. Perfeito para UGC, anúncios e conteúdo para redes sociais — sem câmera, sem ator.',
    tags: ['Animate', 'Lipsync', 'Live Portrait'],
    icon: <Sparkles size={20} />,
    videoId: null,
  },
  {
    badge: 'VÍDEO PUBLICITÁRIO',
    title: 'VÍDEOS DE PRODUTO QUE VENDEM',
    desc: 'Gere vídeos cinematográficos do seu produto com IA. Do prompt ao vídeo em segundos — com Kling o3 Pro ou Google Veo em qualidade profissional.',
    tags: ['Kling o3 Pro', 'Google Veo', '8 segundos'],
    icon: <Video size={20} />,
    videoId: null,
  },
  {
    badge: 'AVATAR COM VOZ',
    title: 'VOZ E ROSTO SINCRONIZADOS',
    desc: 'Clone qualquer voz e sincronize com o avatar do seu influenciador ou modelo. Escale conteúdo sem gravar nada — em qualquer idioma.',
    tags: ['ElevenLabs', 'LatentSync', '29 vozes'],
    icon: <Mic size={20} />,
    videoId: null,
  },
]

function VideoPlaceholder({ videoId }: { videoId: string | null }) {
  return (
    <div
      className="relative aspect-[9/16] w-full max-w-[280px] bg-[#201f22] border border-white/10 overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-[#131315] to-transparent opacity-40 group-hover:opacity-20 transition-opacity duration-700" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-sm group-hover:scale-110 transition-transform duration-500">
           <Play size={18} className="text-[#D4FF00] ml-1" />
        </div>
        <span className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">Prévias em breve</span>
      </div>
    </div>
  )
}

export default function StudioShowcase() {
  return (
    <section className="py-32 px-6 lg:px-20 bg-[#131315] relative">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4FF00] mb-6">RECURSOS DO STUDIO</p>
          <h2 className="text-5xl md:text-7xl font-bold font-display uppercase tracking-tighter leading-[0.95] max-w-4xl">
            CRIE ANÚNCIOS REAIS <br />
            <span className="text-white/20">COM POUCOS CLIQUES</span>
          </h2>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-white/5 border border-white/5">
          {/* Main Feature - Spans 2 rows? Regular for now but with different styling */}
          {FEATURES.map((feat, i) => (
            <div 
              key={feat.badge}
              className={`p-10 md:p-16 bg-[#131315] flex flex-col md:flex-row gap-12 items-center ${i === 0 ? 'lg:col-span-2' : ''}`}
            >
              <div className="flex-grow flex flex-col items-start">
                <div className="flex items-center gap-3 mb-6 text-[#D4FF00]">
                  {feat.icon}
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em]">{feat.badge}</span>
                </div>
                
                <h3 className="text-3xl md:text-5xl font-bold font-display uppercase tracking-tight leading-tight mb-6">
                  {feat.title}
                </h3>
                
                <p className="text-base text-white/50 mb-8 max-w-xl font-sans leading-relaxed">
                  {feat.desc}
                </p>

                <div className="flex flex-wrap gap-2 mb-10">
                  {feat.tags.map(tag => (
                    <span key={tag} className="text-[9px] font-bold px-3 py-1 bg-white/5 border border-white/10 uppercase tracking-widest text-white/60">
                      {tag}
                    </span>
                  ))}
                </div>

                <a 
                  href="/dashboard/studio" 
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-white border-b border-[#D4FF00] pb-1 hover:text-[#D4FF00] transition-colors"
                >
                  Experimentar Recurso
                </a>
              </div>

              <VideoPlaceholder videoId={feat.videoId} />
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

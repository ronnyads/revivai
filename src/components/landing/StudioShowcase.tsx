'use client'
import { Play } from 'lucide-react'

const FEATURES = [
  {
    badge: 'UGC com IA',
    title: 'Imite movimentos reais com qualquer rosto',
    desc: 'Faça qualquer foto falar, dançar ou se mover com expressões realistas. Perfeito para UGC, anúncios e conteúdo para redes sociais — sem câmera, sem ator.',
    tags: ['Animate', 'Lipsync', 'Live Portrait'],
    videoId: null, // substitua pelo ID do YouTube quando disponível
  },
  {
    badge: 'Vídeo Publicitário',
    title: 'Vídeos de produto que vendem',
    desc: 'Gere vídeos cinematográficos do seu produto com IA. Do prompt ao vídeo em segundos — com Kling o3 Pro ou Google Veo3 em qualidade profissional.',
    tags: ['Kling o3 Pro', 'Google Veo3', '8 segundos'],
    videoId: null,
  },
  {
    badge: 'Avatar com Voz',
    title: 'Voz e rosto sincronizados',
    desc: 'Clone qualquer voz e sincronize com o avatar do seu influenciador ou modelo. Escale conteúdo sem gravar nada — em português, inglês ou qualquer idioma.',
    tags: ['ElevenLabs', 'LatentSync', '29 vozes'],
    videoId: null,
  },
]

function VideoPlaceholder({ videoId }: { videoId: string | null }) {
  if (videoId) {
    return (
      <div className="mx-auto rounded-2xl overflow-hidden" style={{ aspectRatio: '9/16', maxWidth: 320, width: '100%' }}>
        <iframe
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <div
      className="mx-auto rounded-2xl flex flex-col items-center justify-center gap-3"
      style={{
        aspectRatio: '9/16',
        maxWidth: 320,
        width: '100%',
        backgroundColor: 'rgba(45,126,255,0.04)',
        border: '1px dashed rgba(45,126,255,0.2)',
      }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'rgba(45,126,255,0.12)', border: '1px solid rgba(45,126,255,0.2)' }}
      >
        <Play size={20} style={{ color: '#2D7EFF', marginLeft: 2 }} />
      </div>
      <p className="text-xs font-medium" style={{ color: 'rgba(232,236,255,0.3)' }}>Vídeo em breve</p>
      <p className="text-[10px]" style={{ color: 'rgba(232,236,255,0.15)' }}>9:16 · Reels</p>
    </div>
  )
}

export default function StudioShowcase() {
  return (
    <section className="py-28 px-6 md:px-20 relative overflow-hidden" style={{ backgroundColor: '#06070F' }}>
      {/* Background glow */}
      <div
        className="absolute pointer-events-none"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 900, height: 400, borderRadius: 9999, backgroundColor: 'rgba(45,126,255,0.04)', filter: 'blur(140px)' }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase mb-6"
            style={{ border: '1px solid rgba(45,126,255,0.2)', color: '#7AAAFF', backgroundColor: 'rgba(45,126,255,0.05)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#2D7EFF' }} />
            Studio UGC com IA
          </div>
          <h2
            className="text-4xl md:text-6xl leading-tight mb-4"
            style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', color: '#E8ECFF' }}
          >
            Crie anúncios reais<br />
            <span style={{ color: '#2D7EFF' }}>com poucos cliques</span>
          </h2>
          <p className="text-base md:text-lg max-w-xl mx-auto" style={{ color: 'rgba(232,236,255,0.4)' }}>
            Imite movimentos, clone vozes, gere vídeos — tudo com IA.
          </p>
        </div>

        {/* ── Featured: Imitar Movimentos ── */}
        <div
          className="rounded-2xl p-8 md:p-12 mb-16"
          style={{ backgroundColor: 'rgba(45,126,255,0.04)', border: '1px solid rgba(45,126,255,0.18)' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <span
                className="inline-block text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-5"
                style={{ backgroundColor: 'rgba(45,126,255,0.15)', color: '#7AAAFF' }}
              >
                ⚡ Destaque — UGC com IA
              </span>
              <h3
                className="text-3xl md:text-5xl leading-tight mb-5"
                style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', color: '#E8ECFF' }}
              >
                Imite movimentos reais<br />
                <span style={{ color: '#2D7EFF' }}>com qualquer rosto</span>
              </h3>
              <p className="text-base leading-relaxed mb-8" style={{ color: 'rgba(232,236,255,0.5)' }}>
                Faça qualquer foto falar, dançar ou se mover com expressões hiper-realistas.
                Perfeito para UGC, anúncios e Reels — sem câmera, sem ator, sem custo de produção.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {['Animate', 'Lipsync', 'Live Portrait', 'LatentSync'].map(tag => (
                  <span
                    key={tag}
                    className="text-[11px] font-medium px-3 py-1 rounded-full"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(45,126,255,0.2)', color: 'rgba(232,236,255,0.6)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <a
                href="/dashboard/studio"
                className="inline-block px-8 py-3 text-sm font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: '#2D7EFF', color: '#fff', borderRadius: 4 }}
              >
                Experimentar agora →
              </a>
            </div>
            <div className="flex justify-center">
              <VideoPlaceholder videoId={FEATURES[0].videoId} />
            </div>
          </div>
        </div>

        {/* ── Other features ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {FEATURES.slice(1).map((feat) => (
            <div
              key={feat.badge}
              className="rounded-2xl p-8 flex flex-col gap-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(45,126,255,0.12)' }}
            >
              <VideoPlaceholder videoId={feat.videoId} />
              <div>
                <span
                  className="inline-block text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-3"
                  style={{ backgroundColor: 'rgba(45,126,255,0.1)', color: '#7AAAFF' }}
                >
                  {feat.badge}
                </span>
                <h3
                  className="text-xl md:text-2xl leading-snug mb-3"
                  style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', color: '#E8ECFF' }}
                >
                  {feat.title}
                </h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(232,236,255,0.4)' }}>
                  {feat.desc}
                </p>
                <div className="flex flex-wrap gap-2">
                  {feat.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-[11px] font-medium px-3 py-1 rounded-full"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(45,126,255,0.15)', color: 'rgba(232,236,255,0.5)' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-20">
          <a
            href="/dashboard/studio"
            className="inline-block px-10 py-4 text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: '#2D7EFF', color: '#fff', borderRadius: 4 }}
          >
            Criar meu primeiro conteúdo →
          </a>
        </div>
      </div>
    </section>
  )
}

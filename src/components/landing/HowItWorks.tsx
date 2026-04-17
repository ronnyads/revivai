export default function HowItWorks() {
  const steps = [
    {
      icon: 'upload_file',
      n: '1',
      title: 'Faça o upload da sua foto',
      desc: 'Arraste e solte suas memórias desbotadas na nossa interface segura. Suportamos todos os formatos de alta resolução: JPG, PNG, TIFF e BMP até 50MB.',
    },
    {
      icon: 'troubleshoot',
      n: '2',
      title: 'Diagnóstico por IA',
      desc: 'Nossa rede neural detecta automaticamente perda de grão, desbotamento químico e abrasões físicas. Mapeamos cada pixel para determinar o caminho ideal de restauração.',
    },
    {
      icon: 'auto_awesome',
      n: '3',
      title: 'Restauração em segundos',
      desc: 'O revival começa. Reconstruímos texturas e reequilibramos tons, mantendo fidelidade à estética cinematográfica e iluminação da era original.',
    },
    {
      icon: 'download',
      n: '4',
      title: 'Baixe o resultado',
      desc: 'Sua memória agora é à prova do futuro. Exporte em alta fidelidade impressionante, pronto para impressão, emolduramento ou arquivamento digital seguro.',
    },
  ]

  return (
    <section id="como-funciona" className="py-32 px-8 max-w-screen-2xl mx-auto relative" style={{ backgroundColor: '#06070F' }}>
      {/* Background glow */}
      <div
        className="absolute top-1/2 left-1/2 pointer-events-none"
        style={{
          transform: 'translate(-50%, -50%)',
          width: '800px',
          height: '400px',
          backgroundColor: 'rgba(45,126,255,0.05)',
          filter: 'blur(120px)',
          borderRadius: '9999px',
        }}
      />

      {/* Section header */}
      <div className="relative z-10 text-center mb-24">
        <p className="text-xs uppercase tracking-[0.3em] font-medium mb-4" style={{ color: '#2D7EFF' }}>
          Como funciona
        </p>
        <h2 className="text-5xl md:text-6xl leading-tight" style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', color: '#e5e2e1' }}>
          A arte da preservação<br />
          <span style={{ color: '#2D7EFF' }}>através da IA</span>
        </h2>
      </div>

      {/* Steps grid */}
      <div className="relative grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-4 items-start z-10">
        {/* Connecting line */}
        <div
          className="hidden md:block absolute"
          style={{
            top: '52px',
            left: '10%',
            right: '10%',
            height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(217,79,46,0.3), transparent)',
          }}
        />

        {steps.map((step) => (
          <div key={step.n} className="relative z-10 group flex flex-col items-center md:items-start text-center md:text-left space-y-8">
            <div className="flex flex-col items-center md:items-start">
              <div
                className="flex items-center justify-center relative mb-4 transition-all duration-500"
                style={{
                  width: '104px',
                  height: '104px',
                  border: '1px solid rgba(217,79,46,0.2)',
                  backgroundColor: '#0e0e0e',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    color: '#2D7EFF',
                    fontSize: '2.25rem',
                    fontVariationSettings: "'FILL' 0, 'wght' 200, 'GRAD' 0, 'opsz' 24",
                  }}
                >
                  {step.icon}
                </span>
                <div
                  className="absolute flex items-center justify-center font-bold text-xl"
                  style={{
                    bottom: '-16px',
                    right: '-16px',
                    width: '48px',
                    height: '48px',
                    backgroundColor: '#2D7EFF',
                    color: '#fff',
                  }}
                >
                  {step.n}
                </div>
              </div>
            </div>
            <div className="space-y-4 pt-4">
              <h3
                className="text-2xl"
                style={{ fontFamily: "'Newsreader', serif", fontStyle: 'italic', color: '#e5e2e1' }}
              >
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed font-light tracking-wide" style={{ color: 'rgba(229,226,225,0.5)' }}>
                {step.desc}
              </p>
            </div>
            <div className="w-full md:hidden" style={{ height: '1px', backgroundColor: 'rgba(229,226,225,0.05)' }} />
          </div>
        ))}
      </div>
    </section>
  )
}

'use client'
import { useState } from 'react'
import { Download, Share2, Trash2, Camera, Clock } from 'lucide-react'

// Placeholder data since Supabase fetches might be done elsewhere, keeping the component visual
const GALLERY = [
  { id: 1, title: 'Retrato de Família 1954', time: 'Restaurado há 2 horas', img: 'https://images.unsplash.com/photo-1544281679-bba911f4d990?q=80&w=800' },
  { id: 2, title: 'Vovô em São Paulo', time: 'Restaurado há 5 horas', img: 'https://images.unsplash.com/photo-1550927311-6ee08f0aabd3?q=80&w=800' },
  { id: 3, title: 'Infância 1982', time: 'Restaurado ontem', img: 'https://images.unsplash.com/photo-1533088924009-edb37ce21c27?q=80&w=800' },
  { id: 4, title: 'Casamento Prata', time: 'Restaurado há 3 dias', img: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=800' },
]

export default function DashboardContent() {
  const [hoverId, setHoverId] = useState<number | null>(null)

  return (
    <div className="p-6 md:p-12 lg:p-16 max-w-7xl mx-auto min-h-screen">
      
      {/* Page Header */}
      <div className="mb-16">
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#D4FF00] mb-4">WORKSPACE</p>
        <h1 className="text-4xl md:text-5xl font-bold font-display uppercase tracking-tight text-white mb-4">
          Galeria de Restaurações
        </h1>
        <p className="text-white/50 text-base md:text-lg max-w-2xl font-sans leading-relaxed">
          Gerencie suas memórias revitalizadas com precisão de IA e qualidade cinematográfica.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        
        {/* Call to action "Add Photo" Card */}
        <a href="/dashboard/upload" className="group flex flex-col items-center justify-center p-12 bg-[#1E293B]/30 border border-white/5 hover:border-[#D4FF00]/50 border-dashed transition-all duration-500 min-h-[400px]">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#D4FF00]/10 group-hover:border-[#D4FF00]/20 transition-all duration-500">
             <Camera size={24} className="text-white/50 group-hover:text-[#D4FF00] transition-colors" />
          </div>
          <h3 className="text-lg font-bold text-white uppercase tracking-widest mb-2 font-display">Pronto para mais?</h3>
          <p className="text-xs text-white/40 text-center uppercase tracking-wider font-sans">
            Transforme antigas fotos usando <br/> seus 50 créditos disponíveis
          </p>
        </a>

        {GALLERY.map((item) => (
          <div 
            key={item.id}
            className="group relative bg-[#0F172A] border border-white/5 overflow-hidden transition-all duration-500 min-h-[400px]"
            onMouseEnter={() => setHoverId(item.id)}
            onMouseLeave={() => setHoverId(null)}
          >
            {/* Image */}
            <div className="absolute inset-0 overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent z-10 opacity-80" />
               <img 
                 src={item.img} 
                 alt={item.title}
                 className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-60 group-hover:opacity-100"
               />
            </div>

            {/* Hover Actions */}
            <div className={`absolute top-4 right-4 z-20 flex gap-2 transition-all duration-300 ${hoverId === item.id ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
              <button className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-[#D4FF00] hover:text-black transition-colors tooltipwrap">
                <Share2 size={16} />
              </button>
              <button className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-[#D4FF00] hover:text-black transition-colors">
                <Download size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
               <div className="flex items-center gap-2 text-[#D4FF00] mb-3">
                 <Clock size={12} className="opacity-80" />
                 <span className="text-[9px] font-bold uppercase tracking-[0.2em]">{item.time}</span>
               </div>
               <h3 className="text-xl font-bold font-display uppercase tracking-wider text-white mb-4">
                 {item.title}
               </h3>
               
               <div className="flex items-center gap-4 opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                 <button className="text-[10px] font-bold text-white/50 hover:text-white uppercase tracking-[0.2em] transition-colors">Ver Comparação</button>
                 <button className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-[0.2em] transition-colors ml-auto flex items-center gap-1">
                   <Trash2 size={12} /> Excluir
                 </button>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

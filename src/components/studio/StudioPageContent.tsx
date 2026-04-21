'use client'
import { useState } from 'react'
import { Plus, Camera, Layout, FileText, Image as ImageIcon, Send, Sparkles } from 'lucide-react'

export default function StudioPageContent() {
  const [activeTab, setActiveTab] = useState('templates')

  return (
    <div className="p-6 md:p-12 lg:p-16 max-w-7xl mx-auto min-h-screen">
      {/* Header Editorial */}
      <div className="mb-20 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
        <div className="editorial-asymmetry">
          <p className="text-[10px] uppercase font-bold tracking-[0.5em] text-[#7C0DF2] mb-6">DIGITAL ATELIER</p>
          <h1 className="text-5xl md:text-7xl font-bold font-display uppercase leading-tight text-white mb-6">Ad Studio</h1>
          <p className="text-white/40 text-lg max-w-xl font-sans leading-relaxed">
            Crie campanhas e editoriais completos. Selecione um template de alta costura ou inicie um rascunho do zero.
          </p>
        </div>
        <button className="flex items-center justify-center gap-3 px-12 py-6 rounded-full bg-[#7C0DF2] text-white font-bold text-xs uppercase tracking-[0.3em] hover:bg-white hover:text-[#131313] transition-all duration-700 shadow-[0_0_30px_rgba(124,13,242,0.15)] w-full md:w-auto active:scale-95 group">
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" /> NOVO PROJETO
        </button>
      </div>

      {/* Tonal Layered Tabs */}
      <div className="flex items-center gap-12 mb-16 overflow-x-auto scrollbar-hide">
        {[
          { id: 'templates', label: 'Templates' },
          { id: 'drafts', label: 'Rascunhos' },
          { id: 'published', label: 'Publicados' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 text-xs font-bold uppercase tracking-[0.3em] whitespace-nowrap transition-all relative ${
              activeTab === tab.id ? 'text-[#7C0DF2]' : 'text-white/20 hover:text-white/60'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-[-1px] left-0 w-full h-[1px] bg-[#7C0DF2]" />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        
        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { title: 'Casting Editorial', icon: Camera, desc: 'Escolha modelos e poses para campanhas de luxo.', tag: 'Recomendado' },
                { title: 'Social Cinema', icon: Layout, desc: 'Editoriais 9:16 otimizados para impacto mobile.' },
                { title: 'Product Vision', icon: ImageIcon, desc: 'Integração de produtos em cenários 3D reais.' },
                { title: 'Brand Identity', icon: Sparkles, desc: 'Gere assets consistentes para toda a marca.' },
              ].map((tpl, i) => (
                <div key={i} className={`group relative p-12 transition-all duration-1000 cursor-pointer flex flex-col h-full min-h-[320px] overflow-hidden ${i % 2 === 0 ? 'tonal-layer-1' : 'tonal-layer-2'}`}>
                   <div className="absolute inset-0 bg-gradient-to-tr from-[#7C0DF2]/0 to-[#7C0DF2]/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                   
                   {tpl.tag && (
                     <span className="absolute top-8 right-8 text-[9px] font-bold uppercase tracking-[0.4em] text-[#7C0DF2] z-10">
                       {tpl.tag}
                     </span>
                   )}
                   
                   <div className="w-14 h-14 tonal-layer-0 flex items-center justify-center text-white/20 group-hover:text-white group-hover:bg-[#7C0DF2] mb-12 transition-all duration-700 z-10">
                     <tpl.icon size={22} />
                   </div>
                   
                   <h3 className="text-3xl font-bold font-display leading-[0.9] text-white mb-6 group-hover:text-[#7C0DF2] transition-colors z-10 italic">{tpl.title}</h3>
                   <p className="text-sm font-sans text-white/30 group-hover:text-white/50 leading-relaxed mb-10 flex-1 transition-colors z-10">{tpl.desc}</p>
                   
                   <div className="flex items-center gap-3 text-[10px] font-bold text-white/10 uppercase tracking-[0.4em] group-hover:text-white transition-all duration-500 z-10">
                     EXPLORAR <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-3 transition-transform duration-700" />
                   </div>
                </div>
              ))}
            </div>
          )}

          {activeTab !== 'templates' && (
            <div className="flex flex-col items-center justify-center py-32 px-4 tonal-layer-1">
               <div className="w-20 h-20 tonal-layer-2 flex items-center justify-center text-white/10 mb-8">
                 <FileText size={28} />
               </div>
               <p className="text-white/30 text-xs font-bold uppercase tracking-[0.4em]">Arquivos Inexistentes</p>
            </div>
          )}
        </div>

        {/* Creative Copilot Sidebar - Neo-Couture Synthesis */}
        <div className="lg:col-span-1 flex flex-col h-[700px] sticky top-12 group/chat">
           <div className="flex items-center gap-4 mb-10 pb-8 border-b border-white/5">
             <div className="w-12 h-12 tonal-layer-1 flex items-center justify-center group-hover/chat:tonal-layer-2 transition-all duration-700">
               <Sparkles size={18} className="text-[#7C0DF2]" />
             </div>
             <div>
               <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.4em]">Creative Copilot</h3>
               <p className="text-[#7C0DF2]/40 text-[8px] uppercase tracking-[0.5em] font-mono mt-1">Ready to assist</p>
             </div>
           </div>

           <div className="flex-1 overflow-y-auto space-y-10 scrollbar-hide pr-2">
             <div className="flex gap-4">
               <div className="w-8 h-8 rounded-full tonal-layer-2 flex items-center justify-center flex-shrink-0">
                 <span className="text-[9px] font-bold text-[#7C0DF2]">AI</span>
               </div>
               <div className="tonal-layer-1 p-8 text-sm text-white/60 leading-relaxed font-sans">
                 Olá! Sou seu assistente de direção criativa. <br /><br />
                 Como posso elevar a estética da sua campanha hoje? Posso ajustar iluminação, trocar modelos ou ambientar seu produto em novos cenários.
               </div>
             </div>
           </div>

           <div className="mt-12 pt-8 border-t border-white/5">
             <div className="relative group/input">
                <input 
                  type="text" 
                  placeholder="Instrua o Copilot..."
                  className="w-full bg-transparent border-b border-white/10 py-6 px-2 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-[#7C0DF2] transition-colors font-sans"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20 hover:text-[#7C0DF2] transition-colors p-2">
                  <Send size={18} />
                </button>
             </div>
           </div>
        </div>

      </div>
    </div>
  )
}

function ArrowRightIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" {...props}>
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

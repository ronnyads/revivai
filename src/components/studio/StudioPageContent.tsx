'use client'
import { useState } from 'react'
import { Plus, Camera, Layout, FileText, Image as ImageIcon, Send, Sparkles } from 'lucide-react'

export default function StudioPageContent() {
  const [activeTab, setActiveTab] = useState('templates')

  return (
    <div className="p-6 md:p-12 lg:p-16 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <p className="text-[10px] uppercase font-bold tracking-[0.4em] text-[#D4FF00] mb-4">WORKSPACE</p>
          <h1 className="text-4xl md:text-5xl font-bold font-display uppercase tracking-tight text-white mb-4">Ad Studio</h1>
          <p className="text-white/50 text-base max-w-xl font-sans">
            Crie campanhas e editoriais completos. Selecione um template ou inicie do zero usando a inteligência artificial.
          </p>
        </div>
        <button className="flex items-center justify-center gap-2 px-8 py-5 rounded-full bg-[#D4FF00] text-[#131315] font-bold text-xs uppercase tracking-[0.2em] hover:bg-white transition-all duration-700 shadow-[0_0_30px_rgba(212,255,0,0.15)] w-full md:w-auto active:scale-95">
          <Plus size={16} /> NOVO PROJETO
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-8 border-b border-white/10 mb-10 overflow-x-auto">
        {[
          { id: 'templates', label: 'Templates' },
          { id: 'drafts', label: 'Rascunhos' },
          { id: 'published', label: 'Publicados' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 text-[11px] font-bold uppercase tracking-[0.2em] whitespace-nowrap transition-all relative ${
              activeTab === tab.id ? 'text-[#D4FF00]' : 'text-white/40 hover:text-white/80'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#D4FF00] rounded-t-full shadow-[0_0_10px_#D4FF00]" />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Main Grid Window */}
        <div className="lg:col-span-3">
          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Lookbook Editorial', icon: Camera, desc: 'Ideal para alta costura e coleções.', tag: 'Recomendado' },
                { title: 'Social Ads', icon: Layout, desc: 'Formatos 9:16 e 4:5 otimizados para Meta e TikTok.' },
                { title: 'E-commerce B2C', icon: ImageIcon, desc: 'Fundo neutro, iluminação de estúdio natural.' },
                { title: 'Casting Virtual', icon: Sparkles, desc: 'Crie seu modelo consistente a partir de atributos.' },
              ].map((tpl, i) => (
                <div key={i} className="group relative bg-[#131315] border border-white/5 hover:border-white/10 p-8 transition-all duration-700 cursor-pointer flex flex-col h-full min-h-[250px] overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-tr from-[#D4FF00]/0 to-[#D4FF00]/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                   {tpl.tag && (
                     <span className="absolute top-4 right-4 bg-[#D4FF00] text-[#131315] text-[8px] font-bold uppercase tracking-[0.3em] px-3 py-1.5 shadow-[0_0_15px_rgba(212,255,0,0.2)] z-10">
                       {tpl.tag}
                     </span>
                   )}
                   <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center text-white/50 group-hover:text-[#131315] group-hover:bg-[#D4FF00] mb-8 transition-all duration-700 group-hover:shadow-[0_0_20px_rgba(212,255,0,0.3)] z-10">
                     <tpl.icon size={20} />
                   </div>
                   <h3 className="text-xl font-bold font-display uppercase tracking-tight text-white mb-3 group-hover:text-white transition-colors z-10">{tpl.title}</h3>
                   <p className="text-sm font-sans text-white/30 group-hover:text-white/50 leading-relaxed mb-6 flex-1 transition-colors z-10">{tpl.desc}</p>
                   
                   <div className="flex items-center gap-2 text-[9px] font-bold text-white/20 uppercase tracking-[0.3em] group-hover:text-[#D4FF00]/80 transition-all duration-500 z-10">
                     Usar Template <ArrowRightIcon className="w-3 h-3 group-hover:translate-x-2 transition-transform duration-500" />
                   </div>
                </div>
              ))}
            </div>
          )}

          {activeTab !== 'templates' && (
            <div className="flex flex-col items-center justify-center py-20 px-4 border border-white/5 border-dashed bg-[#0F172A]/30">
               <div className="w-16 h-16 bg-white/5 border border-white/10 flex items-center justify-center text-white/30 mb-6">
                 <FileText size={24} />
               </div>
               <p className="text-white/50 text-sm font-sans text-center">Nenhum projeto encontrado nesta categoria.</p>
            </div>
          )}
        </div>

        {/* Generative Chat Assistant Sidebar */}
        <div className="lg:col-span-1 border border-white/5 bg-white/[0.03] backdrop-blur-3xl p-6 flex flex-col h-[600px] sticky top-8 group/chat">
           <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/5">
             <div className="w-10 h-10 bg-[#D4FF00]/10 rounded-full flex items-center justify-center group-hover/chat:shadow-[0_0_15px_rgba(212,255,0,0.1)] transition-all duration-700">
               <Sparkles size={16} className="text-[#D4FF00]" />
             </div>
             <div>
               <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.3em]">Creative Copilot</h3>
               <p className="text-[#D4FF00] text-[8px] uppercase tracking-[0.4em] font-mono mt-0.5 animate-pulse">Status: Online</p>
             </div>
           </div>

           <div className="flex-1 overflow-y-auto pr-2 mb-6 space-y-6 font-sans text-[13px]">
             <div className="bg-[#1C1B1D] p-5 rounded-2xl rounded-tr-none border border-white/5 text-white/60 self-start w-[95%] leading-relaxed">
               Olá! Qual o tema da campanha de hoje? Quer criar um lookbook de alto verão estilo Riviera Francesa?
             </div>
           </div>

           <div className="relative mt-auto">
             <input 
               type="text" 
               placeholder="Descreva a sua ideia ao Copilot..."
               className="w-full bg-[#131315] border border-white/5 rounded-full px-6 py-4 pr-14 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-[#D4FF00]/40 transition-all duration-500 shadow-inner group-hover/chat:bg-black/40"
             />
             <button className="absolute right-4 top-1/2 -translate-y-1/2 text-[#D4FF00] hover:text-white transition-all duration-500 p-2 bg-[#D4FF00]/10 hover:bg-[#D4FF00]/20 rounded-full">
               <Send size={16} />
             </button>
           </div>
        </div>

      </div>
    </div>
  )
}

function ArrowRightIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

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
        <button className="flex items-center justify-center gap-2 px-8 py-4 bg-[#D4FF00] text-[#020617] font-bold text-xs uppercase tracking-[0.2em] hover:bg-white transition-all w-full md:w-auto">
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
                <div key={i} className="group relative bg-[#0F172A] border border-white/5 hover:border-[#D4FF00]/50 p-8 transition-all duration-500 cursor-pointer flex flex-col h-full min-h-[250px]">
                   {tpl.tag && (
                     <span className="absolute top-4 right-4 bg-[#D4FF00] text-[#020617] text-[8px] font-bold uppercase tracking-widest px-2 py-1">
                       {tpl.tag}
                     </span>
                   )}
                   <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center text-white/50 group-hover:text-[#D4FF00] group-hover:bg-[#D4FF00]/10 mb-8 transition-all">
                     <tpl.icon size={20} />
                   </div>
                   <h3 className="text-lg font-bold font-display uppercase text-white mb-3 group-hover:text-[#D4FF00] transition-colors">{tpl.title}</h3>
                   <p className="text-sm font-sans text-white/40 leading-relaxed mb-6 flex-1">{tpl.desc}</p>
                   
                   <div className="flex items-center gap-2 text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] group-hover:text-white/60">
                     Usar Template <ArrowRightIcon className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
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
        <div className="lg:col-span-1 border border-white/5 bg-[#0F172A] p-6 flex flex-col h-[600px] sticky top-8">
           <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/5">
             <div className="w-8 h-8 bg-[#D4FF00]/10 flex items-center justify-center">
               <Sparkles size={14} className="text-[#D4FF00]" />
             </div>
             <div>
               <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Creative Copilot</h3>
               <p className="text-[#D4FF00] text-[8px] uppercase tracking-widest font-mono">Online</p>
             </div>
           </div>

           <div className="flex-1 overflow-y-auto pr-2 mb-6 space-y-4 font-sans text-sm">
             <div className="bg-[#1E293B] p-4 rounded-br-none border border-white/5 text-white/80 self-start w-[90%]">
               Olá! Qual o tema da campanha de hoje? Quer criar um lookbook de alto verão estilo Riviera Francesa?
             </div>
           </div>

           <div className="relative mt-auto">
             <input 
               type="text" 
               placeholder="Descreva a sua ideia..."
               className="w-full bg-[#020617] border border-white/10 px-4 py-4 pr-12 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#D4FF00]/50 transition-colors"
             />
             <button className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-[#D4FF00] transition-colors p-1">
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

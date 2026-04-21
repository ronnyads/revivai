'use client'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import DashboardNav from './DashboardNav'

export default function MobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="lg:hidden flex items-center justify-between p-4 bg-[#0F172A]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
        <h1 className="text-xl font-bold tracking-tighter text-white font-display uppercase flex items-center gap-2">
           <span className="w-3 h-3 bg-[#D4FF00]" />
           Reviv.ai
        </h1>
        <button onClick={() => setOpen(true)} className="p-2 text-white/70 hover:text-white transition-colors">
          <Menu size={24} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-sm" onClick={() => setOpen(false)} />
          
          <div className="absolute top-0 right-0 bottom-0 w-[80%] max-w-sm bg-[#0F172A] border-l border-white/5 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0F172A] sticky top-0 z-10 relative overflow-hidden">
              <div className="absolute -left-10 -top-10 w-32 h-32 bg-[#D4FF00] opacity-10 blur-3xl rounded-full" />
              <h2 className="text-lg font-bold text-white uppercase tracking-widest relative z-10">Menu</h2>
              <button onClick={() => setOpen(false)} className="p-2 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors relative z-10">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto">
              <DashboardNav />
            </div>

            <div className="p-6 border-t border-white/5 bg-[#0F172A]">
               <div className="bg-[#1E293B] border border-white/10 p-4 rounded-lg flex flex-col gap-2 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4FF00] opacity-10 blur-2xl" />
                 <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">Plano Pro</p>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-white/80 font-mono">Créditos</span>
                   <span className="text-[#D4FF00] font-bold font-mono">942</span>
                 </div>
                 <div className="w-full h-1 bg-black/50 mt-1 rounded-full overflow-hidden">
                   <div className="h-full bg-[#D4FF00] w-3/4 rounded-full" />
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

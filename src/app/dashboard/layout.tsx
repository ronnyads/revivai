import DashboardNav from '@/components/dashboard/DashboardNav'
import MobileSidebar from '@/components/dashboard/MobileSidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-[#D4FF00] selection:text-[#020617] font-sans antialiased">
      {/* Mobile Sidebar */}
      <MobileSidebar />

      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-72 flex-col fixed inset-y-0 border-r border-white/5 bg-[#0F172A]/50 backdrop-blur-xl z-20">
          <div className="p-8 border-b border-white/5">
            <h1 className="text-2xl font-bold tracking-tighter text-white font-display uppercase flex items-center gap-2">
              <span className="w-4 h-4 bg-[#D4FF00]" />
              Reviv.ai
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-white/30 mt-2 font-mono">
              Workspace v2.0
            </p>
          </div>
          
          <div className="p-6">
            <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4 ml-3">Menu</p>
            <DashboardNav />
          </div>

          <div className="mt-auto p-8 border-t border-white/5">
            <div className="bg-[#1E293B] border border-white/10 p-4 rounded-lg flex flex-col gap-2 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4FF00] opacity-5 blur-2xl group-hover:opacity-20 transition-opacity" />
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
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:pl-72 w-full transition-all duration-300 relative">
          <div className="absolute top-0 right-0 w-[800px] h-[500px] bg-[#D4FF00]/5 blur-[150px] pointer-events-none rounded-full" />
          <div className="relative z-10 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

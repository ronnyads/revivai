import DashboardNav from '@/components/dashboard/DashboardNav'
import MobileSidebar from '@/components/dashboard/MobileSidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#7C0DF2] selection:text-white font-sans antialiased">
      {/* Mobile Sidebar */}
      <MobileSidebar />

      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-80 flex-col fixed inset-y-0 bg-[#0A0A0A] border-r border-white/5 z-20">
          <div className="p-10">
            <h1 className="text-2xl font-bold italic font-display text-white">
              REVIV<span className="text-[#7C0DF2]">.</span>AI
            </h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.4em] text-white/10 mt-3">
              Workspace v2.0
            </p>
          </div>
          
          <div className="p-6">
            <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4 ml-3">Menu</p>
            <DashboardNav />
          </div>

          <div className="mt-auto p-10">
            <div className="tonal-layer-1 p-6 flex flex-col gap-3 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-[#7C0DF2] opacity-5 blur-2xl group-hover:opacity-10 transition-opacity" />
               <p className="text-[9px] text-[#7C0DF2] uppercase tracking-[0.3em] font-bold">PLANO PRO</p>
               <div className="flex justify-between items-center">
                 <span className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Créditos</span>
                 <span className="text-white font-bold font-mono">942</span>
               </div>
               <div className="w-full h-px bg-white/5 mt-2 overflow-hidden">
                 <div className="h-full bg-[#7C0DF2] w-3/4" />
               </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:pl-72 w-full transition-all duration-300 relative">
          <div className="absolute top-0 right-0 w-[800px] h-[500px] bg-[#7C0DF2]/5 blur-[150px] pointer-events-none rounded-full" />
          <div className="relative z-10 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

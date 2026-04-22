'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import DashboardNav from '@/components/dashboard/DashboardNav'
import MobileSidebar from '@/components/dashboard/MobileSidebar'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import LogoutButton from '@/components/dashboard/LogoutButton'

const SIDEBAR_STORAGE_KEY = 'revivai-dashboard-sidebar-collapsed'

type DashboardShellContextValue = {
  sidebarCollapsed: boolean
  sidebarWidth: number
  toggleSidebar: () => void
}

const DashboardShellContext = createContext<DashboardShellContextValue | null>(null)

export function useDashboardShell() {
  return useContext(DashboardShellContext) ?? {
    sidebarCollapsed: false,
    sidebarWidth: 320,
    toggleSidebar: () => {},
  }
}

export default function DashboardShell({
  children,
  userPlan = 'free',
  userCredits = 0,
}: {
  children: React.ReactNode
  userPlan?: string
  userCredits?: number
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'
  })

  useEffect(() => {
    document.body.dataset.dashboardSidebar = sidebarCollapsed ? 'collapsed' : 'expanded'
    return () => {
      delete document.body.dataset.dashboardSidebar
    }
  }, [sidebarCollapsed])

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  const sidebarWidth = sidebarCollapsed ? 104 : 320
  const toggleSidebar = () => setSidebarCollapsed((value) => !value)
  const resolvedPlan = userPlan === 'subscription' ? 'Assinatura' : userPlan === 'package' ? 'Pacote' : 'Free'
  const creditRatio = Math.max(6, Math.min(100, userCredits > 0 ? Math.round((userCredits / Math.max(userCredits, 200)) * 100) : 6))

  const contextValue = useMemo(
    () => ({
      sidebarCollapsed,
      sidebarWidth,
      toggleSidebar,
    }),
    [sidebarCollapsed, sidebarWidth],
  )

  return (
    <DashboardShellContext.Provider value={contextValue}>
      <div
        className="min-h-screen bg-[#050505] font-sans text-white antialiased selection:bg-[#00ADCC] selection:text-[#003641]"
        style={{ ['--dashboard-sidebar-width' as string]: `${sidebarWidth}px` }}
      >
        <MobileSidebar userPlan={resolvedPlan} userCredits={userCredits} />

        <div className="flex min-h-screen">
          <aside
            style={{ width: 'var(--dashboard-sidebar-width)' }}
            className="fixed inset-y-0 z-20 hidden overflow-hidden border-r border-white/6 bg-[#050505] transition-[width] duration-300 lg:flex lg:flex-col"
          >
            <div className={`px-6 py-8 transition-all duration-300 ${sidebarCollapsed ? 'text-center' : ''}`}>
              <div className={`flex transition-all duration-300 ${sidebarCollapsed ? 'flex-col items-center gap-4' : 'items-start justify-between gap-4'}`}>
                <div className={sidebarCollapsed ? 'text-center' : ''}>
                  <h1 className={`font-display font-bold text-[#54D6F6] transition-all duration-300 ${sidebarCollapsed ? 'text-lg' : 'text-2xl'}`}>
                    {sidebarCollapsed ? 'SL' : 'STUDIO LAB'}
                  </h1>
                  {!sidebarCollapsed && (
                    <p className="font-label mt-3 text-[11px] text-white/28">Terminal de criacao</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={toggleSidebar}
                  title={sidebarCollapsed ? 'Expandir menu lateral' : 'Minimizar menu lateral'}
                  aria-label={sidebarCollapsed ? 'Expandir menu lateral' : 'Minimizar menu lateral'}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-[#54D6F6]/18 bg-[#0C171A] text-[#54D6F6] shadow-[0_18px_40px_rgba(84,214,246,0.08)] transition-all hover:-translate-y-0.5 hover:border-[#54D6F6]/38 hover:text-white"
                >
                  {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                </button>
              </div>

              {sidebarCollapsed && (
                <p className="font-label mt-4 text-[9px] uppercase tracking-[0.28em] text-white/22">menu ativo</p>
              )}
            </div>

            <div className={`transition-all duration-300 ${sidebarCollapsed ? 'px-3' : 'px-5'}`}>
              <DashboardNav collapsed={sidebarCollapsed} />
            </div>

            <div className="mt-auto p-6">
              <div className={`mb-4 flex gap-2 ${sidebarCollapsed ? 'flex-col items-center' : 'flex-col'}`}>
                <LanguageSwitcher compact={sidebarCollapsed} />
                <LogoutButton compact={sidebarCollapsed} />
              </div>

              {sidebarCollapsed ? (
                <div className="panel-card flex justify-center rounded-[24px] px-3 py-4">
                  <span className="font-label text-[11px] text-white/78">{userCredits} CR</span>
                </div>
              ) : (
                <div className="panel-card rounded-[24px] p-5">
                  <p className="font-label text-[10px] text-[#54D6F6]">{resolvedPlan}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-label text-[10px] text-white/32">Creditos</span>
                    <span className="font-label text-[12px] text-white/78">{userCredits} CR</span>
                  </div>
                  <div className="mt-4 h-[2px] overflow-hidden bg-white/6">
                    <div className="h-full bg-cyan-gradient" style={{ width: `${creditRatio}%` }} />
                  </div>
                </div>
              )}
            </div>
          </aside>

          <main className="relative min-h-screen flex-1 pb-24 transition-[padding] duration-300 lg:pb-0 lg:pl-[var(--dashboard-sidebar-width)]">
            <div className="pointer-events-none absolute right-[-140px] top-[-80px] h-[420px] w-[420px] rounded-full bg-[#00ADCC]/8 blur-[120px]" />
            <div className="relative z-10 min-h-screen">{children}</div>
          </main>
        </div>
      </div>
    </DashboardShellContext.Provider>
  )
}

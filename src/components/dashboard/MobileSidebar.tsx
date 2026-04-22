'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import DashboardNav from './DashboardNav'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import LogoutButton from '@/components/dashboard/LogoutButton'

export default function MobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/6 bg-[#050505]/88 px-4 py-4 backdrop-blur-xl lg:hidden">
        <div>
          <h1 className="font-display text-xl font-bold text-[#54D6F6]">STUDIO LAB</h1>
          <p className="font-label mt-1 text-[10px] text-white/28">Terminal de criação</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="text-white/70 transition-colors hover:text-white">
          <Menu size={22} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/72 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col border-r border-white/6 bg-[#050505]">
            <div className="flex items-center justify-between border-b border-white/6 px-5 py-5">
              <div>
                <h2 className="font-display text-xl font-bold text-[#54D6F6]">STUDIO LAB</h2>
                <p className="font-label mt-1 text-[10px] text-white/28">Terminal de criação</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-white/70 transition-colors hover:text-white">
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <DashboardNav />
            </div>

            <div className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <LanguageSwitcher compact />
                <LogoutButton compact />
              </div>

              <div className="panel-card rounded-[22px] p-5">
                <p className="font-label text-[10px] text-[#54D6F6]">Plano pro</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-label text-[10px] text-white/32">Créditos</span>
                  <span className="font-label text-[12px] text-white/78">942 CR</span>
                </div>
                <div className="mt-4 h-[2px] overflow-hidden bg-white/6">
                  <div className="h-full w-3/4 bg-cyan-gradient" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

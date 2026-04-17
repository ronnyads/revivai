'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clock, MoreVertical, Trash2, Copy, Loader2, Layers, Calendar } from 'lucide-react'
import { StudioProject } from '@/types'

interface Props {
  project: StudioProject
  templateLabel: string
  templateColor: string
}

export default function ProjectCard({ project, templateLabel, templateColor }: Props) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    setMenuOpen(false)
    if (!confirm('Excluir este projeto permanentemente?')) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/studio/projects/${project.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      alert('Erro ao excluir projeto.')
      setIsDeleting(false)
    }
  }

  async function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault()
    setMenuOpen(false)
    setIsDuplicating(true)
    try {
      const res = await fetch(`/api/studio/projects/${project.id}/duplicate`, { method: 'POST' })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      alert('Erro ao duplicar projeto.')
    } finally {
      setIsDuplicating(false)
    }
  }

  return (
    <Link
      href={`/dashboard/studio/${project.id}`}
      className="group block relative"
    >
      <div className={`relative overflow-hidden bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-[2rem] p-6 transition-all duration-500 hover:border-indigo-500/40 hover:bg-zinc-900/60 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] ${isDeleting || isDuplicating ? 'opacity-50 pointer-events-none' : ''}`}>
        
        {/* Subtle background glow */}
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full group-hover:bg-indigo-500/10 transition-colors duration-700" />

        {/* Actions Menu */}
        <div className="absolute top-6 right-6 z-10" ref={menuRef}>
          <button
            onClick={(e) => {
              e.preventDefault()
              setMenuOpen(!menuOpen)
            }}
            className={`w-8 h-8 flex items-center justify-center rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all ${menuOpen ? 'bg-zinc-800 text-white border-zinc-700' : ''}`}
          >
            {isDeleting || isDuplicating ? <Loader2 size={16} className="animate-spin" /> : <MoreVertical size={16} />}
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1 overflow-hidden focus:outline-none animate-in fade-in zoom-in-95">
              <button
                onClick={handleDuplicate}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl transition-colors"
              >
                <Copy size={14} className="text-indigo-400" /> Duplicar Projeto
              </button>
              <button
                onClick={handleDelete}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors"
              >
                <Trash2 size={14} /> Excluir permanentemente
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-inner group-hover:border-indigo-500/20 transition-colors">
              <Layers size={20} className="text-zinc-500 group-hover:text-indigo-400 transition-colors" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-zinc-500 transition-all truncate max-w-[150px]">
                {project.title || 'Sem título'}
              </h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                {templateLabel}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-950/50 rounded-2xl p-3 border border-zinc-800 group-hover:border-zinc-700/50 transition-colors">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Conteúdo</p>
              <p className="text-sm font-bold text-white">{project.asset_count} cards</p>
            </div>
            <div className="bg-zinc-950/50 rounded-2xl p-3 border border-zinc-800 group-hover:border-zinc-700/50 transition-colors">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Criado em</p>
              <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                <Calendar size={12} className="text-zinc-500" />
                {new Date(project.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

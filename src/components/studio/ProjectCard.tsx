'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Clock, MoreVertical, Trash2, Copy, Loader2 } from 'lucide-react'
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
      <div className={`${templateColor} border border-zinc-700 rounded-2xl p-5 hover:border-accent/40 transition-all ${isDeleting || isDuplicating ? 'opacity-50 pointer-events-none' : ''}`}>
        
        {/* Actions Menu */}
        <div className="absolute top-4 right-4 z-10" ref={menuRef}>
          <button
            onClick={(e) => {
              e.preventDefault()
              setMenuOpen(!menuOpen)
            }}
            className={`p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ${menuOpen ? 'bg-zinc-800 text-white' : ''}`}
          >
            {isDeleting || isDuplicating ? <Loader2 size={16} className="animate-spin" /> : <MoreVertical size={16} />}
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-2 w-40 origin-top-right rounded-xl bg-zinc-800 border border-zinc-700 shadow-xl overflow-hidden focus:outline-none animate-in fade-in slide-in-from-top-2">
              <div className="py-1">
                <button
                  onClick={handleDuplicate}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  <Copy size={14} /> Duplicar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-start justify-between mb-3 pr-6">
          <div>
            <p className="font-semibold text-white group-hover:text-accent transition-colors truncate max-w-[170px]">
              {project.title}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {templateLabel}
            </p>
          </div>
          <span className="text-xs text-zinc-500 bg-zinc-800/80 px-2 py-1 rounded-lg">
            {project.asset_count} cards
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Clock size={12} />
          {new Date(project.created_at).toLocaleDateString('pt-BR')}
        </div>
      </div>
    </Link>
  )
}

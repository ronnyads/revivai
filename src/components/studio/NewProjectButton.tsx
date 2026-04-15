'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'

interface Props {
  template?: string
  variant?: 'default' | 'card'
  children?: React.ReactNode
}

export default function NewProjectButton({ template = 'blank', variant = 'default', children }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function create() {
    setLoading(true)
    try {
      const res = await fetch('/api/studio/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }),
      })
      const { project } = await res.json()
      if (project?.id) router.push(`/dashboard/studio/${project.id}`)
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'card' && children) {
    return (
      <button onClick={create} disabled={loading} className="text-left w-full disabled:opacity-60">
        {loading ? (
          <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 flex items-center justify-center h-full min-h-[88px]">
            <Loader2 size={20} className="animate-spin text-accent" />
          </div>
        ) : children}
      </button>
    )
  }

  return (
    <button
      onClick={create}
      disabled={loading}
      className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-60 shadow-lg shadow-accent/20"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
      Novo Projeto
    </button>
  )
}

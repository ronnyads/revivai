'use client'
import { useState } from 'react'

export default function AddCreditsButton({ userId, currentCredits }: { userId: string; currentCredits: number }) {
  const [credits, setCredits] = useState(currentCredits)
  const [loading, setLoading] = useState(false)

  const add = async (amount: number) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/add-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount }),
      })
      if (!res.ok) throw new Error('Falhou')
      setCredits(c => c + amount)
    } catch {
      alert('Erro ao adicionar créditos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`font-semibold min-w-[2rem] text-center ${credits > 0 ? 'text-white' : 'text-white/30'}`}>
        {credits}
      </span>
      {[1, 5, 10].map(n => (
        <button
          key={n}
          onClick={() => add(n)}
          disabled={loading}
          className="text-[10px] px-2 py-1 rounded bg-white/10 hover:bg-[#D94F2E]/30 hover:text-[#D94F2E] text-white/50 transition-colors disabled:opacity-40"
        >
          +{n}
        </button>
      ))}
    </div>
  )
}

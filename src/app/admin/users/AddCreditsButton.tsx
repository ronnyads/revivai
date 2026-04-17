'use client'
import { useState } from 'react'

export default function AddCreditsButton({ userId, currentCredits }: { userId: string; currentCredits: number }) {
  const [credits, setCredits] = useState(currentCredits)
  const [loading, setLoading] = useState(false)
  const [customAmount, setCustomAmount] = useState('')

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
      setCustomAmount('')
    } catch {
      alert('Erro ao adicionar créditos')
    } finally {
      setLoading(false)
    }
  }

  const handleCustomAdd = () => {
    const val = parseInt(customAmount)
    if (!isNaN(val) && val !== 0) {
      add(val)
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

      <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/10">
        <input
          type="number"
          placeholder="Qtd..."
          value={customAmount}
          onChange={e => setCustomAmount(e.target.value)}
          disabled={loading}
          onKeyDown={e => { if (e.key === 'Enter') handleCustomAdd() }}
          className="w-[50px] bg-white/5 text-xs text-white border border-white/10 rounded px-1.5 py-1 outline-none focus:border-white/30 transition-colors"
        />
        <button
          onClick={handleCustomAdd}
          disabled={loading || !customAmount}
          className="text-[10px] px-2 py-1 rounded bg-white/10 hover:bg-green-500/30 hover:text-green-400 text-white/50 transition-colors disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  )
}

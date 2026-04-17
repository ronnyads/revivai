'use client'

import { useState } from 'react'

interface Props {
  name: string
  defaultValue: string
  label: string
}

export default function BooleanSwitch({ name, defaultValue, label }: Props) {
  const [active, setActive] = useState(defaultValue === 'true')

  return (
    <label className="flex items-center justify-between cursor-pointer group py-2">
      <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
        {active ? '✅ Ativado' : '❌ Desativado'}
      </span>
      
      <div className="relative inline-flex items-center">
        <input 
          type="checkbox"
          name={name}
          value={active ? 'true' : 'false'}
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="sr-only peer"
        />
        {/* Hidden input to ensure 'false' is sent when not checked if needed, 
            but here we use the checkbox value directly */}
        <input type="hidden" name={name} value={active ? 'true' : 'false'} />

        <div 
          onClick={() => setActive(!active)}
          className={`w-14 h-7 rounded-full transition-all duration-300 relative ${
            active 
              ? 'bg-gradient-to-r from-indigo-600 to-blue-500 shadow-[0_0_15px_rgba(79,70,229,0.4)]' 
              : 'bg-zinc-800 border border-zinc-700'
          }`}
        >
          <div 
            className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 transform ${
              active ? 'translate-x-7' : 'translate-x-0'
            }`}
          />
        </div>
      </div>
    </label>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

export default function BeforeAfterSlider({
  before,
  after,
  lazy = false,
}: {
  before: string
  after: string
  lazy?: boolean
}) {
  const [pos, setPos] = useState(50)
  const [dragging, setDragging] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const calc = (clientX: number) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const pct = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100))
    setPos(pct)
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging) calc(e.clientX)
    }
    const onUp = () => setDragging(false)
    const onTouch = (e: TouchEvent) => {
      if (dragging) calc(e.touches[0].clientX)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onTouch)
    window.addEventListener('touchend', onUp)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchend', onUp)
    }
  }, [dragging])

  return (
    <div
      ref={ref}
      className="panel-card relative aspect-[4/5] w-full overflow-hidden border border-white/10 bg-[#111111] shadow-[0_30px_80px_rgba(0,0,0,0.35)] select-none"
      onMouseDown={() => setDragging(true)}
      onTouchStart={() => setDragging(true)}
    >
      <Image
        src={before}
        alt="Foto original"
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        priority={!lazy}
        className="object-cover"
      />

      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
        <Image
          src={after}
          alt="Foto restaurada"
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={!lazy}
          className="object-cover"
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/65 via-black/15 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      <div
        className="absolute top-0 bottom-0 z-10 w-px bg-white/80 pointer-events-none"
        style={{ left: `${pos}%` }}
      >
        <div className="pointer-events-auto absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#54D6F6]/25 bg-[#0C171A] text-[#54D6F6] shadow-[0_0_0_10px_rgba(84,214,246,0.10)]">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M7 4l-4 6 4 6M13 4l4 6-4 6" />
          </svg>
        </div>
      </div>

      <div className="absolute left-4 top-4 z-20">
        <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.24em] text-white">
          antes
        </span>
      </div>

      <div className="absolute right-4 top-4 z-20">
        <span className="rounded-full border border-[#54D6F6]/25 bg-[#0C171A]/90 px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.24em] text-[#54D6F6]">
          depois
        </span>
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between gap-3">
        <div>
          <p className="font-label text-[10px] uppercase tracking-[0.3em] text-[#54D6F6]">comparativo interativo</p>
          <p className="mt-1 text-sm text-white/90">Arraste o divisor para inspecionar o ganho de detalhe.</p>
        </div>
        <div className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 font-label text-[10px] uppercase tracking-[0.24em] text-[#A8B5B8]">
          studio review
        </div>
      </div>
    </div>
  )
}

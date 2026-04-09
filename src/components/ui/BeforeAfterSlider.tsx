'use client'
import { useEffect, useRef, useState } from 'react'

export default function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
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
    const onMove = (e: MouseEvent) => { if (dragging) calc(e.clientX) }
    const onUp   = () => setDragging(false)
    const onTouch = (e: TouchEvent) => { if (dragging) calc(e.touches[0].clientX) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    window.addEventListener('touchmove', onTouch)
    window.addEventListener('touchend',  onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchend',  onUp)
    }
  }, [dragging])


  return (
    <div
      ref={ref}
      className="relative w-full max-w-sm aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border border-[#E8E8E8] cursor-col-resize select-none"
      onMouseDown={() => setDragging(true)}
      onTouchStart={() => setDragging(true)}
    >
      {/* Before */}
      <img src={before} alt="Foto original" className="absolute inset-0 w-full h-full object-cover" />
      {/* After */}
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={after} alt="Foto restaurada" className="absolute inset-0 w-full h-full object-cover" />
      </div>
      {/* Divider */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-white z-10 pointer-events-none" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center text-ink pointer-events-auto cursor-col-resize">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M7 4l-4 6 4 6M13 4l4 6-4 6"/>
          </svg>
        </div>
      </div>
      {/* Labels */}
      <div className="absolute bottom-4 left-4 z-20">
        <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-medium tracking-widest uppercase px-3 py-1.5 rounded-full">Original</span>
      </div>
      <div className="absolute bottom-4 right-4 z-20">
        <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-medium tracking-widest uppercase px-3 py-1.5 rounded-full">Restaurada ✦</span>
      </div>
    </div>
  )
}

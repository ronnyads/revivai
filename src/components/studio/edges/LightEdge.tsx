'use client'

import { getBezierPath, EdgeProps, BaseEdge } from '@xyflow/react'

export default function LightEdge({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const filterId = `glow-${id}`

  return (
    <>
      <defs>
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Linha base escura */}
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={{ stroke: '#3f3f46', strokeWidth: 2 }} />

      {/* Linha de brilho laranja */}
      <path d={edgePath} fill="none" stroke="#f97316" strokeWidth={1.5} opacity={0.35} />

      {/* Ponto de luz viajando na direção do fluxo */}
      <circle r="4" fill="white" filter={`url(#${filterId})`}>
        <animateMotion dur="1.8s" repeatCount="indefinite" path={edgePath} rotate="auto" />
      </circle>

      {/* Segundo ponto defasado para efeito de pulso contínuo */}
      <circle r="2.5" fill="#f97316" filter={`url(#${filterId})`} opacity="0.8">
        <animateMotion dur="1.8s" begin="0.9s" repeatCount="indefinite" path={edgePath} rotate="auto" />
      </circle>
    </>
  )
}

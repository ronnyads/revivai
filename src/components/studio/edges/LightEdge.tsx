'use client'

import { getBezierPath, EdgeProps, BaseEdge } from '@xyflow/react'

export default function LightEdge({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

  return (
    <>
      <style>{`
        @keyframes dashdraw {
          from { stroke-dashoffset: 20; }
          to { stroke-dashoffset: 0; }
        }
        .light-ray {
          animation: dashdraw 0.8s linear infinite;
        }
      `}</style>

      {/* Linha de interação (invisível, mas grossa) */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} className="react-flow__edge-interaction" />
      
      {/* Base da aresta (estática) */}
      <BaseEdge 
        id={id} 
        path={edgePath} 
        style={{ 
          stroke: '#3f3f46', 
          strokeWidth: 2.5,
          opacity: 0.4
        }} 
      />

      {/* Raio de luz (Animado) */}
      <path
        d={edgePath}
        fill="none"
        stroke="url(#ray-gradient)"
        strokeWidth={3}
        strokeDasharray="8, 12"
        className="light-ray"
        markerEnd={markerEnd}
      />

      <defs>
        <linearGradient id="ray-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#fb923c" stopOpacity="1" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.2" />
        </linearGradient>
      </defs>
    </>
  )
}

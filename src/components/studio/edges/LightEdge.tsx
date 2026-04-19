'use client'

import { getBezierPath, EdgeProps, BaseEdge, EdgeLabelRenderer, useReactFlow } from '@xyflow/react'
import { X } from 'lucide-react'

export default function LightEdge({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  markerEnd,
}: EdgeProps) {
  const { deleteElements } = useReactFlow()
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation()
    deleteElements({ edges: [{ id }] })
  }

  return (
    <>
      {/* Linha de interação (invisível, mas grossa) */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={24} className="react-flow__edge-interaction cursor-default" />
      
      {/* Base da aresta (estática) */}
      <BaseEdge 
        id={id} 
        path={edgePath} 
        style={{ 
          stroke: '#3f3f46', 
          strokeWidth: 2,
          opacity: 0.3
        }} 
        markerEnd={markerEnd}
      />

      {/* Rastro de fogo/energia (Animado) */}
      <path
        d={edgePath}
        fill="none"
        stroke="url(#fireball-gradient)"
        strokeWidth={3}
        strokeDasharray="4, 16"
        className="fire-trail-pulse"
        filter="url(#fire-glow-small)"
      />

      {/* Bola de Fogo (Fireball) Principal */}
      <g>
        <circle r="5" fill="url(#fireball-gradient)" filter="url(#fire-glow)">
          <animateMotion
            dur="2.5s"
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
        {/* Faísca secundária para rastro */}
        <circle r="2" fill="#ffcc00" opacity="0.4">
          <animateMotion
            dur="2.5s"
            begin="0.1s"
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      </g>

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan group"
        >
          {/* Container invisível maior para facilitar o hover */}
          <div className="w-10 h-10 flex items-center justify-center">
            <button
              onClick={onEdgeClick}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-950 border border-zinc-700 text-white hover:bg-red-600 hover:border-red-400 transition-all opacity-0 group-hover:opacity-100 shadow-[0_0_15px_rgba(255,0,0,0.3)] scale-75 group-hover:scale-100 active:scale-90"
              title="Remover conexão"
            >
              <X size={14} strokeWidth={3} />
            </button>
          </div>
        </div>
      </EdgeLabelRenderer>

      {/* Definições CSS Globais para esta aresta */}
      <style>{`
        .fire-trail-pulse {
          animation: firePulse 1.5s ease-in-out infinite alternate;
        }
        @keyframes firePulse {
          from { opacity: 0.2; stroke-width: 2; }
          to { opacity: 0.8; stroke-width: 4; }
        }
      `}</style>

      {/* Definições de gradiente e filtros */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <radialGradient id="fireball-gradient">
            <stop offset="10%" stopColor="#fff" />
            <stop offset="40%" stopColor="#ffcc00" />
            <stop offset="100%" stopColor="#ff4400" />
          </radialGradient>
          <filter id="fire-glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="fire-glow-small">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </>
  )
}

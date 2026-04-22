'use client'

import { getBezierPath, EdgeProps, EdgeLabelRenderer, useReactFlow } from '@xyflow/react'
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
      {/* Hit area invisível para facilitar interação */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={24} className="react-flow__edge-interaction cursor-default" />

      {/* Linha base */}
      <path
        d={edgePath}
        fill="none"
        stroke="#52525b"
        strokeWidth={2}
        strokeLinecap="round"
        markerEnd={markerEnd as string}
        opacity={0.5}
      />

      {/* Linha animada por cima */}
      <path
        d={edgePath}
        fill="none"
        stroke="url(#edge-gradient)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="8 16"
        style={{ animation: 'edgeDash 1.8s linear infinite' }}
        opacity={0.7}
      />

      <style>{`
        @keyframes edgeDash { to { stroke-dashoffset: -24; } }
      `}</style>

      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#54D6F6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#00ADCC" stopOpacity="0.85" />
          </linearGradient>
        </defs>
      </svg>

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan group"
        >
          <div className="w-10 h-10 flex items-center justify-center">
            <button
              onClick={onEdgeClick}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-950 border border-zinc-700 text-white hover:bg-red-600 hover:border-red-400 transition-all opacity-0 group-hover:opacity-100 shadow-lg scale-75 group-hover:scale-100 active:scale-90"
              title="Remover conexão"
            >
              <X size={14} strokeWidth={3} />
            </button>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

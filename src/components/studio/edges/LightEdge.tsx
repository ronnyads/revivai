'use client'

import { getBezierPath, EdgeLabelRenderer, EdgeProps, useReactFlow } from '@xyflow/react'
import { X } from 'lucide-react'

type LightEdgeData = {
  hasSelection?: boolean
  isHighlighted?: boolean
}

export default function LightEdge({
  id,
  data,
  selected,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
}: EdgeProps) {
  const { deleteElements } = useReactFlow()
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const edgeData = (data ?? {}) as LightEdgeData
  const isHighlighted = !!edgeData.isHighlighted
  const hasSelection = !!edgeData.hasSelection

  const baseOpacity = hasSelection ? (isHighlighted ? 0.56 : 0.14) : 0.28
  const glowOpacity = hasSelection ? (isHighlighted ? 0.9 : 0.18) : 0.54
  const strokeWidth = isHighlighted || selected ? 2.4 : 1.75

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation()
    deleteElements({ edges: [{ id }] })
  }

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={22}
        className="react-flow__edge-interaction cursor-default"
      />

      <path
        d={edgePath}
        fill="none"
        stroke="#6b7280"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        markerEnd={markerEnd as string}
        opacity={baseOpacity}
      />

      <path
        d={edgePath}
        fill="none"
        stroke="url(#studio-edge-gradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={isHighlighted ? '10 16' : '8 18'}
        style={{ animation: 'studioEdgeDash 2s linear infinite' }}
        opacity={glowOpacity}
      />

      <style>{`
        @keyframes studioEdgeDash {
          to { stroke-dashoffset: -26; }
        }
      `}</style>

      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <linearGradient id="studio-edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9bdff0" stopOpacity="0.12" />
            <stop offset="50%" stopColor="#00ADCC" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#9bdff0" stopOpacity="0.18" />
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
          <div className="flex h-9 w-9 items-center justify-center">
            <button
              onClick={onEdgeClick}
              className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all ${
                selected || isHighlighted
                  ? 'border-[#54D6F6]/30 bg-[#081014] text-[#9BDFF0] opacity-100'
                  : 'border-white/10 bg-[#0A0A0A] text-white/65 opacity-0 group-hover:opacity-100'
              } hover:border-red-400 hover:bg-red-600 hover:text-white`}
              title="Remover conexao"
            >
              <X size={12} strokeWidth={2.7} />
            </button>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

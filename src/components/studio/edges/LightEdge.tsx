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
        markerEnd={markerEnd}
      />

      {/* Raio de luz (Animado) */}
      <path
        d={edgePath}
        fill="none"
        stroke="url(#ray-gradient)"
        strokeWidth={3}
        strokeDasharray="8, 12"
        className="light-ray"
      />
    </>
  )
}

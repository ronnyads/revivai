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
      {/* Linha grossa e interativa invisível para facilitar o clique */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={15} className="react-flow__edge-interaction" />
      
      {/* Estilo Miro: linha sólida, cinza/azulada, limpa */}
      <BaseEdge 
        id={id} 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          stroke: '#94a3b8', 
          strokeWidth: 2,
        }} 
      />
    </>
  )
}

'use client'

import { useState } from 'react'
import { User, Image as ImageIcon } from 'lucide-react'
import ImageUpload from './ImageUpload'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function FaceGenerator({ initial, onGenerate }: Props) {
  const [imageUrl, setImageUrl] = useState(String(initial.face_image_url ?? ''))

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-xl text-xs text-indigo-300">
        Faça upload de uma foto com o rosto claro e isolado. Ele será usado pela biometria da IA para manter esse personagem consistente em cenas de Imagem.
      </div>
      
      <ImageUpload
        value={imageUrl}
        onChange={setImageUrl}
        label="Foto do Rosto Referência"
        accept="image/*"
        preview
      />
      
      <button
        onClick={() => onGenerate({
          face_image_url: imageUrl,
        })}
        disabled={!imageUrl.trim()}
        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all disabled:opacity-40 w-full"
      >
        <User size={15} /> Salvar Personagem — 0 créditos
      </button>
    </div>
  )
}

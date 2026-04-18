'use client'

import { useState } from 'react'
import { User, Fingerprint, Sparkles } from 'lucide-react'
import ImageUpload from './ImageUpload'
import { CREDIT_COST } from '@/constants/studio'

interface Props {
  initial: Record<string, unknown>
  onGenerate: (params: Record<string, unknown>) => void
}

export default function FaceGenerator({ initial, onGenerate }: Props) {
  const [imageUrl, setImageUrl] = useState(String(initial.face_image_url ?? ''))
  const cost = CREDIT_COST['face']

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho de Explicação */}
      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex items-start gap-3">
        <div className="p-2 bg-indigo-500/20 rounded-xl mt-0.5 text-indigo-400">
          <Fingerprint size={18} />
        </div>
        <div>
          <h4 className="text-[13px] font-bold text-white leading-tight">Biometria & Identidade Facial</h4>
          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
            Mantenha seu personagem consistente. Esta foto será usada como <b>âncora genética</b> para todas as fotos e vídeos do seu ator UGC.
          </p>
        </div>
      </div>
      
      <div className="px-1">
        <ImageUpload
          value={imageUrl}
          onChange={setImageUrl}
          label="Retrato Referência (Rosto de Frente)"
          accept="image/*"
          preview
        />
      </div>

      <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3 flex items-start gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 animate-pulse shrink-0" />
        <p className="text-[10px] text-zinc-500 leading-relaxed italic">
          <b>Dica:</b> Use fotos bem iluminadas. A IA extrai características como distância entre olhos e formato da boca para a consistência facial.
        </p>
      </div>
      
      <button
        onClick={() => onGenerate({
          face_image_url: imageUrl,
        })}
        disabled={!imageUrl.trim()}
        className="group relative flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-[13px] font-bold py-4 rounded-2xl transition-all disabled:opacity-40 w-full mt-2 shadow-[0_10px_30px_-10px_rgba(79,70,229,0.4)] active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <User size={18} className="group-hover:scale-110 transition-transform" /> 
        SALVAR IDENTIDADE VISUAL — {cost} CRÉDITOS
      </button>

      {!imageUrl.trim() && (
        <p className="text-[9px] text-zinc-600 text-center uppercase font-black tracking-widest mt-1">Aguardando Retrato Referência</p>
      )}
    </div>
  )
}

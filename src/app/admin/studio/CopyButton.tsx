'use client'

export default function CopyButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      className="ml-2 text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/40 hover:bg-white/20 hover:text-white transition-all"
    >
      copiar
    </button>
  )
}

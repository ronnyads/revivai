import { Coins } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CreditBadge({ credits, plan }: { credits: number; plan: string }) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium',
      credits > 0 ? 'bg-accent-light border-accent/30 text-accent' : 'bg-surface border-[#E8E8E8] text-muted'
    )}>
      <Coins size={15} />
      <span>{credits} crédito{credits !== 1 ? 's' : ''}</span>
      {plan === 'subscription' && (
        <span className="text-xs bg-accent text-white px-2 py-0.5 rounded-full ml-1">PRO</span>
      )}
    </div>
  )
}

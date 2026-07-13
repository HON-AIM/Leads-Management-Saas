import { Phone, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function ComingSoonPage({ title }: { title: string }) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.06]">
        <Phone size={28} className="text-white/20" />
      </div>
      <div className="text-center space-y-1">
        <h1 className="text-[18px] font-semibold text-white tracking-tight">{title}</h1>
        <p className="text-[13px] text-muted-foreground max-w-[280px]">
          This feature is under active development and will be available soon.
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mt-2">
        <ArrowLeft size={14} className="mr-1.5" />
        Go back
      </Button>
    </div>
  )
}

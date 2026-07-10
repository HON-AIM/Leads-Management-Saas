import { useState, useEffect } from 'react'
import { useVariableStore } from '@/stores/variableStore'
import { Eye, Loader2, RefreshCw } from 'lucide-react'

interface PayloadPreviewProps {
  template?: string
  className?: string
}

export function PayloadPreview({ template, className }: PayloadPreviewProps) {
  const { loaded, fetchVariables, getPreview } = useVariableStore()
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!loaded) fetchVariables()
  }, [loaded, fetchVariables])

  const loadPreview = async () => {
    setLoading(true)
    try {
      const data = await getPreview()
      setPreview(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (loaded && !preview) loadPreview()
  }, [loaded])

  const json = preview ? JSON.stringify(preview, null, 2) : '{}'

  return (
    <div className={`rounded-lg border border-white/[0.06] bg-[#070b16] ${className || ''}`}>
      <div className="flex items-center justify-between border-b border-white/[0.04] px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
          <Eye size={12} />
          <span>Payload Preview</span>
        </div>
        <button
          onClick={loadPreview}
          disabled={loading}
          className="rounded p-1 text-muted-foreground/30 hover:bg-white/[0.04] hover:text-white/50 transition-colors"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
        </button>
      </div>
      <div className="overflow-auto max-h-[400px] p-3">
        {loading && !preview ? (
          <div className="flex items-center justify-center p-6">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
          </div>
        ) : (
          <pre className="text-[11px] font-mono text-white/60 leading-relaxed whitespace-pre-wrap break-all">
            {json}
          </pre>
        )}
      </div>
    </div>
  )
}

export default PayloadPreview

import { useState, useEffect, useCallback } from 'react'
import { useVariableStore } from '@/stores/variableStore'
import { Play, Loader2, Copy, Check } from 'lucide-react'

interface PayloadRendererProps {
  template: string
  context?: Record<string, unknown>
  className?: string
}

export function PayloadRenderer({ template, context, className }: PayloadRendererProps) {
  const { loaded, fetchVariables, renderTemplate, getPreview } = useVariableStore()
  const [rendered, setRendered] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!loaded) fetchVariables()
  }, [loaded, fetchVariables])

  const render = useCallback(async () => {
    if (!template.trim()) { setRendered(''); return }
    setLoading(true)
    try {
      const ctx = context || (await getPreview())
      const result = await renderTemplate(template, ctx)
      setRendered(result)
    } catch {
      setRendered(template)
    } finally {
      setLoading(false)
    }
  }, [template, context, renderTemplate, getPreview])

  useEffect(() => { render() }, [render])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rendered)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`rounded-lg border border-white/[0.08] bg-[#0a0f1e] ${className || ''}`}>
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
          <Play size={12} />
          <span>Rendered Output</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={render}
            disabled={loading}
            className="rounded p-1 text-muted-foreground/30 hover:bg-white/[0.04] hover:text-white/70 transition-colors"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
          </button>
          <button
            onClick={handleCopy}
            className="rounded p-1 text-muted-foreground/30 hover:bg-white/[0.04] hover:text-white/70 transition-colors"
          >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          </button>
        </div>
      </div>
      <div className="p-3">
        {loading && !rendered ? (
          <div className="flex items-center justify-center p-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
          </div>
        ) : (
          <pre className="text-[11px] font-mono text-white/60 leading-relaxed whitespace-pre-wrap break-all min-h-[40px]">
            {rendered || <span className="text-muted-foreground/20 italic">Empty output</span>}
          </pre>
        )}
      </div>
    </div>
  )
}

export default PayloadRenderer

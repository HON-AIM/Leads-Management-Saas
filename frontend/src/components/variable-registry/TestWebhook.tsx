import { useState, useEffect } from 'react'
import { useVariableStore } from '@/stores/variableStore'
import { Webhook, Loader2, RefreshCw, Copy, Check } from 'lucide-react'

interface TestWebhookProps {
  className?: string
}

export function TestWebhook({ className }: TestWebhookProps) {
  const { loaded, fetchVariables, getTestPayload } = useVariableStore()
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { if (!loaded) fetchVariables() }, [loaded, fetchVariables])

  const generate = async () => {
    setLoading(true)
    try {
      const data = await getTestPayload()
      setPayload(data)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (loaded && !payload) generate() }, [loaded])

  const handleCopy = async () => {
    if (!payload) return
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const json = payload ? JSON.stringify(payload, null, 2) : '{}'

  return (
    <div className={`rounded-lg border border-white/[0.06] bg-[#070b16] ${className || ''}`}>
      <div className="flex items-center justify-between border-b border-white/[0.04] px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
          <Webhook size={12} />
          <span>Test Webhook Payload</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={generate} disabled={loading} className="rounded p-1 text-muted-foreground/30 hover:bg-white/[0.04] hover:text-white/50 transition-colors">
            {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          </button>
          <button onClick={handleCopy} className="rounded p-1 text-muted-foreground/30 hover:bg-white/[0.04] hover:text-white/50 transition-colors">
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          </button>
        </div>
      </div>
      <div className="overflow-auto max-h-[400px] p-3">
        {loading && !payload ? (
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

export default TestWebhook

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/useNotifications'
import { ChevronDown, Send, RotateCcw, Check, X as XIcon, Loader2 } from 'lucide-react'

interface PayloadTabProps {
  buyerId: string
}

interface Token {
  token: string
  label: string
  value: string
  source: 'standard' | 'dynamic'
}

interface TemplateData {
  template: string
  isDefault: boolean
  availableTokens: Token[]
}

interface PreviewResult {
  resolved: string
  isValid: boolean
  error: string | null
  parsed: object | null
}

interface TestSendResult {
  payloadSent: object
  statusCode: number
  responseBody: string
  success: boolean
  durationMs: number
}

export function PayloadTab({ buyerId }: PayloadTabProps) {
  const { addNotification } = useNotifications()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [template, setTemplate] = useState('')
  const [isDefault, setIsDefault] = useState(true)
  const [tokens, setTokens] = useState<Token[]>([])
  const [showTokenPicker, setShowTokenPicker] = useState(false)
  const [testResult, setTestResult] = useState<TestSendResult | null>(null)
  const [showTestResult, setShowTestResult] = useState(false)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [previewing, setPreviewing] = useState(false)

  const { data: templateData, isLoading } = useQuery<TemplateData>({
    queryKey: ['buyer-payload-template', buyerId],
    queryFn: async () => {
      const { data } = await api.get(`/buyers/${buyerId}/payload-template`)
      return data.data ?? data
    },
  })

  useEffect(() => {
    if (templateData) {
      setTemplate(templateData.template)
      setIsDefault(templateData.isDefault)
      setTokens(templateData.availableTokens)
    }
  }, [templateData])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.put(`/buyers/${buyerId}/payload-template`, { template })
      return data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Saved', description: 'Payload template saved' })
      setIsDefault(false)
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Error', description: err?.response?.data?.error || 'Failed to save template' })
    },
  })

  const testSendMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/buyers/${buyerId}/payload-template/test-send`, { template })
      return data.data ?? data
    },
    onSuccess: (result: TestSendResult) => {
      setTestResult(result)
      setShowTestResult(true)
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Test failed', description: err?.response?.data?.error || 'Could not send test' })
    },
  })

  const resetMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.get(`/buyers/${buyerId}/payload-template`)
      const defaultTemplate = data.data?.template || ''
      await api.put(`/buyers/${buyerId}/payload-template`, { template: defaultTemplate })
      return defaultTemplate
    },
    onSuccess: (defaultTemplate: string) => {
      setTemplate(defaultTemplate)
      setIsDefault(true)
      addNotification({ type: 'success', title: 'Reset', description: 'Reverted to default template' })
    },
    onError: () => {
      addNotification({ type: 'error', title: 'Error', description: 'Failed to reset template' })
    },
  })

  const fetchPreview = useCallback(async (tmpl: string) => {
    setPreviewing(true)
    try {
      const { data } = await api.post(`/buyers/${buyerId}/payload-template/preview`, { template: tmpl })
      setPreview(data.data ?? data)
    } catch {
      setPreview(null)
    } finally {
      setPreviewing(false)
    }
  }, [buyerId])

  useEffect(() => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    previewTimerRef.current = setTimeout(() => fetchPreview(template), 500)
    return () => { if (previewTimerRef.current) clearTimeout(previewTimerRef.current) }
  }, [template, fetchPreview])

  const insertToken = (token: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      setTemplate((prev) => prev + `{{${token}}}`)
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = template.substring(0, start)
    const after = template.substring(end)
    const newTemplate = before + `{{${token}}}` + after
    setTemplate(newTemplate)
    setTimeout(() => {
      textarea.focus()
      const pos = start + token.length + 4
      textarea.setSelectionRange(pos, pos)
    }, 0)
  }

  const standardTokens = tokens.filter((t) => t.source === 'standard')
  const dynamicTokens = tokens.filter((t) => t.source === 'dynamic')

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 skeleton bg-white/[0.05] rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-[13px] font-semibold text-white">Payload Template</h4>
          {isDefault && (
            <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium bg-blue-500/10 text-blue-400 ring-1 ring-inset ring-blue-400/30">
              Using default template
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isDefault && (
            <Button variant="outline" size="sm" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}>
              <RotateCcw size={11} className="mr-1" />
              Reset to Default
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || (preview !== null && !preview.isValid)}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/70">
        Use {"{{field_name}}"} to insert a value. Dynamic fields come from your form's raw submission data.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* Left Column — Editor */}
        <div className="space-y-2">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTokenPicker(!showTokenPicker)}
              className="w-full justify-between text-[11px]"
            >
              <span>{"{{ }} Insert Field"}</span>
              <ChevronDown size={12} className={`transition-transform ${showTokenPicker ? 'rotate-180' : ''}`} />
            </Button>
            {showTokenPicker && (
              <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-white/[0.08] bg-[#0e1428] shadow-elevated">
                {standardTokens.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-white/[0.06]">
                      Standard Fields
                    </div>
                    {standardTokens.map((t) => (
                      <button
                        key={t.token}
                        onClick={() => { insertToken(t.token); setShowTokenPicker(false) }}
                        className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/[0.06] transition-colors flex items-center justify-between"
                      >
                        <span className="text-white/80">{t.label}</span>
                        <span className="text-muted-foreground/60 font-mono text-[10px]">{`{{${t.token}}}`}</span>
                      </button>
                    ))}
                  </>
                )}
                {dynamicTokens.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-white/[0.06]">
                      Dynamic Fields
                    </div>
                    {dynamicTokens.map((t) => (
                      <button
                        key={t.token}
                        onClick={() => { insertToken(t.token); setShowTokenPicker(false) }}
                        className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/[0.06] transition-colors flex items-center justify-between"
                      >
                        <span className="text-white/80">{t.label}</span>
                        <span className="text-muted-foreground/60 font-mono text-[10px]">{`{{${t.token}}}`}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="w-full h-80 rounded-lg border border-white/[0.08] bg-[#151d33] p-3 font-mono text-[11px] text-white/80 placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 resize-none leading-relaxed"
            spellCheck={false}
          />
        </div>

        {/* Right Column — Live Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Live Preview</span>
            {previewing && <Loader2 size={11} className="text-muted-foreground animate-spin" />}
          </div>

          {preview && !preview.isValid && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2">
              <p className="text-[11px] text-red-400 font-medium">Template Error</p>
              <p className="text-[10px] text-red-400/80 mt-0.5">{preview.error}</p>
            </div>
          )}

          <div className="h-80 rounded-lg border border-white/[0.08] bg-[#151d33] p-3 overflow-auto">
            {preview?.parsed ? (
              <pre className="font-mono text-[11px] text-white/70 whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(preview.parsed, null, 2)}
              </pre>
            ) : preview?.resolved ? (
              <pre className="font-mono text-[11px] text-white/50 whitespace-pre-wrap leading-relaxed">
                {preview.resolved}
              </pre>
            ) : (
              <p className="text-[11px] text-muted-foreground/40">Start typing to see a preview...</p>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => testSendMutation.mutate()}
            disabled={testSendMutation.isPending || (preview !== null && !preview.isValid)}
          >
            {testSendMutation.isPending ? (
              <><Loader2 size={11} className="mr-1.5 animate-spin" /> Sending...</>
            ) : (
              <><Send size={11} className="mr-1.5" /> Send Test Lead</>
            )}
          </Button>

          {showTestResult && testResult && (
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                      <Check size={12} /> {testResult.statusCode} OK
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-red-400">
                      <XIcon size={12} /> {testResult.statusCode || 'Error'}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">{testResult.durationMs}ms</span>
                </div>
                <button onClick={() => setShowTestResult(false)} className="text-muted-foreground hover:text-white p-0.5">
                  <XIcon size={11} />
                </button>
              </div>
              <div className="p-3 space-y-2 max-h-40 overflow-auto">
                <div>
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Payload Sent</p>
                  <pre className="font-mono text-[10px] text-white/60 whitespace-pre-wrap">{JSON.stringify(testResult.payloadSent, null, 2)}</pre>
                </div>
                <div>
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Response</p>
                  <pre className="font-mono text-[10px] text-white/60 whitespace-pre-wrap">{testResult.responseBody?.slice(0, 500) || '(empty)'}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

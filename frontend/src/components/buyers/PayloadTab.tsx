import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { QUERY_KEYS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useNotifications } from '@/hooks/useNotifications'
import { ChevronDown, ChevronRight, Send, RotateCcw, Check, X as XIcon, Loader2, AlertTriangle, Braces } from 'lucide-react'

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
  accepted: boolean
  acceptanceReason: string
  durationMs: number
}

interface AcceptanceRule {
  enabled: boolean
  responseFieldPath: string
  operator: 'equals' | 'not_equals' | 'contains' | 'exists'
  expectedValue: string
}

interface PreviewAcceptanceResult {
  accepted: boolean
  reason: string
  responseTokens: Record<string, string>
}

const OPERATORS = [
  { value: 'exists', label: 'Exists' },
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
] as const

export function PayloadTab({ buyerId }: PayloadTabProps) {
  const { addNotification } = useNotifications()
  const qc = useQueryClient()
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

  const [showParseSection, setShowParseSection] = useState(false)
  const [rule, setRule] = useState<AcceptanceRule>({
    enabled: false,
    responseFieldPath: '',
    operator: 'exists',
    expectedValue: '',
  })
  const [sampleResponseText, setSampleResponseText] = useState('')
  const [previewAcceptResult, setPreviewAcceptResult] = useState<PreviewAcceptanceResult | null>(null)

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

  useEffect(() => {
    if (buyerId) {
      api.get(`/buyers/${buyerId}`).then(({ data }) => {
        const buyer = data.data ?? data
        if (buyer?.delivery?.acceptanceRule) {
          setRule(buyer.delivery.acceptanceRule)
          if (buyer.delivery.acceptanceRule.enabled) setShowParseSection(true)
        }
      }).catch(() => {})
    }
  }, [buyerId])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const [{ data }] = await Promise.all([
        api.put(`/buyers/${buyerId}/payload-template`, { template }),
        api.put(`/buyers/${buyerId}/acceptance-rule`, rule),
      ])
      return data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Saved', description: 'Template and acceptance rule saved' })
      setIsDefault(false)
      qc.invalidateQueries({ queryKey: QUERY_KEYS.BUYERS })
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Error', description: err?.response?.data?.error || 'Failed to save' })
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

  const previewAcceptMutation = useMutation({
    mutationFn: async () => {
      let sampleJson: any
      try { sampleJson = JSON.parse(sampleResponseText) } catch {
        throw new Error('Sample response is not valid JSON')
      }
      const { data } = await api.post(`/buyers/${buyerId}/acceptance-rule/preview`, {
        rule,
        sampleResponseJson: sampleJson,
      })
      return (data.data ?? data) as PreviewAcceptanceResult
    },
    onSuccess: (result: PreviewAcceptanceResult) => {
      setPreviewAcceptResult(result)
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Preview failed', description: err?.response?.data?.error || err.message || 'Could not evaluate' })
      setPreviewAcceptResult(null)
    },
  })

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
    <div className="space-y-5">
      {/* POST BODY TEMPLATE */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">POST BODY TEMPLATE</span>
            {isDefault && (
              <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium bg-blue-500/10 text-blue-400 ring-1 ring-inset ring-blue-400/30">
                Default
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isDefault && (
              <Button variant="outline" size="sm" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending} className="h-7 text-[11px]">
                <RotateCcw size={10} className="mr-1" />
                Reset
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || (preview !== null && !preview.isValid)}
              className="h-7 text-[11px]"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Editor */}
          <div className="space-y-1.5">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTokenPicker(!showTokenPicker)}
                className="h-7 mb-1.5 text-[10px] font-mono gap-1.5"
              >
                <Braces size={10} />
                {'{ }'} Insert Field
                <ChevronDown size={10} className={`transition-transform ${showTokenPicker ? 'rotate-180' : ''}`} />
              </Button>
              {showTokenPicker && (
                <div className="absolute z-30 mt-1 left-0 w-full max-h-52 overflow-y-auto rounded-lg border border-white/[0.08] bg-[#0e1428] shadow-elevated">
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
              className="w-full h-72 rounded-lg border border-white/[0.08] bg-[#151d33] p-3 font-mono text-[11px] text-white/80 placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 resize-none leading-relaxed"
              placeholder='{"first_name": "{{first_name}}", "email": "{{email}}"}'
              spellCheck={false}
            />
            <p className="text-[9px] text-muted-foreground/50">
              Use {'{{field_name}}'} for dynamic values. Wrap keys in double quotes.
            </p>
          </div>

          {/* Live Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between h-[30px]">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Live Preview</span>
              {previewing && <Loader2 size={11} className="text-muted-foreground animate-spin" />}
            </div>

            {preview && !preview.isValid && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2">
                <p className="text-[11px] text-red-400 font-medium">Template Error</p>
                <p className="text-[10px] text-red-400/80 mt-0.5">{preview.error}</p>
              </div>
            )}

            <div className="h-72 rounded-lg border border-white/[0.08] bg-[#151d33] p-3 overflow-auto">
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
              className="w-full h-8 text-[11px]"
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
                    {testResult.accepted ? (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                        <Check size={12} /> Accepted
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-red-400">
                        <XIcon size={12} /> Rejected
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      HTTP {testResult.statusCode} &middot; {testResult.durationMs}ms
                    </span>
                  </div>
                  <button onClick={() => setShowTestResult(false)} className="text-muted-foreground hover:text-white p-0.5">
                    <XIcon size={11} />
                  </button>
                </div>
                <div className="p-3 space-y-2 max-h-48 overflow-auto">
                  {testResult.acceptanceReason && (
                    <div className={`rounded-md px-2.5 py-1.5 text-[10px] ${testResult.accepted ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
                      {testResult.acceptanceReason}
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Payload Sent</p>
                    <pre className="font-mono text-[10px] text-white/60 whitespace-pre-wrap">{JSON.stringify(testResult.payloadSent, null, 2)}</pre>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Response Body</p>
                    <pre className="font-mono text-[10px] text-white/60 whitespace-pre-wrap">{testResult.responseBody?.slice(0, 800) || '(empty)'}</pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PARSE RESPONSE BODY */}
      <div className="rounded-lg border border-white/[0.08] overflow-hidden">
        <button
          onClick={() => setShowParseSection(!showParseSection)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">Parse Response Body</span>
            {rule.enabled && (
              <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-400/30">
                Active
              </span>
            )}
          </div>
          {showParseSection ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
        </button>

        {showParseSection && (
          <div className="px-4 py-4 space-y-4 border-t border-white/[0.06]">
            {/* Warning */}
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 flex gap-2">
              <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                Without an acceptance rule, any HTTP 2xx response marks the lead as <strong className="text-amber-200">Accepted</strong>.
                Add a rule below to validate the buyer's response body before accepting.
              </p>
            </div>

            {/* Enable toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRule((r) => ({ ...r, enabled: !r.enabled }))}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${rule.enabled ? 'bg-blue-500' : 'bg-white/10'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${rule.enabled ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
              </button>
              <Label className="text-[12px] text-white/70">Enable response body validation</Label>
            </div>

            {rule.enabled && (
              <>
                {/* Rule config */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px]">Response Field Path</Label>
                    <Input
                      value={rule.responseFieldPath}
                      onChange={(e) => setRule((r) => ({ ...r, responseFieldPath: e.target.value }))}
                      placeholder='e.g. "status" or "data.lead_id"'
                      className="font-mono text-[11px] text-white h-8"
                    />
                    <p className="text-[9px] text-muted-foreground/50">Dot-notation path into the response JSON (e.g. "status", "data.result.id")</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px]">Operator</Label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {OPERATORS.map((op) => (
                          <button
                            key={op.value}
                            type="button"
                            onClick={() => setRule((r) => ({ ...r, operator: op.value as any }))}
                            className={`rounded-md border px-3 py-2 text-[11px] font-medium transition-all ${
                              rule.operator === op.value
                                ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                                : 'border-white/[0.10] text-muted-foreground hover:border-white/[0.14] hover:text-white/70'
                            }`}
                          >
                            {op.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px]">Expected Value</Label>
                      <Input
                        value={rule.expectedValue}
                        onChange={(e) => setRule((r) => ({ ...r, expectedValue: e.target.value }))}
                        placeholder={rule.operator === 'exists' ? 'Not needed for Exists' : 'e.g. success'}
                        disabled={rule.operator === 'exists'}
                        className="font-mono text-[11px] text-white h-8 disabled:opacity-40"
                      />
                      <p className="text-[9px] text-muted-foreground/50">
                        {rule.operator === 'exists' ? 'Checks the field is present and non-empty' : 'Value to compare against'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Test against sample */}
                <div className="space-y-2">
                  <Label className="text-[11px]">Test against sample response</Label>
                  <textarea
                    value={sampleResponseText}
                    onChange={(e) => setSampleResponseText(e.target.value)}
                    placeholder={'Paste a sample buyer response JSON here...\n\n{\n  "status": "success",\n  "lead_id": "abc123"\n}'}
                    className="w-full h-28 rounded-lg border border-white/[0.08] bg-[#151d33] p-3 font-mono text-[11px] text-white/70 placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                    spellCheck={false}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => previewAcceptMutation.mutate()}
                    disabled={previewAcceptMutation.isPending || !sampleResponseText.trim() || !rule.responseFieldPath}
                  >
                    {previewAcceptMutation.isPending ? <Loader2 size={10} className="mr-1 animate-spin" /> : null}
                    Run Preview
                  </Button>

                  {previewAcceptResult && (
                    <div className={`rounded-lg border px-3 py-2.5 text-[11px] ${
                      previewAcceptResult.accepted
                        ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
                        : 'border-red-500/30 bg-red-500/5 text-red-300'
                    }`}>
                      <div className="flex items-center gap-1.5 font-medium mb-1">
                        {previewAcceptResult.accepted ? <Check size={12} /> : <XIcon size={12} />}
                        {previewAcceptResult.accepted ? 'Would be Accepted' : 'Would be Rejected'}
                      </div>
                      <p className="text-[10px] opacity-80">{previewAcceptResult.reason}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

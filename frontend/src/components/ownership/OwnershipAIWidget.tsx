import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const quickActions = [
  { label: 'Explain routing', prompt: 'Explain how leads are routed to buyers in this system' },
  { label: 'Check anomalies', prompt: 'Check for routing anomalies or unusual assignment patterns' },
  { label: 'Delivery issues', prompt: 'What common delivery issues should I look for?' },
  { label: 'AI recommendations', prompt: 'Suggest improvements for lead routing efficiency' },
]

export function OwnershipAIWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  let msgId = 0
  const nextId = () => `ai_${++msgId}_${Date.now()}`

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages((prev) => [...prev, { id: nextId(), role, content }])
  }

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    addMessage('user', msg)
    setLoading(true)

    setTimeout(() => {
      addMessage('assistant', getResponse(msg))
      setLoading(false)
    }, 800)
  }

  const getResponse = (query: string): string => {
    const q = query.toLowerCase()
    if (q.includes('explain') && q.includes('routing')) {
      return 'Leads are routed through a multi-stage pipeline: 1) Location enrichment normalizes state/country. 2) Eligibility filters active buyers by territory. 3) Mode selection picks round-robin, weighted, priority, or exclusive based on buyer config. 4) Assignment records ownership and triggers delivery. Each step is logged immutably for full traceability.'
    }
    if (q.includes('anomal') || q.includes('unusual')) {
      return 'Current routing health looks stable. Common anomalies to watch: repeated fallback assignments (indicates capacity issues), rapid reassignments (ownership thrashing), failed syncs after assignment (CRM integration errors). No anomalies detected in recent routing events.'
    }
    if (q.includes('delivery') || q.includes('issue') || q.includes('fail')) {
      return 'Common delivery issues: 1) Webhook endpoint timeout (lead buyer CRM may be down). 2) Invalid API key on GHL integration. 3) Payload schema mismatch. 4) Rate limiting on external CRM. Check /delivery/logs for error details. Failed deliveries auto-retry up to 3 times with exponential backoff.'
    }
    if (q.includes('suggest') || q.includes('improve') || q.includes('efficien')) {
      return 'Based on your routing patterns: 1) Consider enabling state-based routing for high-volume regions. 2) Review buyer capacity allocation — some buyers may need cap adjustments. 3) Enable CRM sync retries for more resilient delivery. 4) Use priority mode for premium lead sources. Would you like me to analyze any specific area?'
    }
    if (q.includes('ownership') || q.includes('who owns')) {
      return 'Ownership tracking preserves full audit history: each lead has a current owner (buyer or unassigned), original owner identity, reassignment count, and immutable event log. Ownership can be locked to prevent further changes. Use the reassignment panel to transfer ownership while preserving history.'
    }
    return 'I can help with: routing explanations, anomaly detection, delivery debugging, performance recommendations, ownership tracking, and CRM sync monitoring. What would you like to explore?'
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        aria-label="AI Operations Assistant"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
        </svg>
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex w-[340px] max-w-[calc(100vw-40px)] flex-col rounded-2xl border bg-background shadow-2xl">
          <div className="flex items-center justify-between rounded-t-2xl border-b bg-gradient-to-r from-indigo-600/10 to-violet-600/10 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-bold text-white">AI</div>
              <div>
                <p className="text-sm font-semibold">Ops Assistant</p>
                <p className="text-[10px] text-muted-foreground">Routing & Ownership Copilot</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-[280px] max-h-[380px]">
            {messages.length === 0 && !loading && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center py-2">
                  Ask about routing, ownership, or delivery
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleSend(action.prompt)}
                      className="rounded-lg border bg-muted/30 px-2.5 py-2 text-[11px] text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-3">
            <div className="flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-1.5">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Ask about routing, ownership..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                disabled={loading}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

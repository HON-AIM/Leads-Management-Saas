import { useState, useRef, useEffect } from 'react'
import { useAiStore } from '@/stores/aiStore'
import { AiMessageBubble } from './AiMessageBubble'
import { AiQuickActions } from './AiQuickActions'

export function AiChatWidget() {
  const {
    open, messages, loading, error,
    toggle, sendMessage, startSession, closeWidget,
  } = useAiStore()

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const handleSend = () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    sendMessage(text)
  }

  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      <button
        onClick={toggle}
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        aria-label="AI Assistant"
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex w-[360px] max-w-[calc(100vw-40px)] flex-col rounded-2xl border bg-background shadow-2xl">
          <div className="flex items-center justify-between rounded-t-2xl border-b bg-gradient-to-r from-purple-600/10 to-blue-600/10 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-[10px] font-bold text-white">
                AI
              </div>
              <div>
                <p className="text-sm font-semibold">AI Assistant</p>
                <p className="text-[10px] text-muted-foreground">Lead Distribution Copilot</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { startSession() }}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                title="New conversation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </button>
              <button
                onClick={closeWidget}
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                title="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-[320px] max-h-[420px]">
            {messages.map((msg) => (
              <AiMessageBubble key={msg.id} message={msg} />
            ))}

            {loading && (
              <div className="flex gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-[10px] font-bold text-white">
                  AI
                </div>
                <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {error && messages.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-4">
                Could not connect to AI service. Using local mode.
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && !loading && (
            <AiQuickActions onAction={handleQuickAction} visible={true} />
          )}

          <div className="border-t p-3">
            <div className="flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-1.5">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about leads, routing, buyers..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              AI-powered insights · Data may be cached
            </p>
          </div>
        </div>
      )}
    </>
  )
}

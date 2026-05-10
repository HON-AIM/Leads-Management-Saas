import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const QUICK_PROMPTS = [
  { label: 'Optimize Route', prompt: 'Optimize delivery route for the selected territory' },
  { label: 'Fix Address', prompt: 'Fix address format for lead normalization' },
  { label: 'Assign Territory', prompt: 'Suggest territory assignment for this address' },
  { label: 'Review Results', prompt: 'Review recent normalization results' },
]

let msgId = 0
const nextId = () => `ai_msg_${++msgId}`

export function LocationAIWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { id: nextId(), role: 'assistant', content: 'Hello! I can help you manage locations, normalize addresses, and optimize delivery areas. How can I assist?' },
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = { id: nextId(), role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    setTimeout(() => {
      const botMsg: Message = {
        id: nextId(),
        role: 'assistant',
        content: getBotResponse(text),
      }
      setMessages((prev) => [...prev, botMsg])
    }, 600)
  }

  return (
    <>
      {open && (
        <Card className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 shadow-xl border">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Location AI Assistant</CardTitle>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </Button>
          </CardHeader>
          <Separator />
          <CardContent className="p-3">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((qp) => (
                <Button key={qp.label} variant="outline" size="sm" className="text-xs" onClick={() => handleSend(qp.prompt)}>
                  {qp.label}
                </Button>
              ))}
            </div>
            <div className="mb-3 max-h-60 space-y-2 overflow-y-auto">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSend(input) }} className="flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about locations..." className="text-sm" />
              <Button type="submit" size="sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Button
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg"
        onClick={() => setOpen(!open)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </Button>
    </>
  )
}

function getBotResponse(input: string): string {
  const lower = input.toLowerCase()
  if (lower.includes('optimize') || lower.includes('route')) {
    return 'I can help optimize delivery routes. Please select a territory on the Map tab and I will suggest the most efficient route based on lead density and traffic patterns.'
  }
  if (lower.includes('address') || lower.includes('normalize')) {
    return 'Address normalization standardizes lead addresses for consistent delivery. You can run a normalization batch from the Normalization tab, or paste an address here and I will suggest corrections.'
  }
  if (lower.includes('territory') || lower.includes('assign')) {
    return 'To assign a territory, go to the Territories tab and use the edit action. I can suggest the best territory based on the address geolocation and current workload distribution.'
  }
  if (lower.includes('review') || lower.includes('result')) {
    return 'Recent normalization run completed. Overall confidence: 87%. 1,240 addresses normalized, 23 ambiguous, 5 failed. Check the Ambiguous Leads queue for items needing your review.'
  }
  return 'I can help with location management tasks. Try one of the quick prompts above, or ask me about routes, addresses, territories, or normalization results.'
}

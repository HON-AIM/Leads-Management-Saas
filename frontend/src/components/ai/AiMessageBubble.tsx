import type { AiMessage } from '@/types/ai'

interface AiMessageBubbleProps {
  message: AiMessage
}

export function AiMessageBubble({ message }: AiMessageBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-[10px] font-bold text-white shadow-sm">
        AI
      </div>
      <div className="max-w-[85%] space-y-1">
        <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm leading-relaxed">
          <MarkdownRenderer content={message.content} />
        </div>
        {message.type && message.type !== 'greeting' && message.type !== 'error' && (
          <div className="flex items-center gap-1.5 px-1">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary capitalize">
              {message.type.replace(/_/g, ' ')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let inList = false
  let listItems: React.ReactNode[] = []
  let inCodeBlock = false
  let codeLines: string[] = []
  let listOrdered = false

  const flushList = (key: number) => {
    if (listItems.length > 0) {
      const Tag = listOrdered ? 'ol' : 'ul'
      elements.push(
        <Tag key={key} className="space-y-0.5 my-1.5 pl-5">
          {listItems}
        </Tag>
      )
      listItems = []
      inList = false
    }
  }

  const flushCode = (key: number) => {
    if (codeLines.length > 0) {
      elements.push(
        <pre key={key} className="bg-muted/80 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono leading-relaxed">
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
      codeLines = []
    }
  }

  let listKey = 0
  let codeKey = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushCode(codeKey++)
        inCodeBlock = false
      } else {
        flushList(listKey++)
        inCodeBlock = true
        codeLines = []
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    const trimmed = line.trim()

    if (!trimmed) {
      flushList(listKey++)
      elements.push(<div key={`p-${i}`} className="h-1" />)
      continue
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        flushList(listKey++)
        inList = true
        listOrdered = false
      }
      const text = renderInline(trimmed.slice(2))
      listItems.push(<li key={`li-${i}`} className="text-sm">{text}</li>)
      continue
    }

    if (/^\d+[.)]\s/.test(trimmed)) {
      if (!inList) {
        flushList(listKey++)
        inList = true
        listOrdered = true
      }
      const text = renderInline(trimmed.replace(/^\d+[.)]\s/, ''))
      listItems.push(<li key={`li-${i}`} className="text-sm">{text}</li>)
      continue
    }

    flushList(listKey++)

    if (trimmed.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-sm font-semibold mt-3 mb-1">{renderInline(trimmed.slice(4))}</h3>)
    } else if (trimmed.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-base font-semibold mt-3 mb-1">{renderInline(trimmed.slice(3))}</h2>)
    } else if (trimmed.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-lg font-bold mt-3 mb-1">{renderInline(trimmed.slice(2))}</h1>)
    } else if (/^\|.+\|$/.test(trimmed)) {
      const cells = trimmed.split('|').filter(Boolean).map((c) => c.trim())
      if (cells.every((c) => /^[-:]+$/.test(c))) continue
      elements.push(
        <div key={i} className="flex gap-2 text-xs my-1 font-mono">
          {cells.map((c, j) => (
            <span key={j} className="flex-1 text-muted-foreground">{c}</span>
          ))}
        </div>
      )
    } else {
      elements.push(<p key={i} className="text-sm leading-relaxed">{renderInline(trimmed)}</p>)
    }
  }

  flushList(listKey++)
  flushCode(codeKey++)

  return <div className="space-y-0.5">{elements}</div>
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let idx = 0

  const boldRegex = /\*\*(.+?)\*\*/g
  const italicRegex = /\*(.+?)\*/g
  const codeRegex = /`(.+?)`/g
  const emojiRegex = /([\u{1F000}-\u{1FFFF}]|[\u2600-\u27BF]|[\u{2700}-\u{27BF}])/gu

  let lastIndex = 0
  const matches: { start: number; end: number; type: string; content: string }[] = []

  let m: RegExpExecArray | null
  while ((m = boldRegex.exec(text)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, type: 'bold', content: m[1] })
  }
  while ((m = italicRegex.exec(text)) !== null) {
    if (!matches.some((x) => x.start <= m!.index && x.end >= m!.index + m![0].length)) {
      matches.push({ start: m.index, end: m.index + m[0].length, type: 'italic', content: m[1] })
    }
  }
  while ((m = codeRegex.exec(text)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, type: 'code', content: m[1] })
  }

  matches.sort((a, b) => a.start - b.start)

  for (const match of matches) {
    if (match.start > lastIndex) {
      parts.push(text.slice(lastIndex, match.start))
    }
    if (match.type === 'bold') {
      parts.push(<strong key={idx++}>{match.content}</strong>)
    } else if (match.type === 'italic') {
      parts.push(<em key={idx++}>{match.content}</em>)
    } else if (match.type === 'code') {
      parts.push(<code key={idx++} className="rounded bg-muted-foreground/20 px-1 py-0.5 text-xs font-mono">{match.content}</code>)
    }
    lastIndex = match.end
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? <>{parts}</> : text
}

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useVariableStore } from '@/stores/variableStore'
import { VariablePicker } from './VariablePicker'
import { X, Braces, Search, Wand2 } from 'lucide-react'

interface PayloadEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  readOnly?: boolean
  minHeight?: string
}

export function PayloadEditor({
  value,
  onChange,
  placeholder = 'Type {{ to insert variables...',
  readOnly = false,
  minHeight = '120px',
}: PayloadEditorProps) {
  const { variables, loaded, fetchVariables, search } = useVariableStore()
  const [showPicker, setShowPicker] = useState(false)
  const [query, setShowQuery] = useState('')
  const [cursorPos, setCursorPos] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchVariables() }, [fetchVariables])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const suggestions = useMemo(() => {
    if (!query) return variables.slice(0, 20)
    return search(query)
  }, [query, search, variables])

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    const pos = e.target.selectionStart || 0
    onChange(val)
    setCursorPos(pos)

    const before = val.substring(0, pos)
    const openIdx = before.lastIndexOf('{{')
    if (openIdx !== -1) {
      const afterOpen = before.substring(openIdx + 2)
      if (!afterOpen.includes('}}')) {
        setShowPicker(true)
        setShowQuery(afterOpen.trim())
        return
      }
    }
    setShowPicker(false)
  }, [onChange])

  const insertVariable = useCallback((template: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const before = value.substring(0, cursorPos)
    const after = value.substring(cursorPos)
    const openIdx = before.lastIndexOf('{{')
    const newBefore = openIdx !== -1 ? before.substring(0, openIdx) : before
    const newValue = newBefore + template + after
    onChange(newValue)
    setShowPicker(false)

    requestAnimationFrame(() => {
      const newPos = newBefore.length + template.length
      textarea.focus()
      textarea.setSelectionRange(newPos, newPos)
    })
  }, [value, cursorPos, onChange])

  const handleInsertPicker = useCallback((template: string) => {
    insertVariable(template)
  }, [insertVariable])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowPicker(false)
    }
  }, [])

  return (
    <div className="relative" ref={pickerRef}>
      <div className="relative rounded-lg border border-white/[0.08] bg-[#0a0f1e] focus-within:border-blue-500/30 transition-colors">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/40">
            <Braces size={12} />
            <span>Payload Template</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="rounded p-1 text-muted-foreground/40 hover:bg-white/[0.04] hover:text-white/60 transition-colors"
              title="Open variable picker"
            >
              <Wand2 size={12} />
            </button>
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          placeholder={placeholder}
          className="w-full resize-none bg-transparent p-3 font-mono text-[12px] text-white/80 placeholder:text-muted-foreground/30 outline-none"
          style={{ minHeight }}
          spellCheck={false}
        />
      </div>

      {showPicker && !readOnly && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1">
          <div className="rounded-lg border border-white/[0.08] bg-[#0e1428] shadow-elevated max-h-[300px] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
              <Search size={12} className="text-muted-foreground/40" />
              <input
                value={query}
                onChange={(e) => setShowQuery(e.target.value)}
                placeholder="Filter variables..."
                className="flex-1 bg-transparent text-[11px] text-white placeholder:text-muted-foreground/30 outline-none"
                autoFocus
              />
              <button onClick={() => setShowPicker(false)} className="text-muted-foreground/30 hover:text-white/70">
                <X size={12} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[260px] p-1.5">
              {suggestions.length === 0 ? (
                <p className="p-3 text-center text-[11px] text-muted-foreground/30">No matching variables</p>
              ) : (
                suggestions.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => handleInsertPicker(`{{${v.key}}}`)}
                    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-white/80">{v.label}</span>
                        <span className="text-[9px] text-muted-foreground/30">{v.category}</span>
                      </div>
                      <code className="text-[10px] text-blue-400/60 font-mono">{`{{${v.key}}}`}</code>
                    </div>
                    <span className="text-[9px] text-muted-foreground/25">Example: {String(v.example)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PayloadEditor

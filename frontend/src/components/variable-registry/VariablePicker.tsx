import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useVariableStore } from '@/stores/variableStore'
import { Search, ChevronRight, ChevronDown, Tag, Hash, Type, ToggleLeft, Calendar, List, Box } from 'lucide-react'
import type { Variable } from '@/types/variable'

interface VariablePickerProps {
  onSelect?: (variable: Variable) => void
  insertAtCursor?: (template: string) => void
  filterCategory?: string
  showSearch?: boolean
  maxHeight?: string
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  string: <Type size={12} className="text-blue-400" />,
  number: <Hash size={12} className="text-amber-400" />,
  boolean: <ToggleLeft size={12} className="text-emerald-400" />,
  date: <Calendar size={12} className="text-purple-400" />,
  array: <List size={12} className="text-cyan-400" />,
  object: <Box size={12} className="text-rose-400" />,
}

const CATEGORY_COLORS: Record<string, string> = {
  Lead: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Buyer: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Campaign: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Assignment: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  System: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
}

export function VariablePicker({
  onSelect,
  insertAtCursor,
  filterCategory,
  showSearch = true,
  maxHeight = '400px',
}: VariablePickerProps) {
  const { variables, categories, loaded, loading, fetchVariables, getByCategory } = useVariableStore()
  const [query, setQuery] = useState('')
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['Lead', 'Buyer', 'Campaign', 'Assignment', 'System']))
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchVariables() }, [fetchVariables])

  const filteredVariables = useMemo(() => {
    let vars = variables
    if (filterCategory) vars = vars.filter((v) => v.category === filterCategory)
    if (!query) return vars
    const q = query.toLowerCase()
    return vars.filter(
      (v) => v.key.toLowerCase().includes(q) || v.label.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
    )
  }, [variables, query, filterCategory])

  const grouped = useMemo(() => {
    const map = new Map<string, Variable[]>()
    for (const v of filteredVariables) {
      if (!map.has(v.category)) map.set(v.category, [])
      map.get(v.category)!.push(v)
    }
    return map
  }, [filteredVariables])

  const toggleCategory = useCallback((cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }, [])

  const handleInsert = useCallback((v: Variable) => {
    setSelectedKey(v.key)
    const template = `{{${v.key}}}`
    onSelect?.(v)
    insertAtCursor?.(template)
  }, [onSelect, insertAtCursor])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setQuery('')
      searchRef.current?.blur()
    }
  }, [])

  if (loading && !loaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-lg border border-white/[0.08] bg-[#0e1428] shadow-elevated" style={{ maxHeight }}>
      {showSearch && (
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
          <Search size={14} className="text-muted-foreground/50 shrink-0" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search variables..."
            className="flex-1 bg-transparent text-[12px] text-white placeholder:text-muted-foreground/40 outline-none"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground/40 hover:text-white/60 transition-colors">
              ×
            </button>
          )}
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto p-1.5" style={{ maxHeight: showSearch ? `calc(${maxHeight} - 40px)` : maxHeight }}>
        {!loaded ? (
          <p className="p-4 text-center text-[11px] text-muted-foreground/40">No variables loaded</p>
        ) : filteredVariables.length === 0 ? (
          <p className="p-4 text-center text-[11px] text-muted-foreground/40">No matching variables</p>
        ) : (
          Array.from(grouped.entries()).map(([category, vars]) => {
            const isOpen = openCategories.has(category)
            return (
              <div key={category} className="mb-1">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground/60 hover:bg-white/[0.02] transition-colors"
                >
                  {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Tag size={10} />
                  <span className="flex-1 text-left">{category}</span>
                  <span className="text-[10px] text-muted-foreground/30">{vars.length}</span>
                </button>
                {isOpen && (
                  <div className="ml-1 space-y-0.5">
                    {vars.map((v) => (
                      <button
                        key={v.key}
                        onClick={() => handleInsert(v)}
                        className={`group flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors ${
                          selectedKey === v.key
                            ? 'bg-blue-500/10 border border-blue-500/20'
                            : 'hover:bg-white/[0.02] border border-transparent'
                        }`}
                      >
                        <span className="mt-0.5 shrink-0">{TYPE_ICONS[v.type] || <Type size={12} className="text-muted-foreground/40" />}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-white/80 truncate">{v.label}</span>
                            <span className="shrink-0 rounded bg-white/[0.04] px-1 py-0.5 text-[9px] font-mono text-muted-foreground/40">{v.type}</span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-muted-foreground/40 leading-relaxed line-clamp-1">{v.description}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <code className="text-[10px] text-blue-400/70 font-mono">{`{{${v.key}}}`}</code>
                            <span className="text-[10px] text-muted-foreground/30">Example: {String(v.example)}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default VariablePicker

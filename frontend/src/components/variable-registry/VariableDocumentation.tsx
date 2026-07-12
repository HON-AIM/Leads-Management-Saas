import { useState, useEffect, useMemo } from 'react'
import { useVariableStore } from '@/stores/variableStore'
import { BookOpen, ChevronDown, ChevronRight, Copy, Check, Search } from 'lucide-react'
import type { DocCategory } from '@/types/variable'

interface VariableDocumentationProps {
  className?: string
  filterCategory?: string
}

export function VariableDocumentation({ className, filterCategory }: VariableDocumentationProps) {
  const { docs, loaded, loading, fetchVariables } = useVariableStore()
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => { if (!loaded) fetchVariables() }, [loaded, fetchVariables])

  const filtered = useMemo(() => {
    let cats = docs
    if (filterCategory) cats = cats.filter((d) => d.category === filterCategory)
    if (!query) return cats
    const q = query.toLowerCase()
    return cats
      .map((cat) => ({
        ...cat,
        variables: cat.variables.filter(
          (v) => v.variable.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.variables.length > 0)
  }, [docs, query, filterCategory])

  const toggle = (cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const copyVar = async (key: string) => {
    await navigator.clipboard.writeText(`{{${key}}}`)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  if (loading && !loaded) {
    return (
      <div className={`rounded-lg border border-white/[0.08] bg-[#0e1428] p-6 ${className || ''}`}>
        <div className="flex items-center justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-white/[0.08] bg-[#0e1428] ${className || ''}`}>
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <div className="flex items-center gap-2 text-[12px] font-medium text-white/80">
          <BookOpen size={14} className="text-blue-400" />
          Variable Reference
        </div>
        <span className="text-[10px] text-muted-foreground/30">
          {filtered.reduce((sum, c) => sum + c.variables.length, 0)} variables
        </span>
      </div>

      <div className="border-b border-white/[0.06] px-4 py-2">
        <div className="flex items-center gap-2 rounded-md bg-white/[0.02] px-2.5 py-1.5">
          <Search size={12} className="text-muted-foreground/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search variables..."
            className="flex-1 bg-transparent text-[11px] text-white placeholder:text-muted-foreground/30 outline-none"
          />
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-[11px] text-muted-foreground/30">No matching variables</p>
        ) : (
          filtered.map((cat: DocCategory) => {
            const isOpen = openCategories.has(cat.category)
            return (
              <div key={cat.category}>
                <button
                  onClick={() => toggle(cat.category)}
                  className="flex w-full items-center gap-2 px-4 py-2 text-[11px] font-medium text-muted-foreground/50 hover:bg-white/[0.02] transition-colors"
                >
                  {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span className="flex-1 text-left">{cat.category}</span>
                  <span className="text-[10px] text-muted-foreground/25">{cat.variables.length}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-2">
                    <table className="w-full">
                      <thead>
                        <tr className="text-[10px] text-muted-foreground/30 border-b border-white/[0.06]">
                          <th className="pb-1.5 text-left font-medium">Variable</th>
                          <th className="pb-1.5 text-left font-medium">Description</th>
                          <th className="pb-1.5 text-left font-medium">Example</th>
                          <th className="pb-1.5 text-left font-medium">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.variables.map((v) => (
                          <tr key={v.variable} className="border-b border-white/[0.02] group">
                            <td className="py-1.5 pr-3">
                              <div className="flex items-center gap-1.5">
                                <code className="text-[10px] text-blue-400/70 font-mono">{`{{${v.variable}}}`}</code>
                                <button
                                  onClick={() => copyVar(v.variable)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  {copiedKey === v.variable ? (
                                    <Check size={9} className="text-emerald-400" />
                                  ) : (
                                    <Copy size={9} className="text-muted-foreground/30 hover:text-white/70" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-1.5 pr-3 text-[10px] text-muted-foreground/50">{v.description}</td>
                            <td className="py-1.5 pr-3 text-[10px] text-white/60 font-mono">{String(v.example)}</td>
                            <td className="py-1.5 text-[9px] text-muted-foreground/30">
                              <span className="rounded bg-white/[0.04] px-1 py-0.5">{v.type}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

export default VariableDocumentation

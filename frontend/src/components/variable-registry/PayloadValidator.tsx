import { useState, useEffect, useCallback } from 'react'
import { useVariableStore } from '@/stores/variableStore'
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { ValidationResult, ValidationError } from '@/types/variable'

interface PayloadValidatorProps {
  template: string
  className?: string
  onValidation?: (result: ValidationResult) => void
}

export function PayloadValidator({ template, className, onValidation }: PayloadValidatorProps) {
  const { loaded, fetchVariables, validateTemplate } = useVariableStore()
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!loaded) fetchVariables()
  }, [loaded, fetchVariables])

  const validate = useCallback(async () => {
    if (!template.trim()) {
      setResult({ valid: true, errors: [] })
      return
    }
    setLoading(true)
    try {
      const res = await validateTemplate(template)
      setResult(res)
      onValidation?.(res)
    } catch {
      setResult({ valid: false, errors: [{ variable: '', position: 0, suggestion: null }] })
    } finally {
      setLoading(false)
    }
  }, [template, validateTemplate, onValidation])

  useEffect(() => {
    const timer = setTimeout(validate, 300)
    return () => clearTimeout(timer)
  }, [validate])

  if (!template.trim()) {
    return (
      <div className={`flex items-center gap-2 rounded-lg border border-white/[0.04] bg-[#070b16] px-3 py-2 ${className || ''}`}>
        <ShieldCheck size={14} className="text-muted-foreground/30" />
        <span className="text-[11px] text-muted-foreground/30">Enter a template to validate</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 rounded-lg border border-white/[0.04] bg-[#070b16] px-3 py-2 ${className || ''}`}>
        <Loader2 size={12} className="animate-spin text-blue-400" />
        <span className="text-[11px] text-muted-foreground/40">Validating...</span>
      </div>
    )
  }

  if (!result) return null

  if (result.valid) {
    return (
      <div className={`flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 ${className || ''}`}>
        <CheckCircle size={14} className="text-emerald-400" />
        <span className="text-[11px] text-emerald-400">All variables valid</span>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 ${className || ''}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <AlertTriangle size={14} className="text-red-400" />
        <span className="text-[11px] font-medium text-red-400">
          {result.errors.length} unknown variable{result.errors.length > 1 ? 's' : ''} found
        </span>
      </div>
      <div className="space-y-1">
        {result.errors.map((err: ValidationError, i: number) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <XCircle size={10} className="text-red-400/60 shrink-0" />
            <span className="text-red-300/80 font-mono">{`{{${err.variable}}}`}</span>
            {err.suggestion && (
              <span className="text-muted-foreground/40">
                → Did you mean <span className="text-blue-400">{`{{${err.suggestion}}}`}</span>?
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default PayloadValidator

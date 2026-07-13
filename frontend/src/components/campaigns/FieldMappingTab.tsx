import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/useNotifications'
import type { FieldDefinition, FieldDefinitionFormData } from '@/types/fieldDefinition'
import type { Campaign } from '@/types/campaign'
import { Plus, Trash2, Eye, EyeOff, Check, X, Download, Lock, Search } from 'lucide-react'

interface FieldMappingTabProps {
  campaignId: string
  campaign: Campaign
}

const TYPE_OPTIONS = ['String', 'Number', 'Boolean', 'Phone', 'Email', 'List', 'Date'] as const

const EMPTY_FORM: FieldDefinitionFormData = {
  fieldName: '',
  description: '',
  type: 'String',
  isRequired: false,
  visibleInPortal: true,
  listOptions: [],
}

export function FieldMappingTab({ campaignId, campaign }: FieldMappingTabProps) {
  const qc = useQueryClient()
  const { addNotification } = useNotifications()
  const [showAddForm, setShowAddForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [form, setForm] = useState<FieldDefinitionFormData>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [listOptionInput, setListOptionInput] = useState('')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [importCampaignId, setImportCampaignId] = useState('')

  const { data: fields, isLoading } = useQuery<FieldDefinition[]>({
    queryKey: ['campaign-fields', campaignId],
    queryFn: async () => {
      const { data } = await api.get(`/campaigns/${campaignId}/fields`)
      return data.data ?? data
    },
    enabled: !!campaignId,
  })

  const { data: campaignsData } = useQuery<{ success: boolean; data: Campaign[] }>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data } = await api.get('/campaigns', { params: { limit: 200 } })
      return data
    },
    enabled: showImport,
  })

  const createMutation = useMutation({
    mutationFn: async (f: FieldDefinitionFormData) => {
      const { data } = await api.post(`/campaigns/${campaignId}/fields`, f)
      return data
    },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Created', description: 'Field added' })
      qc.invalidateQueries({ queryKey: ['campaign-fields', campaignId] })
      setForm(EMPTY_FORM)
      setShowAddForm(false)
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Error', description: err?.response?.data?.error || 'Failed to create field' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FieldDefinition> }) => {
      const { data: res } = await api.put(`/campaigns/${campaignId}/fields/${id}`, data)
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-fields', campaignId] })
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Error', description: err?.response?.data?.error || 'Failed to update' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/campaigns/${campaignId}/fields/${id}`) },
    onSuccess: () => {
      addNotification({ type: 'success', title: 'Deleted', description: 'Field removed' })
      qc.invalidateQueries({ queryKey: ['campaign-fields', campaignId] })
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Error', description: err?.response?.data?.error || 'Failed to delete' })
    },
  })

  const importMutation = useMutation({
    mutationFn: async (fromCampaignId: string) => {
      const { data } = await api.post(`/campaigns/${campaignId}/fields/import`, { fromCampaignId })
      return data
    },
    onSuccess: (data: any) => {
      const imported = data.data?.length ?? 0
      addNotification({ type: 'success', title: 'Imported', description: `Imported ${imported} field(s)` })
      qc.invalidateQueries({ queryKey: ['campaign-fields', campaignId] })
      setShowImport(false)
      setImportCampaignId('')
    },
    onError: (err: any) => {
      addNotification({ type: 'error', title: 'Error', description: err?.response?.data?.error || 'Import failed' })
    },
  })

  function validateFieldName(name: string): string {
    const trimmed = name.trim()
    if (!trimmed) return 'Field name is required'
    if (!/^[a-z][a-z0-9_]*$/.test(trimmed)) return 'Must be lowercase letters, numbers, and underscores, starting with a letter'
    if (fields?.some((f) => f.fieldName === trimmed)) return 'A field with this name already exists'
    return ''
  }

  function handleAddField() {
    const err = validateFieldName(form.fieldName)
    if (err) { setFormError(err); return }
    createMutation.mutate({ ...form, fieldName: form.fieldName.trim() })
  }

  function togglePortal(field: FieldDefinition) {
    updateMutation.mutate({ id: field._id, data: { visibleInPortal: !field.visibleInPortal } })
  }

  function toggleRequired(field: FieldDefinition) {
    updateMutation.mutate({ id: field._id, data: { isRequired: !field.isRequired } })
  }

  function saveDescription(field: FieldDefinition) {
    updateMutation.mutate({ id: field._id, data: { description: editDesc } })
    setEditingField(null)
  }

  const standardFields = fields?.filter((f) => f.isStandard) || []
  const customFields = fields?.filter((f) => !f.isStandard) || []
  const otherCampaigns = (campaignsData?.data || []).filter((c) => c._id !== campaignId)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 skeleton bg-white/[0.05] rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowImport(!showImport)}>
          <Download size={12} className="mr-1" /> Import from Campaign
        </Button>
        <Button variant="cta" size="sm" onClick={() => { setShowAddForm(!showAddForm); setForm(EMPTY_FORM); setFormError('') }}>
          <Plus size={12} className="mr-1" /> Add Field
        </Button>
      </div>

      {/* Import picker */}
      {showImport && (
        <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] p-4 space-y-3">
          <h4 className="text-[12px] font-semibold text-white">Import Custom Fields</h4>
          <p className="text-[11px] text-muted-foreground">Copy custom (non-standard) fields from another campaign. Duplicates by name are skipped.</p>
          <div className="flex items-center gap-2">
            <select
              value={importCampaignId}
              onChange={(e) => setImportCampaignId(e.target.value)}
              className="flex-1 rounded-lg border border-white/[0.08] bg-[#0a0f1e] px-3 py-2 text-[12px] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="" className="bg-[#0a0f1e]">Select a campaign...</option>
              {otherCampaigns.map((c) => (
                <option key={c._id} value={c._id} className="bg-[#0a0f1e]">{c.name}</option>
              ))}
            </select>
            <Button variant="cta" size="sm" disabled={!importCampaignId || importMutation.isPending}
              onClick={() => importMutation.mutate(importCampaignId)}>
              {importMutation.isPending ? 'Importing...' : 'Import'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowImport(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Add field form */}
      {showAddForm && (
        <div className="rounded-xl border border-blue-500/20 bg-[#0e1428] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[12px] font-semibold text-white">New Custom Field</h4>
            <button onClick={() => setShowAddForm(false)} className="text-muted-foreground hover:text-white transition-colors"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Field Name *</label>
              <input value={form.fieldName} onChange={(e) => { setForm({ ...form, fieldName: e.target.value }); setFormError('') }}
                placeholder="e.g. motivacion"
                className="w-full rounded-lg border border-white/[0.08] bg-[#0a0f1e] px-3 py-2 text-[12px] font-mono text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30" />
              {formError && <p className="text-[11px] text-red-400">{formError}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as FieldDefinition['type'] })}
                className="w-full rounded-lg border border-white/[0.08] bg-[#0a0f1e] px-3 py-2 text-[12px] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30">
                {TYPE_OPTIONS.map((t) => <option key={t} value={t} className="bg-[#0a0f1e]">{t}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What this field represents"
              className="w-full rounded-lg border border-white/[0.08] bg-[#0a0f1e] px-3 py-2 text-[12px] text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30" />
          </div>
          {form.type === 'List' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">List Options</label>
              <div className="flex gap-2">
                <input value={listOptionInput} onChange={(e) => setListOptionInput(e.target.value)}
                  placeholder="Add option and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && listOptionInput.trim()) {
                      e.preventDefault()
                      setForm({ ...form, listOptions: [...form.listOptions, listOptionInput.trim()] })
                      setListOptionInput('')
                    }
                  }}
                  className="flex-1 rounded-lg border border-white/[0.08] bg-[#0a0f1e] px-3 py-2 text-[12px] text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30" />
              </div>
              {form.listOptions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {form.listOptions.map((opt, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/70">
                      {opt}
                      <button onClick={() => setForm({ ...form, listOptions: form.listOptions.filter((_, j) => j !== i) })}
                        className="text-muted-foreground hover:text-red-400"><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isRequired} onChange={(e) => setForm({ ...form, isRequired: e.target.checked })}
                className="rounded border-white/[0.2] bg-[#0a0f1e] text-blue-500 focus:ring-blue-500/20" />
              <span className="text-[12px] text-white/70">Required</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.visibleInPortal} onChange={(e) => setForm({ ...form, visibleInPortal: e.target.checked })}
                className="rounded border-white/[0.2] bg-[#0a0f1e] text-blue-500 focus:ring-blue-500/20" />
              <span className="text-[12px] text-white/70">Visible in portal</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button variant="cta" size="sm" disabled={!form.fieldName.trim() || createMutation.isPending} onClick={handleAddField}>
              {createMutation.isPending ? 'Creating...' : 'Create Field'}
            </Button>
          </div>
        </div>
      )}

      {/* Field table */}
      <div className="rounded-xl border border-white/[0.08] bg-[#0e1428] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] text-muted-foreground uppercase tracking-wider">
              <th className="text-left font-medium px-6 py-2.5">Field Name</th>
              <th className="text-left font-medium px-6 py-2.5">Description</th>
              <th className="text-left font-medium px-6 py-2.5">Type</th>
              <th className="text-center font-medium px-3 py-2.5 w-12">Req</th>
              <th className="text-center font-medium px-3 py-2.5 w-12">API</th>
              <th className="text-center font-medium px-3 py-2.5 w-12">Portal</th>
              <th className="text-right font-medium px-6 py-2.5 w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {standardFields.length > 0 && (
              <>
                <tr>
                  <td colSpan={7} className="px-6 pt-4 pb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1.5">
                      <Lock size={10} /> Standard Fields
                    </p>
                  </td>
                </tr>
                {standardFields.map((f) => (
                  <FieldRow key={f._id} field={f} editingField={editingField} setEditingField={setEditingField}
                    editDesc={editDesc} setEditDesc={setEditDesc} saveDescription={saveDescription}
                    togglePortal={togglePortal} toggleRequired={toggleRequired} deleteMutation={deleteMutation}
                    updateMutation={updateMutation} />
                ))}
              </>
            )}
            {customFields.length > 0 && (
              <>
                <tr>
                  <td colSpan={7} className="px-6 pt-4 pb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Custom Fields</p>
                  </td>
                </tr>
                {customFields.map((f) => (
                  <FieldRow key={f._id} field={f} editingField={editingField} setEditingField={setEditingField}
                    editDesc={editDesc} setEditDesc={setEditDesc} saveDescription={saveDescription}
                    togglePortal={togglePortal} toggleRequired={toggleRequired} deleteMutation={deleteMutation}
                    updateMutation={updateMutation} />
                ))}
              </>
            )}
            {standardFields.length === 0 && customFields.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <p className="text-[13px] text-muted-foreground">No fields configured</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FieldRow({ field, editingField, setEditingField, editDesc, setEditDesc, saveDescription, togglePortal, toggleRequired, deleteMutation, updateMutation }: {
  field: FieldDefinition
  editingField: string | null
  setEditingField: (id: string | null) => void
  editDesc: string
  setEditDesc: (v: string) => void
  saveDescription: (f: FieldDefinition) => void
  togglePortal: (f: FieldDefinition) => void
  toggleRequired: (f: FieldDefinition) => void
  deleteMutation: any
  updateMutation: any
}) {
  const [showApiDoc, setShowApiDoc] = useState(false)
  const isEditing = editingField === field._id

  const sampleValue: Record<string, string> = {
    String: '"John"', Number: '42', Boolean: 'true', Phone: '"5551234567"',
    Email: '"john@example.com"', Date: '"2026-01-15"', List: '"option_a"',
  }

  return (
    <tr className={`border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] transition-colors ${field.isStandard ? 'opacity-80' : ''}`}>
      <td className="px-6 py-3">
        <span className="inline-flex items-center rounded-md bg-white/[0.05] px-2 py-0.5 font-mono text-[12px] text-blue-300/90">
          {field.fieldName}
        </span>
      </td>
      <td className="px-6 py-3">
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
              className="flex-1 rounded border border-white/[0.15] bg-[#0a0f1e] px-2 py-1 text-[12px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              onKeyDown={(e) => { if (e.key === 'Enter') saveDescription(field); if (e.key === 'Escape') setEditingField(null) }} />
            <button onClick={() => saveDescription(field)} className="text-emerald-400 hover:text-emerald-300"><Check size={13} /></button>
            <button onClick={() => setEditingField(null)} className="text-muted-foreground hover:text-white"><X size={13} /></button>
          </div>
        ) : (
          <p className="text-[12px] text-white/60 cursor-pointer hover:text-white/80 max-w-[240px] truncate"
            onClick={() => { setEditingField(field._id); setEditDesc(field.description) }}
            title={field.description || 'Click to edit'}>
            {field.description || <span className="italic text-muted-foreground/40">Click to add description</span>}
          </p>
        )}
      </td>
      <td className="px-6 py-3">
        <span className="text-[11px] text-white/50">{field.type}</span>
      </td>
      <td className="px-3 py-3 text-center">
        <button onClick={() => !field.isStandard && toggleRequired(field)}
          className={`inline-flex items-center justify-center ${field.isStandard ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}`}
          disabled={field.isStandard}>
          {field.isRequired
            ? <Check size={14} className="text-emerald-400" />
            : <span className="text-muted-foreground/30">—</span>}
        </button>
      </td>
      <td className="px-3 py-3 text-center">
        <div className="relative inline-block">
          <button onClick={() => setShowApiDoc(!showApiDoc)}
            className="text-muted-foreground hover:text-white/80 transition-colors">
            <Eye size={14} />
          </button>
          {showApiDoc && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowApiDoc(false)} />
              <div className="absolute right-0 top-6 z-50 w-56 rounded-lg border border-white/[0.12] bg-[#151d33] p-3 shadow-xl">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">API Usage</p>
                <pre className="text-[11px] font-mono text-white/70 bg-white/[0.04] rounded p-2 whitespace-pre-wrap">
{`"${field.fieldName}": ${sampleValue[field.type] || '"..."'}`}
                </pre>
              </div>
            </>
          )}
        </div>
      </td>
      <td className="px-3 py-3 text-center">
        <button onClick={() => togglePortal(field)}
          className={`transition-colors ${field.visibleInPortal ? 'text-emerald-400 hover:text-emerald-300' : 'text-muted-foreground/30 hover:text-muted-foreground/60'}`}>
          {field.visibleInPortal ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </td>
      <td className="px-6 py-3 text-right">
        {!field.isStandard && (
          <button onClick={() => {
            if (confirm(`Delete field "${field.fieldName}"?`)) deleteMutation.mutate(field._id)
          }} className="text-muted-foreground hover:text-red-400 transition-colors p-1">
            <Trash2 size={13} />
          </button>
        )}
      </td>
    </tr>
  )
}

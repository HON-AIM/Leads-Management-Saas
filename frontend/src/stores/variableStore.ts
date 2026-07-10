import { create } from 'zustand'
import api from '@/lib/api'
import type { Variable, VariableCategory, ValidationResult, DocCategory } from '@/types/variable'

interface VariableState {
  variables: Variable[]
  categories: VariableCategory[]
  docs: DocCategory[]
  byKey: Map<string, Variable>
  byCategory: Map<string, Variable[]>
  loaded: boolean
  loading: boolean

  fetchVariables: () => Promise<void>
  search: (query: string) => Variable[]
  getByKey: (key: string) => Variable | undefined
  getByCategory: (category: string) => Variable[]
  validateTemplate: (template: string) => Promise<ValidationResult>
  renderTemplate: (template: string, context: Record<string, unknown>) => Promise<string>
  getPreview: () => Promise<Record<string, unknown>>
  getTestPayload: () => Promise<Record<string, unknown>>
}

export const useVariableStore = create<VariableState>((set, get) => ({
  variables: [],
  categories: [],
  docs: [],
  byKey: new Map(),
  byCategory: new Map(),
  loaded: false,
  loading: false,

  fetchVariables: async () => {
    if (get().loaded || get().loading) return
    set({ loading: true })
    try {
      const [varsRes, catsRes, docsRes] = await Promise.all([
        api.get('/variables'),
        api.get('/variables/categories'),
        api.get('/variables/docs'),
      ])
      const variables: Variable[] = varsRes.data.data
      const categories: VariableCategory[] = catsRes.data.data
      const docs: DocCategory[] = docsRes.data.data

      const byKey = new Map<string, Variable>()
      const byCategory = new Map<string, Variable[]>()
      for (const v of variables) {
        byKey.set(v.key, v)
        if (!byCategory.has(v.category)) byCategory.set(v.category, [])
        byCategory.get(v.category)!.push(v)
      }

      set({ variables, categories, docs, byKey, byCategory, loaded: true, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  search: (query) => {
    const { variables } = get()
    if (!query) return variables
    const q = query.toLowerCase()
    return variables.filter(
      (v) =>
        v.key.toLowerCase().includes(q) ||
        v.label.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q)
    )
  },

  getByKey: (key) => get().byKey.get(key),
  getByCategory: (category) => get().byCategory.get(category) || [],

  validateTemplate: async (template) => {
    const res = await api.post('/variables/validate', { template })
    return res.data.data
  },

  renderTemplate: async (template, context) => {
    const res = await api.post('/variables/render', { template, context })
    return res.data.data.rendered
  },

  getPreview: async () => {
    const res = await api.get('/variables/preview')
    return res.data.data
  },

  getTestPayload: async () => {
    const res = await api.get('/variables/test-payload')
    return res.data.data
  },
}))

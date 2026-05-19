import { create } from 'zustand'
import api from '@/lib/api'
import type { OwnershipInfo, RoutingEvent, CrmSyncLog, AuditEvent, RoutingSummary } from '@/types/ownership'

interface OwnershipState {
  selectedLeadId: string | null
  ownership: OwnershipInfo | null
  history: RoutingEvent[]
  historySummary: RoutingSummary | null
  syncLogs: CrmSyncLog[]
  audit: AuditEvent[]
  loading: boolean
  error: string | null

  setSelectedLeadId: (id: string | null) => void
  fetchOwnership: (leadId: string) => Promise<void>
  fetchHistory: (leadId: string) => Promise<void>
  fetchSyncLogs: (params?: { leadId?: string; platform?: string }) => Promise<void>
  fetchAudit: (params?: { eventType?: string; buyerId?: string }) => Promise<void>
  clear: () => void
}

export const useOwnershipStore = create<OwnershipState>((set, get) => ({
  selectedLeadId: null,
  ownership: null,
  history: [],
  historySummary: null,
  syncLogs: [],
  audit: [],
  loading: false,
  error: null,

  setSelectedLeadId: (id) => set({ selectedLeadId: id }),

  fetchOwnership: async (leadId) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/leads/${leadId}/ownership`)
      set({ ownership: data.ownership, audit: data.audit, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  fetchHistory: async (leadId) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/leads/${leadId}/history`)
      set({ history: data.history, historySummary: data.summary, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  fetchSyncLogs: async (params) => {
    set({ loading: true, error: null })
    try {
      const query = new URLSearchParams()
      if (params?.leadId) query.set('leadId', params.leadId)
      if (params?.platform) query.set('platform', params.platform)
      const { data } = await api.get(`/sync/logs?${query.toString()}`)
      set({ syncLogs: data.logs, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  fetchAudit: async (params) => {
    set({ loading: true, error: null })
    try {
      const query = new URLSearchParams()
      if (params?.eventType) query.set('eventType', params.eventType)
      if (params?.buyerId) query.set('buyerId', params.buyerId)
      const { data } = await api.get(`/audit/ownership?${query.toString()}`)
      set({ audit: data.audit, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  clear: () => set({
    selectedLeadId: null, ownership: null, history: [], historySummary: null,
    syncLogs: [], audit: [], loading: false, error: null,
  }),
}))

import { create } from 'zustand'
import api from '@/lib/api'
import type { AiMessage, AiSession } from '@/types/ai'

interface AiStore {
  open: boolean
  sessionId: string | null
  messages: AiMessage[]
  loading: boolean
  error: string | null
  toggle: () => void
  openWidget: () => void
  closeWidget: () => void
  startSession: () => Promise<void>
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
}

let msgId = 0
const nextId = () => `msg_${++msgId}_${Date.now()}`

export const useAiStore = create<AiStore>((set, get) => ({
  open: false,
  sessionId: null,
  messages: [],
  loading: false,
  error: null,

  toggle: () => {
    const { open, messages } = get()
    if (!open && messages.length === 0) {
      get().startSession()
    }
    set({ open: !open, error: null })
  },

  openWidget: () => {
    const { messages } = get()
    if (messages.length === 0) {
      get().startSession()
    }
    set({ open: true, error: null })
  },

  closeWidget: () => set({ open: false, error: null }),

  startSession: async () => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/ai/chat/start', { title: 'AI Assistant' })
      const msg: AiMessage = {
        id: nextId(),
        role: 'assistant',
        content: data.message,
        type: 'greeting',
        timestamp: new Date(),
      }
      set({ sessionId: data.sessionId, messages: [msg], loading: false })
    } catch (err: any) {
      const fallback: AiMessage = {
        id: nextId(),
        role: 'assistant',
        content: "Hello! I'm your AI operations assistant. I can help you analyze leads, routing, buyer performance, and more. What would you like to explore?",
        type: 'greeting',
        timestamp: new Date(),
      }
      set({ messages: [fallback], loading: false, error: err.message })
    }
  },

  sendMessage: async (content: string) => {
    const { sessionId, messages } = get()
    const userMsg: AiMessage = { id: nextId(), role: 'user', content, timestamp: new Date() }
    set({ messages: [...messages, userMsg], loading: true, error: null })

    try {
      const { data } = await api.post('/ai/chat/message', { sessionId, message: content })
      const assistantMsg: AiMessage = {
        id: nextId(),
        role: 'assistant',
        content: data.message,
        type: data.type,
        timestamp: new Date(),
      }
      set((s) => ({ messages: [...s.messages, assistantMsg], loading: false }))
    } catch (err: any) {
      const errorMsg: AiMessage = {
        id: nextId(),
        role: 'assistant',
        content: `I encountered an error: ${err.message}. Please try again or check your connection.`,
        type: 'error',
        timestamp: new Date(),
      }
      set((s) => ({ messages: [...s.messages, errorMsg], loading: false, error: err.message }))
    }
  },

  clearMessages: () => set({ messages: [], sessionId: null }),
}))

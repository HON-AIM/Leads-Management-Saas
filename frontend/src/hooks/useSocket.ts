import { useEffect, useRef, useCallback, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'

type EventHandler = (...args: any[]) => void

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const handlersRef = useRef<Map<string, Set<EventHandler>>>(new Map())
  const user = useAuthStore((s) => s.user)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!user) return

    const socket = io('/', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('connect_error', () => {
      setConnected(false)
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [user?.id, user?.tenantId])

  const subscribe = useCallback((event: string, handler: EventHandler) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, new Set())
    }
    handlersRef.current.get(event)!.add(handler)

    if (socketRef.current) {
      socketRef.current.on(event, handler)
    }

    return () => {
      handlersRef.current.get(event)?.delete(handler)
      if (socketRef.current) {
        socketRef.current.off(event, handler)
      }
    }
  }, [])

  return { connected, subscribe, socket: socketRef.current }
}

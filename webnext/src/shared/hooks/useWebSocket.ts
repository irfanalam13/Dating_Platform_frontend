import { useEffect, useRef, useState, useCallback } from 'react'
import { ChatWebSocket, WSStatus } from '@/shared/lib/websocket'
import { WSChatEvent } from '@/shared/types/chat.types'
import { getAccessToken, setAccessToken } from '@/shared/api/client'
import api from '@/shared/api/client'

export function useChatWebSocket(conversationId: string | null) {
  const wsRef = useRef<ChatWebSocket | null>(null)
  const [status, setStatus] = useState<WSStatus>('disconnected')
  const handlersRef = useRef<Set<(e: WSChatEvent) => void>>(new Set())

  useEffect(() => {
    if (!conversationId) return

    const connectWS = async () => {
      //   Refresh token first
      let token = getAccessToken()

      try {
        const refreshRes = await api.post('/auth/refresh/')
        const newToken = refreshRes?.data?.data?.access || null
        if (newToken) {
          setAccessToken(newToken)
          token = newToken
        }
      } catch (e) {
        console.warn('Could not refresh token before WS connect')
      }

      if (!token) return

      const ws = new ChatWebSocket(conversationId, {
        onOpen:  () => setStatus('connected'),
        onClose: () => setStatus('disconnected'),
        onError: () => setStatus('error'),
      })

      ws.subscribe((event: WSChatEvent) => {
        handlersRef.current.forEach(h => h(event))
      })

      wsRef.current = ws
      ws.connect(token)
    }

    connectWS()

    return () => {
      wsRef.current?.disconnect()
      wsRef.current = null
      setStatus('disconnected')
    }
  }, [conversationId])

  const subscribe = useCallback((handler: (e: WSChatEvent) => void) => {
    handlersRef.current.add(handler)
    return () => handlersRef.current.delete(handler)
  }, [])

  const sendMessage = useCallback((text: string) => {
    wsRef.current?.sendMessage(text)
  }, [])

  const sendTyping = useCallback((isTyping: boolean) => {
    wsRef.current?.sendTyping(isTyping)
  }, [])

  const sendRead = useCallback(() => {
    wsRef.current?.sendRead()
  }, [])

  return { status, subscribe, sendMessage, sendTyping, sendRead }
}

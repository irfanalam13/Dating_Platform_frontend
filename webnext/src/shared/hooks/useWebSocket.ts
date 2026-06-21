import { useEffect, useRef, useState, useCallback } from 'react'
import { ChatWebSocket, WSStatus } from '@/shared/lib/websocket'
import { WSChatEvent } from '@/shared/types/chat.types'
import { getAccessToken, refreshOnce } from '@/shared/api/client'

export function useChatWebSocket(conversationId: string | null) {
  const wsRef = useRef<ChatWebSocket | null>(null)
  const [status, setStatus] = useState<WSStatus>('disconnected')
  const handlersRef = useRef<Set<(e: WSChatEvent) => void>>(new Set())

  useEffect(() => {
    if (!conversationId) return

    const connectWS = async () => {
      // Use the existing access token if present; otherwise refresh ONCE through
      // the shared, deduped path. A raw /auth/refresh/ here would bypass the
      // dedupe and race other refreshes into a rotation that blacklists a live
      // token → spurious "token invalid" logouts.
      let token = getAccessToken()
      if (!token) {
        token = await refreshOnce()
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

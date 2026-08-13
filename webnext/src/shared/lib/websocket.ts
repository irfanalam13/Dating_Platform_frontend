import { WSChatEvent } from '@/shared/types/chat.types'
import { WSNotificationEvent } from '@/shared/types/notification.types'

export type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface WSOptions {
  onOpen?: () => void
  onClose?: (code: number) => void
  onError?: (e: Event) => void
}

class WebSocketManager {
  protected ws: WebSocket | null = null
  protected url: string
  protected options: WSOptions
  protected reconnectTimer: ReturnType<typeof setTimeout> | null = null
  protected pingTimer: ReturnType<typeof setInterval> | null = null
  protected shouldReconnect = true
  protected reconnectDelay = 2000
  protected maxReconnectDelay = 30_000
  protected _token: string | null = null

  status: WSStatus = 'disconnected'

  constructor(url: string, options: WSOptions = {}) {
    this.url = url
    this.options = options
  }

  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.shouldReconnect = true
    this.status = 'connecting'
    this._token = token

    const wsUrl = `${this.url}?token=${token}`
    console.log('WebSocket connecting to:', wsUrl)

    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      console.log('WebSocket onopen fired  ')
      this.status = 'connected'
      this.reconnectDelay = 2000
      this._startPing()
      this.options.onOpen?.()
    }

    this.ws.onclose = (e) => {
      console.log('WebSocket onclose:', e.code)
      this.status = 'disconnected'
      this._stopPing()
      this.options.onClose?.(e.code)
      if (this.shouldReconnect && e.code !== 4001 && e.code !== 4003) {
        this._scheduleReconnect()
      }
    }

    this.ws.onerror = (e) => {
      console.log('WebSocket onerror:', e)
      this.status = 'error'
      this.options.onError?.(e)
    }

    this.ws.onmessage = (e) => {
      this._onMessage(e)
    }
  }

  protected _onMessage(_event: MessageEvent): void {
    void _event;
  }

  disconnect() {
    this.shouldReconnect = false
    this._stopPing()
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
    this.status = 'disconnected'
  }

  send(data: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  protected async _scheduleReconnect() {
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)

      const { getFreshToken } = await import('@/shared/utils/wsToken')
      const token = await getFreshToken()

      if (!token) {
        console.warn('WS reconnect: no token, aborting')
        return
      }

      this.connect(token)
    }, this.reconnectDelay)
  }

  protected _startPing() {
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping' })
    }, 30_000)
  }

  protected _stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer)
  }
}

// ─────────────────────────────────────────────────────────
// Chat WebSocket
// ─────────────────────────────────────────────────────────

type ChatHandler = (event: WSChatEvent) => void

export class ChatWebSocket extends WebSocketManager {
  private handlers = new Set<ChatHandler>()

  constructor(conversationId: string, options: WSOptions = {}) {
    const base = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000'
    super(`${base}/ws/chat/${conversationId}/`, options)
  }

  protected _onMessage(e: MessageEvent) {
    try {
      const data = JSON.parse(e.data) as WSChatEvent
      this.handlers.forEach((h) => h(data))
    } catch {
      console.error('ChatWS: bad JSON', e.data)
    }
  }

  subscribe(handler: ChatHandler) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  sendMessage(
    text: string,
    opts?: { replyTo?: string; clientNonce?: string; msgType?: string },
  ) {
    this.send({
      type: 'message',
      message: text,
      ...(opts?.replyTo ? { reply_to: opts.replyTo } : {}),
      ...(opts?.clientNonce ? { client_nonce: opts.clientNonce } : {}),
      ...(opts?.msgType ? { msg_type: opts.msgType } : {}),
    })
  }

  sendTyping(isTyping: boolean) {
    this.send({ type: 'typing', is_typing: isTyping })
  }

  sendRead() {
    this.send({ type: 'read' })
  }
}

// ─────────────────────────────────────────────────────────
// Notification WebSocket
// ─────────────────────────────────────────────────────────

type NotificationHandler = (event: WSNotificationEvent) => void

export class NotificationWebSocket extends WebSocketManager {
  private handlers = new Set<NotificationHandler>()

  constructor(options: WSOptions = {}) {
    const base = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000'
    super(`${base}/ws/notifications/`, options)
  }

  protected _onMessage(e: MessageEvent) {
    try {
      const data = JSON.parse(e.data) as WSNotificationEvent
      this.handlers.forEach((h) => h(data))
    } catch {
      console.error('NotifWS: bad JSON', e.data)
    }
  }

  subscribe(handler: NotificationHandler) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  markRead(conversationId: string) {
    this.send({ type: 'mark_read', conversation_id: conversationId })
  }
}
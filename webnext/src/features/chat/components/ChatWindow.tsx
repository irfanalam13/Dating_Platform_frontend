'use client'
import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getConversations } from '@/shared/api/chat.api'
import { useAuth } from '@/features/auth'
import { useNotificationContext } from '@/features/notification/context/NotificationContext'
import { useChat } from '../hooks/useChat'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import TypingIndicator from './TypingIndicator'

import Avatar from '@/features/profile/components/Avatar'
import OnlineIndicator from './OnlineIndicator'
import type { ConversationParticipant } from '@/shared/types/chat.types'

interface Props {
  conversationId: string
}

export default function ChatWindow({ conversationId }: Props) {
  const { user }        = useAuth()
  const { onlineUsers } = useNotificationContext()
  const bottomRef       = useRef<HTMLDivElement>(null)

  //   Plain string — useChat reads currentUser internally from Zustand
  const { messages, isLoading, typingUsers, send, sendTyping, wsStatus } =
    useChat(conversationId)

  // ── Conversation + other participant ──────────────────
  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
  })

  const conversation = conversations?.results?.find?.((c) => c.id === conversationId)

  const other: ConversationParticipant | undefined =
    conversation?.participants?.find((p) => p.id !== user?.id)

  const isOtherOnline: boolean = other
    ? onlineUsers.has(other.id) || other.is_online
    : false

  // ── Scroll to bottom on new message ──────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isTyping = typingUsers.size > 0

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        {other && (
          <>
            <Avatar
              name={other.display_name ?? other.username}
              size="md"
              isOnline={isOtherOnline}
            />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {other.display_name ?? other.username}
              </p>
              <OnlineIndicator
                isOnline={isOtherOnline}
                lastSeen={other.last_seen}
              />
            </div>
          </>
        )}

        {/* <div className="ml-auto">
          {wsStatus !== 'connected' && (
            <span className="text-xs text-amber-500">Reconnecting…</span>
          )}
        </div> */}
        {/* Better status indicator */}
        <div className="ml-auto flex items-center gap-2">
          {wsStatus === "connected" && (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Connected
            </span>
          )}
          {wsStatus === "connecting" && (
            <span className="flex items-center gap-1 text-xs text-amber-500">
              <span className="h-3 w-3 animate-spin rounded-full border border-amber-500 border-t-transparent" />
              Connecting…
            </span>
          )}
          {(wsStatus === "disconnected" || wsStatus === "error") && (
            <span className="flex items-center gap-1 text-xs text-red-500">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Reconnecting…
            </span>
          )}
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          </div>
        )}
        {/*Message Bubble key*/}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isTyping && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ──────────────────────────────────────── */}
      <MessageInput
        onSend={send}
        onTyping={sendTyping}              
        // disabled={wsStatus !== 'connected'}
        disabled={false}
      />

    </div>
  )
}
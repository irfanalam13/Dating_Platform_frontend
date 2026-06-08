'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getConversations, editMessage, forwardMessage, reportMessage, uploadAttachment, sendChatMessage } from '@/shared/api/chat.api'
import { useAuth } from '@/features/auth'
import { useNotificationContext } from '@/features/notification/context/NotificationContext'
import { useChat } from '../hooks/useChat'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import TypingIndicator from './TypingIndicator'
import { showSuccess, showError } from '@/shared/utils/toast'

import Avatar from '@/features/profile/components/Avatar'
import OnlineIndicator from './OnlineIndicator'
import type { ConversationParticipant, Message } from '@/shared/types/chat.types'

interface Props {
  conversationId: string
}

const REPORT_REASONS: { value: string; label: string }[] = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'scam', label: 'Scam' },
  { value: 'sexual_content', label: 'Sexual content' },
  { value: 'violence', label: 'Violence' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
]

export default function ChatWindow({ conversationId }: Props) {
  const { user }        = useAuth()
  const router          = useRouter()
  const { onlineUsers } = useNotificationContext()
  const bottomRef       = useRef<HTMLDivElement>(null)

  const { messages, isLoading, typingUsers, send, sendTyping, wsStatus } =
    useChat(conversationId)

  const [replyTo, setReplyTo]     = useState<Message | null>(null)
  const [editing, setEditing]     = useState<Message | null>(null)
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null)
  const [reportMsg, setReportMsg]   = useState<Message | null>(null)

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => getConversations(),
  })

  const conversation = conversations?.results?.find?.((c) => String(c.id) === conversationId)

  const other: ConversationParticipant | undefined =
    conversation?.participants?.find((p) => p.id !== user?.id)

  const isOtherOnline: boolean = other
    ? onlineUsers.has(other.id) || other.is_online
    : false

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isTyping = typingUsers.size > 0

  // ── Action handlers ──────────────────────────────────
  const handleSend = (text: string) => {
    send(text, replyTo && replyTo.uuid
      ? { uuid: replyTo.uuid, content: replyTo.content, sender_id: Number(replyTo.sender.id), type: replyTo.type }
      : null)
    setReplyTo(null)
  }

  const handleSubmitEdit = async (text: string) => {
    if (!editing?.uuid) { setEditing(null); return }
    try {
      await editMessage(editing.uuid, text)   // WS message_edited updates the bubble
    } catch (e) {
      showError(e, 'Could not edit message.')
    }
    setEditing(null)
  }

  const handleAttachImage = async (file: File) => {
    try {
      const att = await uploadAttachment(file, 'image')
      await sendChatMessage(conversationId, { type: 'image', attachment_ids: [att.uuid] })
      // The room WS echo renders it.
    } catch (e) {
      showError(e, 'Could not send image.')
    }
  }

  const doForward = async (targetUuids: string[]) => {
    if (!forwardMsg?.uuid || targetUuids.length === 0) { setForwardMsg(null); return }
    try {
      await forwardMessage(forwardMsg.uuid, targetUuids)
      showSuccess('Forwarded')
    } catch (e) {
      showError(e, 'Could not forward.')
    }
    setForwardMsg(null)
  }

  const doReport = async (reason: string) => {
    if (!reportMsg?.uuid) { setReportMsg(null); return }
    try {
      await reportMessage(reportMsg.uuid, { reason, description: 'Reported from chat.' })
      showSuccess('Message reported. Thank you.')
    } catch (e) {
      showError(e, 'Could not submit report.')
    }
    setReportMsg(null)
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "linear-gradient(180deg, #ffffff 0%, #eef8ff 40%, #d7ebfb 100%)" }}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/50 bg-white/60 backdrop-blur-md">
        {other && (
          <button
            type="button"
            onClick={() => router.push(`/profile/${other.id}`)}
            className="flex items-center gap-3 text-left"
            aria-label={`View ${other.display_name ?? other.username}'s profile`}
          >
            <Avatar name={other.display_name ?? other.username} size="md" isOnline={isOtherOnline} />
            <div>
              <p className="text-sm font-semibold text-[#1a1a2e]">
                {other.display_name ?? other.username}
              </p>
              <OnlineIndicator isOnline={isOtherOnline} lastSeen={other.last_seen} />
            </div>
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {wsStatus === "connected" && (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />Connected
            </span>
          )}
          {wsStatus === "connecting" && (
            <span className="flex items-center gap-1 text-xs text-amber-500">
              <span className="h-3 w-3 animate-spin rounded-full border border-amber-500 border-t-transparent" />Connecting…
            </span>
          )}
          {(wsStatus === "disconnected" || wsStatus === "error") && (
            <span className="flex items-center gap-1 text-xs text-red-500">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />Reconnecting…
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

        {messages.map((msg) => (
          <MessageBubble
            key={msg.uuid ?? msg.id}
            message={msg}
            conversationId={conversationId}
            onReply={(m) => { setReplyTo(m); setEditing(null) }}
            onEdit={(m) => { setEditing(m); setReplyTo(null) }}
            onForward={(m) => setForwardMsg(m)}
            onReport={(m) => setReportMsg(m)}
          />
        ))}

        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ──────────────────────────────────────── */}
      <MessageInput
        onSend={handleSend}
        onTyping={sendTyping}
        disabled={false}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editing={editing}
        onSubmitEdit={handleSubmitEdit}
        onCancelEdit={() => setEditing(null)}
        onAttachImage={handleAttachImage}
      />

      {/* ── Forward modal ── */}
      {forwardMsg && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#2D2424]/50 px-4" onClick={() => setForwardMsg(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-base font-semibold text-[#2D2424]">Forward to…</h3>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {conversations?.results
                ?.filter((c) => String(c.id) !== conversationId && c.uuid)
                .map((c) => {
                  const p = c.participants?.find((x) => x.id !== user?.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => doForward([c.uuid!])}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <Avatar name={p?.display_name ?? p?.username ?? '?'} size="sm" />
                      <span className="truncate">{p?.display_name ?? p?.username ?? 'Chat'}</span>
                    </button>
                  )
                })}
            </div>
            <button onClick={() => setForwardMsg(null)} className="mt-3 text-sm font-semibold text-[#746767]">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Report message modal ── */}
      {reportMsg && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#2D2424]/50 px-4" onClick={() => setReportMsg(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 text-base font-semibold text-[#2D2424]">Report message</h3>
            <p className="mb-3 text-xs text-[#746767]">Your report goes to the safety team. The sender isn’t notified.</p>
            <div className="space-y-1">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => doReport(r.value)}
                  className="w-full rounded-lg border border-white/60 bg-white/60 px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button onClick={() => setReportMsg(null)} className="mt-3 text-sm font-semibold text-[#746767]">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

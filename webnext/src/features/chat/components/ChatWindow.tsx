'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, MoreVertical, Flag, Ban } from 'lucide-react'
import { getConversations, editMessage, forwardMessage, reportMessage, uploadAttachment, sendChatMessage } from '@/shared/api/chat.api'
import { blockProfile, unblockProfile, getBlockedUsers, reportProfile } from '@/shared/api/mvp.api'
import { useAuth } from '@/features/auth'
import { useNotificationContext } from '@/features/notification/context/NotificationContext'
import { useChat } from '../hooks/useChat'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import TypingIndicator from './TypingIndicator'
import { showSuccess, showError } from '@/shared/utils/toast'

import Avatar from '@/features/profile/components/Avatar'
import ProfileImage from '@/shared/components/ProfileImage'
import { resolveImageUrl } from '@/shared/lib/mediaUrl'
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
  const queryClient     = useQueryClient()
  const { onlineUsers } = useNotificationContext()
  const listRef         = useRef<HTMLDivElement>(null)

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

  // Block/report key off Profile.id (now sent by the backend as participant
  // profile_id). Fall back to the user id only as a last resort.
  const otherProfileId = other?.profile_id ?? other?.id

  // Header overflow menu (3-dot) + profile-level safety actions.
  const [menuOpen, setMenuOpen] = useState(false)
  const [showReportUser, setShowReportUser] = useState(false)

  // Who the current user has blocked. Used to swap the message bar for an
  // "Unblock chat" prompt — blocking no longer kicks you out of the thread.
  const { data: blockedUsers } = useQuery({
    queryKey: ['blocked-users'],
    queryFn: getBlockedUsers,
  })

  const isBlocked: boolean =
    !!otherProfileId &&
    (blockedUsers ?? []).some(
      (b) => b.blocked_profile_id === otherProfileId || b.blocked === other?.id,
    )

  const blockUserMutation = useMutation({
    mutationFn: blockProfile,
    onSuccess: () => {
      showSuccess('User blocked')
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] })
    },
    onError: (err) => showError(err, 'Could not block user.'),
  })

  const unblockUserMutation = useMutation({
    mutationFn: unblockProfile,
    onSuccess: () => {
      showSuccess('User unblocked.')
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] })
    },
    onError: (err) => showError(err, 'Could not unblock user.'),
  })

  const reportUserMutation = useMutation({
    mutationFn: (profileId: number) =>
      reportProfile(profileId, { reason: 'other', description: 'Reported from chat.' }),
    onSuccess: () => { setShowReportUser(false); showSuccess('Report submitted. Thank you.'); router.push('/home') },
    onError: (err) => { setShowReportUser(false); showError(err, 'Could not submit report.') },
  })

  // Auto-scroll to the newest message by scrolling the MESSAGE LIST itself —
  // never `scrollIntoView`, which also scrolls every scrollable ancestor (incl.
  // the window). That ancestor scroll was dragging the whole chat — and the
  // input bar — up off the screen when a conversation opened.
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
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
      className="flex flex-col h-full min-h-0 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #ffffff 0%, #eef8ff 40%, #d7ebfb 100%)" }}
    >
      {/* ── Header (single combined bar) ───────────────── */}
      {/* relative z-30 lifts the whole header (a backdrop-blur stacking context)
          above the messages list so the dropdown menu overflowing below it is
          actually clickable instead of being painted under the message area. */}
      <div className="relative z-30 flex shrink-0 items-center gap-2 px-3 py-3 border-b border-white/50 bg-white/60 backdrop-blur-md">
        {/* Mobile back — desktop keeps the conversation list visible */}
        <button
          type="button"
          onClick={() => router.push("/home")}
          aria-label="Go back"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#2D2424] lg:hidden"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {other && (
          <button
            type="button"
            onClick={() => router.push(`/profile/${other.id}`)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-label={`View ${other.display_name ?? other.full_name ?? "member"}'s profile`}
          >
            <span className="relative flex-shrink-0">
              <ProfileImage
                src={resolveImageUrl(other.profile_picture ?? other.profile_image)}
                name={other.display_name ?? other.full_name ?? "Member"}
                className="h-10 w-10 rounded-full"
                textClassName="text-sm"
              />
              <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-white ${isOtherOnline ? "bg-green-500" : "bg-gray-400"}`} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#1a1a2e]">
                {other.display_name ?? other.full_name ?? "Member"}
              </p>
              <OnlineIndicator isOnline={isOtherOnline} lastSeen={other.last_seen} />
            </div>
          </button>
        )}

        {/* Compact WS connection status */}
        <span className="shrink-0" title={wsStatus} aria-label={`Connection: ${wsStatus}`}>
          {wsStatus === "connected" && <span className="block h-2 w-2 rounded-full bg-green-500" />}
          {wsStatus === "connecting" && <span className="block h-3.5 w-3.5 animate-spin rounded-full border border-amber-500 border-t-transparent" />}
          {(wsStatus === "disconnected" || wsStatus === "error") && <span className="block h-2 w-2 rounded-full bg-red-500" />}
        </span>

        {/* 3-dot overflow menu */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="glass-btn grid h-9 w-9 place-items-center rounded-full"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen && (
            <>
              {/* click-away backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div role="menu" className="absolute right-0 z-50 mt-2 w-48 space-y-1 rounded-2xl border border-white/60 bg-white/40 p-1.5 shadow-[0_10px_30px_rgba(16,24,40,0.18)] backdrop-blur-md">
                <button
                  type="button"
                  role="menuitem"
                  disabled={!otherProfileId}
                  onClick={() => { setMenuOpen(false); setShowReportUser(true) }}
                  className="glass-btn flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium disabled:opacity-40"
                >
                  <Flag className="h-4 w-4 text-[#746767]" /> Report user
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={!otherProfileId || blockUserMutation.isPending}
                  onClick={() => { setMenuOpen(false); if (otherProfileId) blockUserMutation.mutate(otherProfileId) }}
                  className="glass-btn flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium disabled:opacity-40"
                >
                  <Ban className="h-4 w-4 text-red-600" /> <span className="text-red-600">Block user</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────── */}
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-0.5">
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
      </div>

      {/* ── Input (or "Unblock chat" prompt when blocked) ─ */}
      {isBlocked ? (
        <div className="shrink-0 border-t border-white/50 bg-white/60 px-4 py-4 backdrop-blur-md [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-md flex-col items-center gap-2 text-center">
            <p className="text-sm text-[#746767]">
              You blocked this person. Neither of you can send messages.
            </p>
            <button
              type="button"
              onClick={() => { if (otherProfileId) unblockUserMutation.mutate(otherProfileId) }}
              disabled={!otherProfileId || unblockUserMutation.isPending}
              className="glass-btn flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              <Ban className="h-4 w-4" />
              {unblockUserMutation.isPending ? 'Unblocking…' : 'Unblock chat'}
            </button>
          </div>
        </div>
      ) : (
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
      )}

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
                      <Avatar name={p?.display_name ?? p?.full_name ?? '?'} size="sm" />
                      <span className="truncate">{p?.display_name ?? p?.full_name ?? 'Chat'}</span>
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

      {/* ── Report USER (profile-level) modal — from the header menu ── */}
      {showReportUser && otherProfileId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#2D2424]/50 px-4" onClick={() => setShowReportUser(false)}>
          <div className="w-full max-w-sm rounded-lg bg-white p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <Flag className="mx-auto mb-3 h-8 w-8 text-[#F87171]" />
            <h2 className="text-lg font-semibold text-[#2D2424]">Report this person?</h2>
            <p className="mt-2 text-sm leading-6 text-[#746767]">
              Your report goes to the safety team. The other person will not be notified.
            </p>
            <button
              onClick={() => reportUserMutation.mutate(otherProfileId)}
              disabled={reportUserMutation.isPending}
              className="glass-btn-rose mt-5 h-11 w-full rounded-md text-sm font-semibold disabled:opacity-60"
            >
              Submit report
            </button>
            <button onClick={() => setShowReportUser(false)} className="mt-3 text-sm font-semibold text-[#746767]">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

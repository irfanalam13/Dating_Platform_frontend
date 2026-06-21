'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, MoreVertical, Flag, Ban, Search, X, ChevronUp, ChevronDown } from 'lucide-react'
import { getConversations, editMessage, forwardMessage, reportMessage, uploadAttachment, sendChatMessage, searchMessages } from '@/shared/api/chat.api'
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
import { useMatchAvatars, pickAvatar } from '../hooks/useMatchAvatars'
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
  const matchAvatars    = useMatchAvatars()
  const listRef         = useRef<HTMLDivElement>(null)

  const { messages, isLoading, typingUsers, send, sendTyping, wsStatus } =
    useChat(conversationId)

  const [replyTo, setReplyTo]     = useState<Message | null>(null)
  const [editing, setEditing]     = useState<Message | null>(null)
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null)
  const [reportMsg, setReportMsg]   = useState<Message | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => getConversations(),
  })

  const conversation = conversations?.results?.find?.((c) => String(c.id) === conversationId)

  const myId = Number(user?.id)
  const other: ConversationParticipant | undefined =
    conversation?.participants?.find((p) => Number(p.id) !== myId)

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
    // Don't yank the view to the bottom while the user is navigating search hits.
    if (searchOpen) return
    const el = listRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, searchOpen])

  // The most recent own message carries the detailed seen/delivered receipt.
  const lastOwnKey = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (Number(messages[i].sender.id) === Number(user?.id)) {
        return messages[i].uuid ?? String(messages[i].id)
      }
    }
    return null
  }, [messages, user?.id])

  const isTyping = typingUsers.size > 0

  // ── In-conversation search ───────────────────────────
  const [searchTerm, setSearchTerm] = useState('')
  const [debounced, setDebounced]   = useState('')
  const [activeMatch, setActiveMatch] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchTerm.trim()), 250)
    return () => clearTimeout(t)
  }, [searchTerm])

  // Authoritative match count for THIS conversation (server-side, includes
  // history not currently loaded in the thread).
  const { data: searchData, isFetching: searchFetching } = useQuery({
    queryKey: ['msg-search', conversation?.uuid, debounced],
    queryFn: () => searchMessages({ conversation: conversation!.uuid!, q: debounced }),
    enabled: searchOpen && debounced.length >= 1 && !!conversation?.uuid,
    staleTime: 10_000,
  })

  // Navigable matches = loaded messages we can actually scroll to.
  const matchIds = useMemo(() => {
    const t = debounced.toLowerCase()
    if (!t) return [] as string[]
    return messages
      .filter((m) => !m.is_deleted_for_all && (m.content ?? '').toLowerCase().includes(t))
      .map((m) => m.uuid ?? String(m.id))
  }, [messages, debounced])

  const apiTotal = searchData?.count ?? matchIds.length

  // Jump to the most recent match whenever the match set changes. Adjusting
  // state during render (keyed on the match signature) avoids an effect-driven
  // cascading render — the recommended pattern over setState-in-effect.
  const matchSignature = `${debounced}:${matchIds.length}`
  const [matchKey, setMatchKey] = useState('')
  if (matchKey !== matchSignature) {
    setMatchKey(matchSignature)
    setActiveMatch(matchIds.length > 0 ? matchIds.length - 1 : 0)
  }

  // Scroll the focused match into view.
  useEffect(() => {
    const id = matchIds[activeMatch]
    if (!id) return
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeMatch, matchIds])

  const goPrev = () =>
    setActiveMatch((i) => (matchIds.length ? (i - 1 + matchIds.length) % matchIds.length : 0))
  const goNext = () =>
    setActiveMatch((i) => (matchIds.length ? (i + 1) % matchIds.length : 0))

  const openSearch = () => {
    setSearchOpen(true)
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }
  const closeSearch = () => {
    setSearchOpen(false)
    setSearchTerm('')
    setDebounced('')
  }

  const activeMatchId = searchOpen ? matchIds[activeMatch] : undefined

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
                src={pickAvatar(other.profile_picture ?? other.profile_image, other.id, matchAvatars)}
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

        {/* Search within this conversation */}
        <button
          type="button"
          onClick={openSearch}
          aria-label="Search in conversation"
          className="glass-btn grid h-9 w-9 shrink-0 place-items-center rounded-full"
        >
          <Search className="h-4.5 w-4.5" />
        </button>

        {/* Compact WS connection status */}
        <span className="shrink-0" title={wsStatus} aria-label={`Connection: ${wsStatus}`}>
          {wsStatus === "connected" && <span className="block h-2 w-2 rounded-full bg-green-500" />}
          {wsStatus === "connecting" && <span className="block h-3.5 w-3.5 animate-spin rounded-full border border-amber-500 border-t-transparent" />}
          {(wsStatus === "disconnected" || wsStatus === "error") && <span className="block h-2 w-2 rounded-full bg-red-500" />}
        </span>

        {/* 3-dot overflow menu (the dropdown itself is rendered at the root,
            outside this backdrop-blurred header — see below — so its full-screen
            click-away layer is anchored to the viewport, not the header box). */}
        <div className="shrink-0">
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
        </div>
      </div>

      {/* ── 3-dot dropdown + click-away ─────────────────────
          Rendered here (NOT inside the header) on purpose: the header has a
          `backdrop-filter`, which would re-anchor `position: fixed` children to
          the header box, so a full-screen click-away placed there only covered
          the header bar. At the root the fixed layer is viewport-relative, so a
          tap ANYWHERE dismisses the menu. */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div role="menu" className="fixed right-3 top-16 z-50 w-48 space-y-1 rounded-2xl border border-white/60 bg-white/70 p-1.5 shadow-[0_10px_30px_rgba(16,24,40,0.18)] backdrop-blur-md">
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

      {/* ── In-conversation search bar ─────────────────── */}
      {searchOpen && (
        <div className="relative z-20 flex items-center gap-2 border-b border-white/50 bg-white/70 px-3 py-2 backdrop-blur-md">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#746767]" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') closeSearch()
                if (e.key === 'Enter') { e.preventDefault(); if (e.shiftKey) goPrev(); else goNext() }
              }}
              placeholder="Search in conversation"
              aria-label="Search in conversation"
              className="w-full rounded-full border border-white/60 bg-white/80 py-2 pl-9 pr-3 text-sm text-[#1a1a2e] placeholder-gray-400 outline-none focus:border-[#4cc9f0] focus:ring-2 focus:ring-[#4cc9f0]/20"
            />
          </div>

          {/* Result counter */}
          <span className="min-w-[3.5rem] shrink-0 text-center text-xs font-medium text-[#746767]" aria-live="polite">
            {debounced.length === 0
              ? ''
              : searchFetching && matchIds.length === 0
                ? '…'
                : matchIds.length === 0
                  ? '0 results'
                  : `${activeMatch + 1}/${matchIds.length}${apiTotal > matchIds.length ? ` (${apiTotal})` : ''}`}
          </span>

          {/* Prev / next */}
          <button
            type="button" onClick={goPrev} disabled={matchIds.length === 0}
            aria-label="Previous match"
            className="glass-btn grid h-8 w-8 shrink-0 place-items-center rounded-full disabled:opacity-40"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button" onClick={goNext} disabled={matchIds.length === 0}
            aria-label="Next match"
            className="glass-btn grid h-8 w-8 shrink-0 place-items-center rounded-full disabled:opacity-40"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button" onClick={closeSearch}
            aria-label="Close search"
            className="glass-btn grid h-8 w-8 shrink-0 place-items-center rounded-full"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
            isLastOwn={(msg.uuid ?? String(msg.id)) === lastOwnKey}
            domId={`msg-${msg.uuid ?? msg.id}`}
            highlight={searchOpen ? debounced : undefined}
            isSearchActive={(msg.uuid ?? String(msg.id)) === activeMatchId}
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
                  const p = c.participants?.find((x) => Number(x.id) !== myId)
                  return (
                    <button
                      key={c.id}
                      onClick={() => doForward([c.uuid!])}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <Avatar name={p?.display_name ?? p?.full_name ?? '?'} src={p?.profile_image ?? p?.profile_picture} size="sm" />
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

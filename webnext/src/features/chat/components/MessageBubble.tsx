'use client'

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  MoreVertical, Reply, Copy, Pencil, Trash2, Pin, Bookmark, Forward, Flag, SmilePlus,
  Check, CheckCheck, Clock,
} from 'lucide-react'
import { Message } from '@/shared/types/chat.types'
import { formatTime } from '@/shared/lib/utils'
import { useAuth } from '@/features/auth'
import { showSuccess, showError } from '@/shared/utils/toast'
import {
  addReaction, removeReaction, deleteMessageScoped, pinMessage,
  saveMessage,
} from '@/shared/api/chat.api'
import { chatKeys } from '../hooks/useChat'
import { useMessageReceipt, type ReceiptStatus } from '../hooks/useMessageReceipt'

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '🎉']

interface Props {
  message: Message
  conversationId: string
  /** True for the most recent own message — enables the detailed seen/delivered receipt. */
  isLastOwn?: boolean
  /** Search term to highlight inside the message body. */
  highlight?: string
  /** DOM id so the conversation can scroll this bubble into view (search). */
  domId?: string
  /** The currently-focused search result — gets a ring. */
  isSearchActive?: boolean
  onReply?: (m: Message) => void
  onEdit?: (m: Message) => void
  onForward?: (m: Message) => void
  onReport?: (m: Message) => void
}

export default function MessageBubble({
  message, conversationId, isLastOwn = false, highlight, domId, isSearchActive = false,
  onReply, onEdit, onForward, onReport,
}: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isMine = Number(user?.id) === Number(message.sender.id)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Snapshot of "now" taken when the actions menu opens, so the 15-minute edit
  // window is computed from a stable value rather than an impure Date.now()
  // call during render.
  const [menuOpenedAt, setMenuOpenedAt] = useState(0)

  const uuid = message.uuid
  const idStr = message.id != null ? String(message.id) : ''
  const canAct = !!uuid && !idStr.startsWith('temp-')
  const deleted = !!message.is_deleted_for_all
  const isPending = idStr.startsWith('temp-')  // optimistic, not yet server-acked

  // Detailed delivery/seen receipt — fetched only for the latest own message.
  const receipt = useMessageReceipt(
    uuid,
    isMine && isLastOwn && canAct && !message.failed && !deleted,
    !!message.is_read,
  )

  const closeMenus = () => { setMenuOpen(false); setPickerOpen(false) }

  // ── WhatsApp-style swipe-to-reply ──────────────────────────────────────────
  // Drag the bubble to the right; release past the threshold to reply. A Reply
  // icon fades in behind the bubble as you drag. Reuses the same onReply path
  // as the context-menu "Reply" action.
  const SWIPE_THRESHOLD = 52   // px to drag before a release triggers reply
  const SWIPE_MAX = 72         // px the bubble can travel
  const canReply = canAct && !deleted && !!onReply
  const [dragX, setDragX] = useState(0)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const swiping = useRef(false)

  const onTouchStart = (e: React.TouchEvent) => {
    if (!canReply) return
    const t = e.touches[0]
    swipeStart.current = { x: t.clientX, y: t.clientY }
    swiping.current = false
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!swipeStart.current) return
    const t = e.touches[0]
    const dx = t.clientX - swipeStart.current.x
    const dy = t.clientY - swipeStart.current.y
    if (!swiping.current) {
      if (Math.abs(dx) < 8) return
      // Let vertical scrolling win if the gesture is more up/down than sideways.
      if (Math.abs(dx) < Math.abs(dy)) { swipeStart.current = null; return }
      swiping.current = true
    }
    setDragX(Math.max(0, Math.min(dx, SWIPE_MAX)))  // right-swipe only
  }
  const onTouchEnd = () => {
    if (dragX >= SWIPE_THRESHOLD) onReply?.(message)
    swipeStart.current = null
    swiping.current = false
    setDragX(0)
  }

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: chatKeys.messages(conversationId) })

  const react = async (emoji: string) => {
    if (!uuid) return
    const mine = message.reactions?.find((r) => r.emoji === emoji)?.me
    try {
      if (mine) await removeReaction(uuid, emoji)
      else await addReaction(uuid, emoji)
      // Live update arrives via the reaction_update WS event.
    } catch (e) {
      showError(e, 'Could not update reaction.')
    }
    closeMenus()
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(message.content) ; showSuccess('Copied') }
    catch { /* ignore */ }
    closeMenus()
  }

  const del = async (scope: 'me' | 'everyone') => {
    if (!uuid) return
    try {
      await deleteMessageScoped(uuid, scope)
      if (scope === 'me') refresh()  // 'everyone' updates via WS tombstone
      showSuccess(scope === 'everyone' ? 'Message deleted for everyone' : 'Message removed')
    } catch (e) {
      showError(e, 'Could not delete message.')
    }
    closeMenus()
  }

  const pin = async () => {
    if (!uuid) return
    try { await pinMessage(uuid); showSuccess('Pinned') }
    catch (e) { showError(e, 'Could not pin.') }
    closeMenus()
  }

  const save = async () => {
    if (!uuid) return
    try { await saveMessage(uuid); showSuccess('Saved') }
    catch (e) { showError(e, 'Could not save.') }
    closeMenus()
  }

  const editWindowOpen =
    isMine && message.type !== 'video' && message.type !== 'image' &&
    (menuOpenedAt - new Date(message.created_at).getTime()) < 15 * 60 * 1000

  return (
    <div
      id={domId}
      className={`group relative flex ${isMine ? 'justify-end' : 'justify-start'} mb-1 scroll-mt-24`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Swipe-to-reply icon, revealed as the bubble is dragged right */}
      {canReply && dragX > 0 && (
        <div
          className="absolute left-1 top-1/2 -translate-y-1/2 text-[#7A2432]"
          style={{ opacity: Math.min(1, dragX / SWIPE_THRESHOLD) }}
        >
          <Reply className="h-5 w-5" />
        </div>
      )}
      <div
        className="flex max-w-[78%] flex-col"
        style={{ transform: dragX ? `translateX(${dragX}px)` : undefined, transition: dragX ? 'none' : 'transform 150ms ease-out' }}
      >
        {/* Reply quote */}
        {message.reply_to && (
          <div className={`mb-0.5 rounded-lg border-l-2 px-2 py-1 text-[11px] ${
            isMine ? 'self-end border-indigo-300 bg-indigo-50/70 text-indigo-900'
                   : 'border-gray-300 bg-white/70 text-gray-600'}`}>
            <span className="line-clamp-2">
              {message.reply_to.is_deleted_for_all
                ? 'Message unavailable'
                : message.reply_to.content || 'Attachment'}
            </span>
          </div>
        )}

        <div
          onContextMenu={(e) => {
            // Right-click (and long-press on touch) opens the actions menu on
            // the bubble itself — no more floating "opposite side" trigger.
            if (!canAct || deleted) return
            e.preventDefault()
            setPickerOpen(false)
            setMenuOpenedAt(Date.now())
            setMenuOpen(true)
          }}
          className={`relative cursor-context-menu px-3.5 py-2 rounded-2xl text-sm leading-relaxed
          ${isMine
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : 'bg-white/80 text-[#1a1a2e] rounded-bl-sm shadow-sm'}
          ${isSearchActive ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}>

          {/* Attachments */}
          {(message.attachments ?? []).map((a) => (
            <div key={a.uuid} className="mb-1">
              {a.scan_status === 'pending' ? (
                <div className="text-xs italic opacity-70">media processing…</div>
              ) : a.kind === 'image' || a.kind === 'gif' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url ?? ''} alt="attachment"
                     className="max-h-60 rounded-lg object-cover" />
              ) : a.kind === 'video' ? (
                <video src={a.url ?? ''} controls className="max-h-60 rounded-lg" />
              ) : a.kind === 'voice' || a.kind === 'audio' ? (
                <audio src={a.url ?? ''} controls className="w-48" />
              ) : (
                <a href={a.url ?? '#'} target="_blank" rel="noopener noreferrer"
                   className="underline text-xs">📄 Document</a>
              )}
            </div>
          ))}

          {deleted ? (
            <p className="italic opacity-70">This message was deleted</p>
          ) : (
            message.content && (
              <p className="break-words whitespace-pre-wrap">
                {highlightText(message.content, highlight)}
              </p>
            )
          )}

          <div className={`flex items-center justify-end gap-1 mt-0.5
            ${isMine ? 'text-indigo-200' : 'text-[#746767]'}`}>
            {message.is_edited && !deleted && <span className="text-[10px]">edited</span>}
            <span className="text-[10px]">{formatTime(message.created_at)}</span>
            {isMine && !message.failed && !deleted && (
              <MessageTicks
                status={isPending ? 'pending' : isLastOwn ? receipt.status : (message.is_read ? 'read' : 'sent')}
              />
            )}
          </div>

          {/* Rejected send (e.g. unmatched > 24h) — shown right under the message. */}
          {message.failed && (
            <p className={`mt-1 text-[11px] font-medium ${isMine ? 'text-red-200' : 'text-red-600'}`}>
              ⚠ Not delivered — {message.error || 'message could not be sent'}
            </p>
          )}
        </div>

        {/* Reactions row */}
        {(message.reactions?.length ?? 0) > 0 && (
          <div className={`mt-0.5 flex flex-wrap gap-1 ${isMine ? 'justify-end' : ''}`}>
            {message.reactions!.map((r) => (
              <button key={r.emoji} onClick={() => react(r.emoji)}
                className={`rounded-full px-1.5 py-0.5 text-[11px] border ${
                  r.me ? 'bg-indigo-100 border-indigo-300' : 'bg-white/70 border-white/60'}`}>
                {r.emoji} {r.count}
              </button>
            ))}
          </div>
        )}

        {/* Detailed delivery/seen status — only under the latest own message. */}
        {isMine && isLastOwn && !message.failed && !deleted && !isPending && (
          <p className="mt-0.5 self-end text-[10px] font-medium text-[#746767]">
            {receipt.status === 'read'
              ? (receipt.seenAt ? `Seen ${formatTime(receipt.seenAt)}` : 'Seen')
              : receipt.status === 'delivered'
                ? 'Delivered'
                : 'Sent'}
          </p>
        )}
      </div>

      {/* Secondary trigger sitting on the bubble's top corner (touch / mouse
          discoverability). Right-clicking the bubble does the same thing. */}
      {canAct && !deleted && (
        <div className={`absolute -top-3 ${isMine ? 'right-1' : 'left-1'} z-10`}>
          <button
            onClick={() => { setMenuOpenedAt(Date.now()); setMenuOpen((v) => !v); setPickerOpen(false) }}
            className="glass-btn grid h-7 w-7 place-items-center rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
            aria-label="Message actions (or right-click the message)"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Quick reaction picker */}
      {pickerOpen && (
        <div className={`absolute z-20 -top-9 ${isMine ? 'right-0' : 'left-0'} flex gap-0.5 rounded-full bg-white px-2 py-1 shadow-lg`}>
          {REACTIONS.map((e) => (
            <button key={e} onClick={() => react(e)} className="text-lg hover:scale-125 transition">{e}</button>
          ))}
        </div>
      )}

      {/* Context menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={closeMenus} />
          <div className={`absolute z-20 top-7 ${isMine ? 'right-6' : 'left-6'}
            w-44 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5 text-sm`}>
            <MenuItem icon={<SmilePlus className="h-4 w-4" />} label="React"
              onClick={() => { setPickerOpen(true); setMenuOpen(false) }} />
            <MenuItem icon={<Reply className="h-4 w-4" />} label="Reply"
              onClick={() => { onReply?.(message); closeMenus() }} />
            <MenuItem icon={<Copy className="h-4 w-4" />} label="Copy" onClick={copy} />
            <MenuItem icon={<Forward className="h-4 w-4" />} label="Forward"
              onClick={() => { onForward?.(message); closeMenus() }} />
            <MenuItem icon={<Pin className="h-4 w-4" />} label="Pin" onClick={pin} />
            <MenuItem icon={<Bookmark className="h-4 w-4" />} label="Save" onClick={save} />
            {isMine && editWindowOpen && (
              <MenuItem icon={<Pencil className="h-4 w-4" />} label="Edit"
                onClick={() => { onEdit?.(message); closeMenus() }} />
            )}
            {isMine ? (
              <>
                <MenuItem icon={<Trash2 className="h-4 w-4" />} label="Delete for everyone"
                  danger onClick={() => del('everyone')} />
                <MenuItem icon={<Trash2 className="h-4 w-4" />} label="Delete for me"
                  onClick={() => del('me')} />
              </>
            ) : (
              <>
                <MenuItem icon={<Trash2 className="h-4 w-4" />} label="Delete for me"
                  onClick={() => del('me')} />
                <MenuItem icon={<Flag className="h-4 w-4" />} label="Report message"
                  danger onClick={() => { onReport?.(message); closeMenus() }} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function MenuItem({
  icon, label, onClick, danger,
}: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50
        ${danger ? 'text-[#7A2432]' : 'text-[#2D2424]'}`}
    >
      {icon}{label}
    </button>
  )
}

// WhatsApp-style delivery ticks for own messages. Read is the only coloured
// state so it reads at a glance against the indigo bubble.
function MessageTicks({ status }: { status: 'pending' | ReceiptStatus }) {
  if (status === 'pending') {
    return <Clock className="h-3 w-3 text-indigo-200" aria-label="Sending" />
  }
  if (status === 'read') {
    return <CheckCheck className="h-3.5 w-3.5 text-[#5fe0ff]" aria-label="Read" />
  }
  if (status === 'delivered') {
    return <CheckCheck className="h-3.5 w-3.5 text-indigo-200" aria-label="Delivered" />
  }
  return <Check className="h-3.5 w-3.5 text-indigo-200" aria-label="Sent" />
}

// Wrap case-insensitive matches of `term` in <mark> for in-conversation search.
function highlightText(text: string, term?: string): React.ReactNode {
  const t = term?.trim()
  if (!t) return text
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === t.toLowerCase()
      ? <mark key={i} className="rounded bg-amber-300 px-0.5 text-[#1a1a2e]">{part}</mark>
      : part
  )
}

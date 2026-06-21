'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { MoreVertical, Pin, PinOff, Bell, BellOff, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { Conversation } from '@/shared/types/chat.types'
import { useAuth } from '@/features/auth'
import ProfileImage from '@/shared/components/ProfileImage'
import { resolveImageUrl } from '@/shared/lib/mediaUrl'
import { formatTime } from '@/shared/lib/utils'
import { useNotificationContext } from '@/features/notification/context/NotificationContext'
import { patchConversationState, deleteConversation, type ConversationStatePatch } from '@/shared/api/chat.api'
import { showError, showSuccess } from '@/shared/utils/toast'
import { hideConversation } from '../lib/hiddenConversations'

interface Props {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}

export default function ConversationItem({ conversation, isActive, onClick }: Props) {
  const { user } = useAuth()
  const router = useRouter()
  const { unreadCounts, onlineUsers } = useNotificationContext()
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const other = conversation.participants.find((p) => p.id !== user?.id)
  const unread = unreadCounts[conversation.id] ?? conversation.unread_count
  const isOnline = other ? onlineUsers.has(other.id) || other.is_online : false
  const m = conversation.membership

  const closeMenu = () => { setMenuOpen(false); setConfirmDelete(false) }

  const patch = async (body: ConversationStatePatch) => {
    closeMenu()
    if (!conversation.uuid) return
    try {
      await patchConversationState(conversation.uuid, body)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    } catch (e) {
      showError(e, 'Could not update conversation.')
    }
  }

  const del = async () => {
    closeMenu()
    if (!conversation.uuid) return
    try {
      await deleteConversation(conversation.uuid)
      // The backend still lists deleted chats, so remember the deletion locally
      // and filter it out of the list (until a newer message arrives).
      hideConversation(conversation.id, new Date().toISOString())
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      showSuccess('Chat deleted')
      if (isActive) router.push('/chat') // close the open thread we just deleted
    } catch (e) {
      showError(e, 'Could not delete conversation.')
    }
  }

  // ── Long-press to open the actions menu on mobile ──────────────────────────
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)
  const startPress = () => {
    longPressed.current = false
    pressTimer.current = setTimeout(() => { longPressed.current = true; setMenuOpen(true) }, 450)
  }
  const cancelPress = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null }
  }
  // Swallow the tap that follows a long-press so it doesn't also open the chat.
  const handleOpen = () => {
    if (longPressed.current) { longPressed.current = false; return }
    onClick()
  }

  return (
    <div
      className={`relative flex items-center ${isActive ? 'bg-white/50' : 'hover:bg-white/40'}`}
      onContextMenu={(e) => { e.preventDefault(); setMenuOpen(true) }}
    >
      <button
        onClick={handleOpen}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchMove={cancelPress}
        className="flex flex-1 items-center gap-3 px-4 py-3 text-left min-w-0"
      >
        <span
          role="button"
          tabIndex={0}
          aria-label="View profile"
          onClick={(e) => { e.stopPropagation(); if (other) router.push(`/profile/${other.id}`) }}
          onKeyDown={(e) => { if (e.key === 'Enter' && other) { e.stopPropagation(); router.push(`/profile/${other.id}`) } }}
          className="relative flex-shrink-0 cursor-pointer"
        >
          <ProfileImage
            src={resolveImageUrl(other?.profile_picture ?? other?.profile_image)}
            name={other?.display_name ?? other?.full_name ?? '?'}
            className="w-10 h-10 rounded-full"
            textClassName="text-sm"
          />
          <span className={`absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`flex items-center gap-1 text-sm truncate ${unread > 0 ? 'font-bold text-[#1a1a2e]' : 'font-semibold text-[#2D2424]'}`}>
              {m?.is_pinned && <Pin className="h-3 w-3 text-indigo-500 shrink-0" />}
              {m?.is_muted && <BellOff className="h-3 w-3 text-[#746767] shrink-0" />}
              {other?.display_name ?? other?.full_name ?? 'Unknown'}
            </span>
            {conversation.last_message && (
              <span className="text-[10px] text-[#746767] flex-shrink-0 ml-1">
                {formatTime(conversation.last_message.created_at)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <p className={`text-xs truncate ${unread > 0 ? 'font-medium text-[#2D2424]' : 'text-[#746767]'}`}>
              {conversation.last_message?.content ?? 'No messages yet'}
            </p>
            {unread > 0 && !m?.is_muted && (
              <span className="flex-shrink-0 ml-2 w-5 h-5 rounded-full bg-indigo-600
                               text-white text-[10px] font-bold flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Kebab actions (sibling of the row button — valid HTML) */}
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#746767] mr-2 opacity-60 hover:opacity-100"
        aria-label="Conversation actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={closeMenu} />
          <div className="absolute right-2 top-12 z-20 w-44 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5 text-sm">
            {confirmDelete ? (
              <div className="p-3">
                <p className="mb-2 text-xs text-[#746767]">Delete this chat for you?</p>
                <div className="flex gap-2">
                  <button onClick={closeMenu}
                    className="flex-1 rounded-lg border border-[#EADDD2] px-2 py-1.5 text-xs font-medium text-[#2D2424]">
                    Cancel
                  </button>
                  <button onClick={del}
                    className="glass-btn-rose flex-1 rounded-lg px-2 py-1.5 text-xs font-medium">
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Item icon={m?.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  label={m?.is_pinned ? 'Unpin' : 'Pin'} onClick={() => patch({ is_pinned: !m?.is_pinned })} />
                <Item icon={m?.is_muted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  label={m?.is_muted ? 'Unmute' : 'Mute'} onClick={() => patch({ is_muted: !m?.is_muted })} />
                <Item icon={m?.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                  label={m?.is_archived ? 'Unarchive' : 'Archive'} onClick={() => patch({ is_archived: !m?.is_archived })} />
                <Item icon={<Trash2 className="h-4 w-4" />} label="Delete" danger
                  onClick={() => setConfirmDelete(true)} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Item({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 ${danger ? 'text-[#F87171]' : 'text-[#2D2424]'}`}>
      {icon}{label}
    </button>
  )
}

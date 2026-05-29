import { Conversation } from '@/shared/types/chat.types'
import { useAuth } from '@/features/auth'
import Avatar from '@/features/profile/components/Avatar'
import { formatTime } from '@/shared/lib/utils'
import { useNotificationContext } from '@/features/notification/context/NotificationContext'

interface Props {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}

export default function ConversationItem({ conversation, isActive, onClick }: Props) {
  const { user } = useAuth()
  const { unreadCounts, onlineUsers } = useNotificationContext()

  const other = conversation.participants.find((p) => p.id !== user?.id)
  const unread = unreadCounts[conversation.id] ?? conversation.unread_count
  const isOnline = other ? onlineUsers.has(other.id) || other.is_online : false

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${isActive ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
    >
      <Avatar name={other?.username ?? '?'} size="md" isOnline={isOnline} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm truncate ${unread > 0 ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-800 dark:text-gray-200'}`}>
            {other?.username ?? 'Unknown'}
          </span>
          {conversation.last_message && (
            <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
              {formatTime(conversation.last_message.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {conversation.last_message?.content ?? 'No messages yet'}
          </p>
          {unread > 0 && (
            <span className="flex-shrink-0 ml-2 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
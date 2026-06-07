import { Conversation } from '@/shared/types/chat.types'
import { useAuth } from '@/features/auth'
import ProfileImage from '@/shared/components/ProfileImage'
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
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left
        ${isActive ? 'bg-white/50' : 'hover:bg-white/40'}`}
    >
      <div className="relative flex-shrink-0">
        <ProfileImage
          src={other?.profile_picture ?? other?.profile_image}
          name={other?.display_name ?? other?.username ?? '?'}
          className="w-10 h-10 rounded-full"
          textClassName="text-sm"
        />
        <span className={`absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm truncate ${unread > 0 ? 'font-bold text-[#1a1a2e]' : 'font-semibold text-[#2D2424]'}`}>
            {other?.username ?? 'Unknown'}
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
          {unread > 0 && (
            <span className="flex-shrink-0 ml-2 w-5 h-5 rounded-full bg-indigo-600
                             text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

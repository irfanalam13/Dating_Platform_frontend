import { Message } from '@/shared/types/chat.types'
import { formatTime } from '@/shared/lib/utils'
import { useAuth } from '@/features/auth'

interface Props { message: Message }

export default function MessageBubble({ message }: Props) {
  const { user } = useAuth()
  const isMine = Number(user?.id) === Number(message.sender.id)

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
      <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed
        ${isMine
          ? 'bg-indigo-600 text-white rounded-br-sm'
          : 'bg-white/80 text-[#1a1a2e] rounded-bl-sm shadow-sm'
        }`}>
        <p className="break-words whitespace-pre-wrap">{message.content}</p>
        <div className={`flex items-center justify-end gap-1 mt-0.5
          ${isMine ? 'text-indigo-200' : 'text-[#746767]'}`}>
          <span className="text-[10px]">{formatTime(message.created_at)}</span>
          {isMine && (
            <span className="text-[10px]">
              {message.is_read ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
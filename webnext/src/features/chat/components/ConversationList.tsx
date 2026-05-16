'use client'

import { useQuery } from '@tanstack/react-query'
import { getConversations } from '@/shared/api/chat.api'
import ConversationItem from './ConversationItem'

interface Props {
  activeId: string | null
  onSelect: (id: string) => void
}

export default function ConversationList({ activeId, onSelect }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    refetchInterval: 30_000,
  })

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Messages</h2>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          </div>
        )}

        {data?.results.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isActive={conv.id === activeId}
            onClick={() => onSelect(conv.id)}
          />
        ))}

        {!isLoading && !data?.results.length && (
          <div className="px-4 py-12 text-center text-sm text-gray-400">
            No conversations yet
          </div>
        )}
      </div>
    </div>
  )
}

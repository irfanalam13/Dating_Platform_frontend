'use client'

import { useQuery } from '@tanstack/react-query'
import { getConversations } from '@/shared/api/chat.api'
import ConversationItem from './ConversationItem'

interface Props {
  activeId: string | null
  onSelect: (id: string) => void
}

export default function ConversationList({ activeId, onSelect }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['conversations'],
    queryFn: getConversations,
    refetchInterval: 30_000,
  })

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto divide-y divide-white/40">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          </div>
        )}

        {!isLoading && error && (
          <div className="px-4 py-12 text-center text-sm text-red-500">
            Failed to load conversations. Please try again.
          </div>
        )}

        {!isLoading && !error && data?.results?.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isActive={conv.id === activeId}
            onClick={() => onSelect(conv.id)}
          />
        ))}

        {!isLoading && !error && !data?.results?.length && (
          <div className="px-4 py-12 text-center text-sm text-gray-400">
            No conversations yet
          </div>
        )}
      </div>
    </div>
  )
}

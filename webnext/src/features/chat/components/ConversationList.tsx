'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getConversations } from '@/shared/api/chat.api'
import ConversationItem from './ConversationItem'
import { filterHidden } from '../lib/hiddenConversations'

interface Props {
  activeId: string | null
  onSelect: (id: string) => void
}

export default function ConversationList({ activeId, onSelect }: Props) {
  const [filter, setFilter] = useState<'all' | 'archived'>('all')

  const { data, isLoading, error } = useQuery({
    queryKey: ['conversations', filter],
    queryFn: () => getConversations(filter === 'archived' ? 'archived' : undefined),
    refetchInterval: 30_000,
  })

  // Pinned conversations float to the top (server already orders by recency).
  // Locally-deleted chats are filtered out (see hiddenConversations).
  const conversations = useMemo(() => {
    const list = filterHidden(data?.results ?? [])
    return [...list].sort((a, b) =>
      Number(b.membership?.is_pinned ?? false) - Number(a.membership?.is_pinned ?? false)
    )
  }, [data])

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-2">
        {(['all', 'archived'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition
              ${filter === f ? 'bg-indigo-600 text-white' : 'glass-btn'}`}
          >
            {f}
          </button>
        ))}
      </div>

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

        {!isLoading && !error && conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isActive={conv.id === activeId}
            onClick={() => onSelect(conv.id)}
          />
        ))}

        {!isLoading && !error && !conversations.length && (
          <div className="px-4 py-12 text-center text-sm text-gray-400">
            {filter === 'archived' ? 'No archived chats' : 'No conversations yet'}
          </div>
        )}
      </div>
    </div>
  )
}

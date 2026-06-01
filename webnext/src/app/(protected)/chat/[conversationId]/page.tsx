'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth'
import { MessageInbox } from '@/features/chat/components/MessageInbox'
import ChatWindow from '@/features/chat/components/ChatWindow'
import ConversationList from '@/features/chat/components/ConversationList'
import NotificationBell from '@/features/notification/components/NotificationBell'

export default function ChatPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeId, setActiveId] = useState<string | null>(null)

  return (
    <>
      {/* Mobile: show the new MessageInbox */}
      <div className="block lg:hidden">
        <MessageInbox />
      </div>

      {/* Desktop: keep the two-panel layout */}
      <div className="hidden lg:flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
        {/* Sidebar */}
        <aside className="w-80 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {user?.username}
            </span>
            <div className="flex items-center gap-1">
              <NotificationBell />
            </div>
          </div>

          <ConversationList activeId={activeId} onSelect={setActiveId} />
        </aside>

        {/* Chat area */}
        <main className="flex-1 flex flex-col min-w-0">
          {activeId ? (
            <ChatWindow conversationId={activeId} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Select a conversation to start chatting
            </div>
          )}
        </main>
      </div>
    </>
  )
}
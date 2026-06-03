'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth'
import { MessageInbox } from '@/features/chat/components/MessageInbox'
import ConversationList from '@/features/chat/components/ConversationList'
import NotificationBell from '@/features/notification/components/NotificationBell'

export default function ChatPage() {
  const { user } = useAuth()
  const router = useRouter()

  return (
    <>
      {/* ── Mobile: full-screen inbox (matches the WhatsApp-style design) ── */}
      <div className="lg:hidden">
        <MessageInbox />
      </div>

      {/* ── Desktop: persistent two-panel (list + empty state) ── */}
      <div className="hidden lg:flex h-[100dvh] overflow-hidden bg-gray-50 dark:bg-gray-950">
        <aside className="w-80 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {user?.username}
            </span>
            <NotificationBell />
          </div>

          {/* Clicking a conversation drives the URL → the right panel updates */}
          <ConversationList
            activeId={null}
            onSelect={(id) => router.push(`/chat/${id}`)}
          />
        </aside>

        <main className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Select a conversation to start chatting
        </main>
      </div>
    </>
  )
}

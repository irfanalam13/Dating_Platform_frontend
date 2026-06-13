'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { MessageInbox } from '@/features/chat/components/MessageInbox'
import ConversationList from '@/features/chat/components/ConversationList'

export default function ChatPage() {
  const router = useRouter()

  return (
    <>
      {/* ── Mobile: full-screen inbox (matches the WhatsApp-style design) ── */}
      <div className="lg:hidden">
        <MessageInbox />
      </div>

      {/* ── Desktop: persistent two-panel (list + empty state) ── */}
      <div
        className="hidden lg:flex h-[100dvh] overflow-hidden"
        style={{ background: "linear-gradient(180deg, #ffffff 0%, #eef8ff 40%, #d7ebfb 100%)" }}
      >
        <aside className="w-80 flex-shrink-0 flex flex-col border-r border-white/40 bg-white/60 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/40">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="glass-btn grid h-9 w-9 shrink-0 place-items-center rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-base font-semibold text-[#B78A3B]">Messages</h2>
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

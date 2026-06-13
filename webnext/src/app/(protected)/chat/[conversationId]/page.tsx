"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ChatWindow from "@/features/chat/components/ChatWindow";
import ConversationList from "@/features/chat/components/ConversationList";

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams<{ conversationId: string }>();
  const conversationIdStr = String(params.conversationId);

  return (
    <div
      className="flex h-[100dvh] overflow-hidden"
      style={{ background: "linear-gradient(180deg, #ffffff 0%, #eef8ff 40%, #d7ebfb 100%)" }}
    >
      {/* ── Desktop-only sidebar (WhatsApp-style persistent list) ── */}
      <aside className="hidden lg:flex w-80 flex-shrink-0 flex-col border-r border-white/40 bg-white/60 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/40">
          <button
            type="button"
            onClick={() => router.push("/home")}
            aria-label="Go back"
            className="glass-btn grid h-9 w-9 shrink-0 place-items-center rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-base font-semibold text-[#B78A3B]">Messages</h2>
        </div>
        <ConversationList
          activeId={conversationIdStr}
          onSelect={(id) => router.push(`/chat/${id}`)}
        />
      </aside>

      {/* ── Conversation panel: ChatWindow owns the single header (avatar, name,
          online + connection status, and the 3-dot menu with view profile /
          report / block). ── */}
      <main className="flex flex-1 flex-col min-w-0 bg-white dark:bg-gray-950">
        <div className="min-h-0 flex-1">
          <ChatWindow conversationId={conversationIdStr} />
        </div>
      </main>
    </div>
  );
}

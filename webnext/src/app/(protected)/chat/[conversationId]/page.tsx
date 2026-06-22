"use client";

import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ChatWindow from "@/features/chat/components/ChatWindow";
import ConversationList from "@/features/chat/components/ConversationList";

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams<{ conversationId: string }>();
  const conversationIdStr = String(params.conversationId);

  // ── Mobile keyboard handling ──────────────────────────────────────────────
  // `100svh`/`100dvh` are fixed heights that DON'T shrink when the on-screen
  // keyboard opens, so the input bar ends up floating above the keyboard with a
  // dead gap below it. We instead size the chat to the *visual viewport* (the
  // region actually visible above the keyboard) and re-measure as it changes —
  // so the header stays pinned at the top and the message bar sits flush against
  // the keyboard. Falls back to the CSS `h-[100svh]` when the API is absent.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const apply = () => {
      const el = rootRef.current;
      if (!el) return;
      el.style.height = `${vv.height}px`;
      el.style.transform = `translateY(${vv.offsetTop}px)`;
    };
    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
    };
  }, []);

  // Press Escape to leave the open conversation and return to the
  // "Select a conversation to start chatting" view (/chat). Skip when a text
  // field is focused, so Escape there still cancels a reply/edit or closes the
  // in-chat search instead of navigating away.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      router.push("/chat");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 flex h-[100svh] overflow-hidden"
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

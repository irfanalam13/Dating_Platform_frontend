"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, CheckCheck } from "lucide-react";
import { Inter } from "next/font/google";
import { getConversations } from "@/shared/api/chat.api";
import { useAuth } from "@/features/auth";
import { useNotificationContext } from "@/features/notification/context/NotificationContext";
import type { Conversation, ConversationParticipant } from "@/shared/types/chat.types";
import ProfileImage from "@/shared/components/ProfileImage";
import { useMatchAvatars, pickAvatar } from "@/features/chat/hooks/useMatchAvatars";
import { filterHidden } from "@/features/chat/lib/hiddenConversations";
import StoryBar from "@/features/chat/components/StoryBar";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function getDisplayName(person: ConversationParticipant): string {
  return person.name ?? person.display_name ?? person.full_name ?? "Matched user";
}

function getProfileImage(
  person: ConversationParticipant,
  matchAvatars: Map<number, string>,
): string {
  return pickAvatar(person.profile_image ?? person.profile_picture, person.id, matchAvatars) ?? "/default.png";
}

function getLastMessageText(conversation: Conversation): string {
  if (!conversation.last_message) return "Start a conversation";
  return conversation.last_message.content;
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export function MessageInbox() {
  const router                      = useRouter();
  const { user }                    = useAuth();
  const { unreadCounts, onlineUsers, totalChatUnread, markConversationRead, markAllRead } =
    useNotificationContext();
  const matchAvatars                  = useMatchAvatars();
  const [query, setQuery]           = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  // Open a conversation, clearing its unread badge instantly on the way in.
  const openConversation = (conversationId: string) => {
    markConversationRead(conversationId);
    router.push(`/chat/${conversationId}`);
  };

  const handleMarkAllRead = async () => {
    if (markingAll || totalChatUnread === 0) return;
    setMarkingAll(true);
    try {
      await markAllRead();
    } finally {
      setMarkingAll(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => getConversations(),
    retry: false,
    enabled: !!user,
  });

  //   Fix — data is PaginatedResponse<Conversation>, unwrap .results
  //   filterHidden drops chats the user deleted locally ("delete for me").
  const conversations: Conversation[] = filterHidden(data?.results ?? []);

  // Sort by most recently updated
  const sorted = [...conversations].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const getOtherParticipant = (
    participants: ConversationParticipant[]
  ): ConversationParticipant | undefined => {
    // Coerce to Number so a string/number id mismatch doesn't make us
    // accidentally pick ourselves (which showed the current user's profile).
    const myId = Number(user?.id);
    return participants.find((p) => Number(p.id) !== myId);
  };

  // Filter by the other participant's name (or the last message text), case-insensitive.
  const q = query.trim().toLowerCase();
  const filtered = q
    ? sorted.filter((conv) => {
        const person = getOtherParticipant(conv.participants);
        const nameHit = person ? getDisplayName(person).toLowerCase().includes(q) : false;
        const msgHit = getLastMessageText(conv).toLowerCase().includes(q);
        return nameHit || msgHit;
      })
    : sorted;

  return (
    <main
      className={`${inter.className} min-h-[100dvh] text-[#1a1a2e] lg:min-h-screen`}
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #eef8ff 40%, #d7ebfb 100%)",
      }}
    >
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-4 pb-24 pt-4">

        {/* Header */}
        <header className="mb-4 rounded-[28px] border border-white/70 bg-white/65 px-4 py-3 shadow-[0_10px_28px_rgba(16,24,40,0.10)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/home")}
              aria-label="Go back"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/80 bg-white/85 text-[#1a1a2e] shadow-[0_4px_12px_rgba(16,24,40,0.08)]"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <h1 className="truncate text-[18px] font-semibold leading-tight text-[#B78A3B]">Message inbox</h1>
              {totalChatUnread > 0 && (
                <span
                  className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[#63d6f6] px-1.5 text-[11px] font-bold text-white shadow-sm"
                  aria-label={`${totalChatUnread} unread`}
                >
                  {totalChatUnread > 99 ? "99+" : totalChatUnread}
                </span>
              )}
            </div>
            {totalChatUnread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="flex shrink-0 items-center gap-1 rounded-full border border-white/80 bg-white/85 px-3 py-1.5 text-xs font-semibold text-[#1a1a2e] shadow-[0_4px_12px_rgba(16,24,40,0.08)] transition-colors hover:bg-white disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5 text-[#63d6f6]" />
                {markingAll ? "Marking…" : "Mark all read"}
              </button>
            )}
          </div>
        </header>

        {/* Search bar */}
        <div className="mb-5">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your matches"
              className="w-full rounded-full border border-white/70 bg-white/75 py-3 pl-5 pr-12 text-sm text-[#1a1a2e] placeholder-gray-400 outline-none shadow-[0_8px_20px_rgba(16,24,40,0.08)] backdrop-blur-md transition-all focus:border-[#4cc9f0] focus:ring-2 focus:ring-[#4cc9f0]/20"
            />
            <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#1a1a2e]" />
          </div>
        </div>

        {/* Stories — only people (matches) who posted an active 24h story,
            plus "Your story" for posting. Not an avatar-per-match strip. */}
        <StoryBar />

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex animate-pulse items-center gap-3 rounded-[22px] border border-white/65 bg-white/60 p-4 shadow-[0_8px_20px_rgba(16,24,40,0.06)] backdrop-blur-md"
              >
                <div className="h-14 w-14 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded-full bg-gray-200" />
                  <div className="h-3 w-2/3 rounded-full bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="grid min-h-[420px] place-items-center rounded-[28px] border border-white/60 bg-white/50 p-8 text-center shadow-[0_10px_26px_rgba(16,24,40,0.08)] backdrop-blur-md">
            <div>
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#e8f4fd] shadow-[0_8px_18px_rgba(16,24,40,0.08)]">
                <svg className="h-8 w-8 text-[#4cc9f0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-[#1a1a2e]">
                {q ? "No matches found" : "No conversations yet"}
              </h2>
            </div>
          </div>
        )}

        {/* Conversation list */}
        {!isLoading && filtered.length > 0 && (
          <div className="space-y-1">
            {filtered.map((conversation) => {
              const person = getOtherParticipant(conversation.participants);
              if (!person) return null;

              const displayName  = getDisplayName(person);
              const profileImage = getProfileImage(person, matchAvatars);
              const isOnline     = onlineUsers.has(person.id) || person.is_online;
              const unread       = unreadCounts[conversation.id] ?? conversation.unread_count ?? 0;

              return (
                <button
                  key={conversation.id}
                  onClick={() => openConversation(conversation.id)}
                  className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-white/40 active:scale-[0.99]"
                >
                  {/* Avatar with online dot */}
                  <div className="relative shrink-0">
                    <ProfileImage
                      src={profileImage}
                      name={displayName}
                      alt={displayName}
                      className="h-14 w-14 rounded-full"
                      textClassName="text-lg"
                    />
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#00D46A] shadow-[0_0_4px_rgba(0,212,106,0.5)]" />
                    )}
                  </div>

                  {/* Name + last message */}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[15px] font-bold ${unread > 0 ? "text-[#1a1a2e]" : "text-[#1a1a2e]"}`}>
                      {displayName}
                    </p>
                    <p className={`mt-0.5 truncate text-sm ${unread > 0 ? "font-medium text-[#1a1a2e]" : "text-gray-500"}`}>
                      {getLastMessageText(conversation)}
                    </p>
                  </div>

                  {/* Unread badge */}
                  {unread > 0 && (
                    <span className="shrink-0 grid h-6 w-6 place-items-center rounded-full bg-[#63d6f6] text-[11px] font-bold text-white shadow-sm">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}
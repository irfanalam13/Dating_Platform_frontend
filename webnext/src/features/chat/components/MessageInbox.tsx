"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ChevronLeft, Search } from "lucide-react";
import { Inter } from "next/font/google";
import { getConversations } from "@/shared/api/chat.api";
import { useAuth } from "@/features/auth";
import { useNotificationContext } from "@/features/notification/context/NotificationContext";
import { formatTime } from "@/shared/utils/time";
import type { Conversation, ConversationParticipant } from "@/shared/types/chat.types";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function getDisplayName(person: ConversationParticipant): string {
  return person.name ?? person.display_name ?? person.username ?? "Matched user";
}

function getProfileImage(person: ConversationParticipant): string {
  return person.profile_image ?? person.profile_picture ?? "/default.png";
}

function getLastMessageText(conversation: Conversation): string {
  if (!conversation.last_message) return "Start a thoughtful conversation";
  return conversation.last_message.content;
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export function MessageInbox() {
  const router                      = useRouter();
  const { user }                    = useAuth();
  const { unreadCounts, onlineUsers } = useNotificationContext();

  const { data, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
    retry: false,
    enabled: !!user,
  });

  // ✅ Fix — data is PaginatedResponse<Conversation>, unwrap .results
  const conversations: Conversation[] = data?.results ?? [];

  // Sort by most recently updated
  const sorted = [...conversations].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const getOtherParticipant = (
    participants: ConversationParticipant[]
  ): ConversationParticipant | undefined =>
    participants.find((p) => p.id !== user?.id);

  // Get all participants for the horizontal match bar
  const matchParticipants = sorted
    .map((conv) => {
      const person = getOtherParticipant(conv.participants);
      if (!person) return null;
      const isOnline = onlineUsers.has(person.id) || person.is_online;
      return { person, isOnline, conversationId: conv.id };
    })
    .filter(Boolean) as { person: ConversationParticipant; isOnline: boolean; conversationId: string }[];

  return (
    <main
      className={`${inter.className} min-h-[100dvh] text-[#1a1a2e]`}
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #e8f4fd 50%, #d4ecf9 100%)",
      }}
    >
      <div className="mx-auto max-w-md px-4 pb-24">

        {/* Header */}
        <header className="flex items-center gap-3 pt-5 pb-4">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="grid h-9 w-9 place-items-center"
          >
            <ChevronLeft className="h-6 w-6 text-[#1a1a2e]" />
          </button>
          <h1 className="text-xl font-bold text-[#1a1a2e]">Message inbox</h1>
        </header>

        {/* Search bar */}
        <div className="mb-5">
          <div className="relative">
            <input
              type="text"
              placeholder="Search your matches"
              className="w-full rounded-full border border-gray-200 bg-white/80 py-3 pl-5 pr-12 text-sm text-[#1a1a2e] placeholder-gray-400 outline-none backdrop-blur-sm focus:border-[#4cc9f0] focus:ring-2 focus:ring-[#4cc9f0]/20 transition-all"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Horizontal match avatars */}
        {matchParticipants.length > 0 && (
          <div className="mb-6 overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 pb-2">
              {matchParticipants.map(({ person, isOnline, conversationId }) => (
                <button
                  key={person.id}
                  onClick={() => router.push(`/chat/${conversationId}`)}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  <div className="relative">
                    {/* Ring border - red if has messages, cyan/teal accent */}
                    <div
                      className="rounded-full p-[3px]"
                      style={{
                        background: isOnline
                          ? "linear-gradient(135deg, #00D46A, #00B4D8)"
                          : "linear-gradient(135deg, #FF4458, #FF6B81)",
                      }}
                    >
                      <div className="rounded-full bg-white p-[2px]">
                        <img
                          src={getProfileImage(person)}
                          alt={getDisplayName(person)}
                          className="h-14 w-14 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/default.png";
                          }}
                        />
                      </div>
                    </div>
                    {/* Online dot */}
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#00D46A] shadow-[0_0_4px_rgba(0,212,106,0.5)]" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Horizontal divider */}
            <div className="mt-3 h-[2px] w-full bg-gray-400" />
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex animate-pulse items-center gap-3 rounded-2xl bg-white/60 p-4 backdrop-blur-sm"
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
        {!isLoading && sorted.length === 0 && (
          <div className="grid min-h-[420px] place-items-center rounded-2xl bg-white/50 p-8 text-center backdrop-blur-sm">
            <div>
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#e8f4fd]">
                <svg className="h-8 w-8 text-[#4cc9f0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-[#1a1a2e]">No conversations yet</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                When both people show interest, a conversation will open here.
              </p>
            </div>
          </div>
        )}

        {/* Conversation list */}
        {!isLoading && sorted.length > 0 && (
          <div className="space-y-2">
            {sorted.map((conversation) => {
              const person = getOtherParticipant(conversation.participants);
              if (!person) return null;

              const displayName  = getDisplayName(person);
              const profileImage = getProfileImage(person);
              const isOnline     = onlineUsers.has(person.id) || person.is_online;
              const unread       = unreadCounts[conversation.id] ?? conversation.unread_count ?? 0;

              return (
                <button
                  key={conversation.id}
                  onClick={() => router.push(`/chat/${conversation.id}`)}
                  className="flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-all hover:bg-white/30 active:scale-[0.99]"
                >
                  {/* Avatar with online dot */}
                  <div className="relative shrink-0">
                    <img
                      src={profileImage}
                      alt={displayName}
                      className="h-14 w-14 rounded-full object-cover"
                      loading="eager"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/default.png";
                      }}
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
                    <span className="shrink-0 grid h-6 w-6 place-items-center rounded-full bg-[#FF4458] text-[11px] font-bold text-white shadow-sm">
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
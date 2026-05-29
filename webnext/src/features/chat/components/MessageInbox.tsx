"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ChevronLeft, MessageCircle, ShieldCheck } from "lucide-react";
import { getConversations } from "@/shared/api/chat.api";
import { useAuth } from "@/features/auth";
import { useNotificationContext } from "@/features/notification/context/NotificationContext";
import { formatTime } from "@/shared/utils/time";
import type { Conversation, ConversationParticipant } from "@/shared/types/chat.types";

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

  return (
    <main className="min-h-[100dvh] text-[#2D2424]">
      <div className="mx-auto max-w-md px-4 py-5">

        {/* Header */}
        <header className="mb-5 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="grid h-10 w-10 place-items-center rounded-full border border-[#EADDD2]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Conversations</h1>
            <p className="text-sm text-[#746767]">
              Only mutual matches can message you.
            </p>
          </div>
        </header>

        {/* Safety banner */}
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-[#EADDD2] p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[#3F7D63]" />
          <p className="text-sm text-[#746767]">
            Report and block controls are available in every chat.
          </p>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex animate-pulse items-center gap-3 rounded-lg border border-[#EADDD2] p-4"
              >
                <div className="h-12 w-12 rounded-full bg-[#EADDD2]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-[#EADDD2]" />
                  <div className="h-3 w-2/3 rounded bg-[#EADDD2]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && sorted.length === 0 && (
          <div className="grid min-h-[420px] place-items-center rounded-lg border border-[#EADDD2] p-8 text-center">
            <div>
              <MessageCircle className="mx-auto mb-4 h-10 w-10 text-[#7A2432]" />
              <h2 className="font-semibold">No conversations yet</h2>
              <p className="mt-2 text-sm leading-6 text-[#746767]">
                When both people show interest, a conversation will open here.
              </p>
            </div>
          </div>
        )}

        {/* Conversation list */}
        {!isLoading && sorted.length > 0 && (
          <div className="space-y-3">
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
                  className="flex w-full items-center gap-3 rounded-lg border border-[#EADDD2] p-4 text-left transition-colors hover:bg-[#FFF8F1]"
                >
                  {/* Avatar with online dot */}
                  <div className="relative shrink-0">
                    <img
                      src={profileImage}
                      alt={displayName}
                      className="h-12 w-12 rounded-full object-cover"
                      loading="eager"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/default.png";
                      }}
                    />
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                    )}
                  </div>

                  {/* Name + last message */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate font-semibold ${unread > 0 ? "text-[#2D2424]" : "text-[#2D2424]"}`}>
                        {displayName}
                      </p>
                      <span className="shrink-0 text-xs text-[#746767]">
                        {conversation.last_message
                          ? formatTime(conversation.last_message.created_at)
                          : formatTime(conversation.updated_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={`truncate text-sm ${unread > 0 ? "font-medium text-[#2D2424]" : "text-[#746767]"}`}>
                        {getLastMessageText(conversation)}
                      </p>
                      {/* Unread badge */}
                      {unread > 0 && (
                        <span className="shrink-0 grid h-5 w-5 place-items-center rounded-full bg-[#7A2432] text-[10px] font-bold text-white">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}
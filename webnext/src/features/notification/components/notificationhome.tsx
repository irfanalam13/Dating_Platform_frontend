"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";import {
  Bell,
  ChevronLeft,
  HeartHandshake,
  MessageCircle,
  ShieldCheck,
  UserPlus,
  Phone,
  Megaphone,
} from "lucide-react";
import type { Notification, NotificationType } from "@/shared/types/notification.types";
import { useNotifications } from "@/features/notification/hooks/useNotifications";
import { formatTime } from "@/shared/utils/time";
import { useAuth } from "@/features/auth";

// ─────────────────────────────────────────────────────────
// Icon
// ─────────────────────────────────────────────────────────

function NotificationIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case "new_message":     return <MessageCircle className="h-5 w-5" />;
    case "friend_request":  return <UserPlus className="h-5 w-5" />;
    case "friend_accepted": return <HeartHandshake className="h-5 w-5" />;
    case "missed_call":     return <Phone className="h-5 w-5" />;
    case "safety_alert":    return <ShieldCheck className="h-5 w-5" />;
    case "system":          return <Megaphone className="h-5 w-5" />;
    default:                return <Bell className="h-5 w-5" />;
  }
}

function iconClass(type: NotificationType, isRead: boolean): string {
  if (isRead) return "bg-[#F8EFE6] text-[#746767]";
  switch (type) {
    case "safety_alert": return "bg-red-600 text-white";
    case "missed_call":  return "bg-orange-500 text-white";
    default:             return "bg-[#7A2432] text-white";
  }
}

// ─────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────

function useNotificationNavigation() {
  const router = useRouter();

  return (item: Notification) => {
    const d = (item.data ?? {}) as Record<string, unknown>;

    switch (item.notification_type) {
      case "new_message": {
        const conversationId = d.conversation_id as string | undefined;
        if (conversationId) router.push(`/chat/${conversationId}`);
        break;
      }
      case "friend_request":
      case "friend_accepted": {
        const userId = (d.from_user_id ?? d.by_user_id) as string | undefined;
        if (userId) router.push(`/profile/${userId}`);
        else router.push("/matches");
        break;
      }
      case "missed_call": {
        const fromUserId = d.from_user_id as string | undefined;
        if (fromUserId) router.push(`/profile/${fromUserId}`);
        break;
      }
      case "system": {
        const actionUrl = d.action_url as string | undefined;
        if (actionUrl) router.push(actionUrl);
        break;
      }
      case "safety_alert":
        router.push("/safety");
        break;
      default:
        break;
    }
  };
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export default function NotificationHome() {
  const router = useRouter();
  const { user } = useAuth();

  const {
    notifications,
    markRead,
    markAllRead,
  } = useNotifications(user?.id ?? null);

  const navigate = useNotificationNavigation();

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const handleOpen = (item: Notification) => {
    if (!item.is_read) markRead([item.id]);
    navigate(item);
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    await markAllRead();
    setIsMarkingAll(false);
  };

  return (
    <main className="min-h-[100dvh] bg-[#FFF8F1] px-4 pb-24 pt-5 text-[#2D2424]">
      <div className="mx-auto max-w-md">

        {/* Header */}
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              aria-label="Go back"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#EADDD2] bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold">Notifications</h1>
              <p className="text-sm text-[#746767]">
                Matches, messages, and safety updates.
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isMarkingAll}
              className="shrink-0 rounded-full border border-[#EADDD2] bg-white
                         px-3 py-1.5 text-xs font-medium text-[#7A2432]
                         disabled:opacity-50"
            >
              {isMarkingAll ? "Marking…" : "Mark all read"}
            </button>
          )}
        </header>

        {/* Empty state */}
        {notifications.length === 0 && (
          <div className="grid min-h-[420px] place-items-center rounded-lg border border-[#EADDD2] bg-white p-8 text-center">
            <div>
              <Bell className="mx-auto mb-4 h-10 w-10 text-[#7A2432]" />
              <h2 className="font-semibold">No notifications yet</h2>
              <p className="mt-2 text-sm leading-6 text-[#746767]">
                Important match, message, and safety updates will appear here.
              </p>
            </div>
          </div>
        )}

        {/* List */}
        {notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((item: Notification) => (
              <button
                key={item.id}
                onClick={() => handleOpen(item)}
                className={`flex w-full items-start gap-3 rounded-lg border p-4
                  text-left transition-colors
                  ${item.is_read
                    ? "border-[#EADDD2] bg-white"
                    : "border-[#D4A89A] bg-[#FEF6F0]"
                  }`}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center
                  rounded-full ${iconClass(item.notification_type, item.is_read)}`}>
                  <NotificationIcon type={item.notification_type} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className={`block text-sm ${!item.is_read ? "font-semibold" : "font-medium"}`}>
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-sm leading-5 text-[#746767]">
                    {item.body || "Tap to view details."}
                  </span>
                  <span className="mt-1 block text-xs text-[#A89090]">
                    {formatTime(item.created_at)}
                  </span>
                </span>

                {!item.is_read && (
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#B78A3B]" />
                )}
              </button>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
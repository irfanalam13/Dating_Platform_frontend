"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Bell,
  HeartHandshake,
  MessageCircle,
  ShieldCheck,
  UserPlus,
  Phone,
  Megaphone,
  MoreVertical,
  Trash2,
} from "lucide-react";
import type { Notification, NotificationType } from "@/shared/types/notification.types";
import {
  useNotificationList,
  useMarkNotificationsRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from "@/features/notification/hooks/useNotifications";
import { formatTimeWithClock } from "@/shared/utils/time";
import { useRouter } from "next/navigation";

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

function iconClass(_type: NotificationType, _isRead: boolean): string {
  // Pure glossy glass for every notification icon.
  return "glass-glossy";
}

function useNotificationNavigation() {
  const router = useRouter();
  return (item: Notification) => {
    const d = (item.data ?? {}) as Record<string, unknown>;
    switch (item.notification_type) {
      case "new_message": {
        const id = d.conversation_id as string | undefined;
        if (id) router.push("/chat/" + id);
        break;
      }
      case "friend_request":
      case "friend_accepted":
      case "interest_claimed":
        // "Someone wants to match you" → go straight to the Matches page
        router.push("/matches");
        break;
      case "missed_call": {
        const uid = d.from_user_id as string | undefined;
        if (uid) router.push("/profile/" + uid);
        break;
      }
      case "system": {
        const url = d.action_url as string | undefined;
        if (url) router.push(url);
        break;
      }
      case "safety_alert":
        router.push("/safety");
        break;
    }
  };
}

export default function NotificationHome() {
  const router = useRouter();
  const navigate = useNotificationNavigation();
  const { data, isLoading }                              = useNotificationList();
  const { mutate: markRead }                             = useMarkNotificationsRead();
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllNotificationsRead();
  const { mutate: deleteNotif, isPending: isDeleting }   = useDeleteNotification();
  const unreadCount = data.filter((n: Notification) => !n.is_read).length;

  const handleOpen = (item: Notification) => {
    if (!item.is_read) markRead([item.id]);
    navigate(item);
  };

  return (
    <main className="min-h-[100dvh] px-4 pb-24 pt-5 text-[#2D2424]">
      <div className="mx-auto max-w-md lg:max-w-2xl">
        <header className="mb-5 rounded-[28px] border border-white/70 bg-white/65 px-4 py-3 shadow-[0_10px_28px_rgba(16,24,40,0.10)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/home")}
              aria-label="Go back"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/80 bg-white/85 text-[#1a1a2e] shadow-[0_4px_12px_rgba(16,24,40,0.08)]"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[18px] font-semibold leading-tight text-[#B78A3B]">Notifications</h1>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                disabled={isMarkingAll}
                className="ml-auto shrink-0 rounded-full border border-[#EADDD2] px-3 py-1.5 text-xs font-medium text-[#F87171] disabled:opacity-50"
              >
                {isMarkingAll ? "Marking..." : "Mark all read"}
              </button>
            )}
          </div>
        </header>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg border border-[#EADDD2]" />
            ))}
          </div>
        )}

        {!isLoading && data.length === 0 && (
          <div className="grid min-h-[420px] place-items-center rounded-lg border border-[#EADDD2] p-8 text-center">
            <div>
              <Bell className="mx-auto mb-4 h-10 w-10 text-[#FFBF00] fill-current" />
              <h2 className="font-semibold">No notifications yet</h2>
            </div>
          </div>
        )}

        {!isLoading && data.length > 0 && (
          <div className="space-y-3">
            {data.map((item: Notification) => (
              <NotificationRow
                key={item.id}
                item={item}
                onOpen={() => handleOpen(item)}
                onDelete={() => deleteNotif(item.id)}
                isDeleting={isDeleting}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// ─── Single notification row (open action + three-dot delete menu) ──────────────
function NotificationRow({
  item,
  onOpen,
  onDelete,
  isDeleting,
}: {
  item: Notification;
  onOpen: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={
        "glass-card relative flex w-full items-start gap-3 rounded-lg border p-4 " +
        (item.is_read ? "border-[#EADDD2]" : "border-[#D4A89A]")
      }
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-start gap-3 text-left"
      >
        <span
          className={
            "grid h-10 w-10 shrink-0 place-items-center rounded-full " +
            iconClass(item.notification_type, item.is_read)
          }
        >
          <NotificationIcon type={item.notification_type} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={"block text-sm " + (!item.is_read ? "font-semibold" : "font-medium")}>
            {item.title}
          </span>
          <span className="mt-0.5 block text-sm leading-5 text-[#746767]">
            {item.body || "Tap to view details."}
          </span>
          <span className="mt-1 block text-xs text-[#A89090]">{formatTimeWithClock(item.created_at)}</span>
        </span>
      </button>

      {!item.is_read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#B78A3B]" />}

      {/* Three-dot actions */}
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Notification actions"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#746767] hover:bg-black/5"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {menuOpen && (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div
            role="menu"
            className="absolute right-3 top-12 z-20 w-40 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5 text-sm"
          >
            <button
              type="button"
              role="menuitem"
              disabled={isDeleting}
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[#F87171] hover:bg-gray-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
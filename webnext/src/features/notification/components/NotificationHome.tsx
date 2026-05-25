"use client";

import { useRouter } from "next/navigation";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
import {
  Bell,
  ChevronLeft,
  HeartHandshake,
  MessageCircle,
  ShieldCheck,
  UserPlus,
  Phone,
  Megaphone,
  Heart,
  Star,
  Users,
  Camera,
  Lightbulb,
  Image as ImageIcon,
} from "lucide-react";
import type { Notification, NotificationType } from "@/shared/types/notification.types";
import {
  useNotificationList,
  useMarkNotificationsRead,
  useMarkAllNotificationsRead,
} from "@/features/notification/hooks/useNotifications";
import { formatTime } from "@/shared/utils/time";

/* ─── Action icon on the right side of each notification ─── */
function NotificationActionIcon({ type }: { type: NotificationType }) {
  const baseClass = "h-5 w-5";
  switch (type) {
    case "new_message":
      return <ImageIcon className={`${baseClass} text-sky-400`} />;
    case "friend_request":
      return <Heart className={`${baseClass} text-rose-400`} />;
    case "friend_accepted":
      return <Star className={`${baseClass} text-amber-400`} fill="currentColor" />;
    case "missed_call":
      return <Users className={`${baseClass} text-rose-500`} />;
    case "safety_alert":
      return <ShieldCheck className={`${baseClass} text-red-500`} />;
    case "system":
      return <Lightbulb className={`${baseClass} text-amber-400`} fill="currentColor" />;
    default:
      return <Bell className={`${baseClass} text-sky-400`} />;
  }
}

/* ─── Avatar placeholder colours per notification type ─── */
function avatarGradient(type: NotificationType): string {
  switch (type) {
    case "new_message":     return "from-sky-300 to-sky-500";
    case "friend_request":  return "from-rose-300 to-rose-500";
    case "friend_accepted": return "from-amber-300 to-amber-500";
    case "missed_call":     return "from-orange-300 to-orange-500";
    case "safety_alert":    return "from-red-400 to-red-600";
    case "system":          return "from-violet-300 to-violet-500";
    default:                return "from-slate-300 to-slate-500";
  }
}

/* ─── Avatar initials helper ─── */
function getInitials(title: string): string {
  const words = title.replace(/^(New |Missed |Friend |Safety )/i, "").split(" ");
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0]?.[0] ?? "?").toUpperCase();
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
      case "friend_accepted": {
        const uid = (d.from_user_id ?? d.by_user_id) as string | undefined;
        if (uid) router.push("/profile/" + uid);
        else router.push("/matches");
        break;
      }
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
  const router   = useRouter();
  const navigate = useNotificationNavigation();
  const { data, isLoading }                              = useNotificationList();
  const { mutate: markRead }                             = useMarkNotificationsRead();
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllNotificationsRead();
  const unreadCount = data.filter((n: Notification) => !n.is_read).length;

  const handleOpen = (item: Notification) => {
    if (!item.is_read) markRead([item.id]);
    navigate(item);
  };

  return (
    <main
      className={`${inter.className} min-h-[100dvh] px-4 pb-24 pt-6`}
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #e0f0ff 60%, #c6e4fa 100%)",
      }}
    >
      <div className="mx-auto max-w-md">
        {/* ── Header ─────────────────────────────── */}
        <header className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="grid h-9 w-9 shrink-0 place-items-center"
          >
            <ChevronLeft className="h-6 w-6 text-[#1a1a2e]" />
          </button>
          <h1 className="text-[1.65rem] font-bold tracking-tight text-[#1a1a2e]">
            Notifications
          </h1>
        </header>

        {/* ── Mark-all-read (small link, only when needed) ── */}
        {unreadCount > 0 && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => markAllRead()}
              disabled={isMarkingAll}
              className="text-xs font-medium text-sky-600 hover:text-sky-700 disabled:opacity-50"
            >
              {isMarkingAll ? "Marking…" : "Mark all as read"}
            </button>
          </div>
        )}

        {/* ── Skeleton loading ───────────────────── */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl bg-white/70 p-4"
              >
                <div className="h-11 w-11 animate-pulse rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-100" />
                </div>
                <div className="h-5 w-5 animate-pulse rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ────────────────────────── */}
        {!isLoading && data.length === 0 && (
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="mb-5 grid h-20 w-20 place-items-center rounded-full bg-white/80 shadow-sm">
              <Bell className="h-9 w-9 text-sky-400" />
            </div>
            <h2 className="text-lg font-semibold text-[#1a1a2e]">No notifications yet</h2>
            <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-slate-500">
              Important match, message, and safety updates will appear here.
            </p>
          </div>
        )}

        {/* ── Notification list ──────────────────── */}
        {!isLoading && data.length > 0 && (
          <div className="space-y-3">
            {data.map((item: Notification) => (
              <button
                key={item.id}
                onClick={() => handleOpen(item)}
                className={
                  "group flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left " +
                  "transition-all duration-200 ease-out " +
                  "hover:scale-[1.015] hover:shadow-md " +
                  "active:scale-[0.99] " +
                  (item.is_read
                    ? "border-white/60 bg-white/65 shadow-sm backdrop-blur-sm"
                    : "border-white/80 bg-white/85 shadow-sm backdrop-blur-sm")
                }
              >
                {/* Avatar circle */}
                <span
                  className={
                    "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br text-white text-sm font-bold shadow-sm " +
                    avatarGradient(item.notification_type)
                  }
                >
                  {getInitials(item.title)}
                </span>

                {/* Text */}
                <span className="min-w-0 flex-1">
                  <span
                    className={
                      "block truncate text-[0.9rem] leading-snug text-[#1a1a2e] " +
                      (!item.is_read ? "font-semibold" : "font-medium")
                    }
                  >
                    {item.body || item.title}
                  </span>
                  <span className="mt-0.5 block text-[0.7rem] text-slate-400">
                    {formatTime(item.created_at)}
                  </span>
                </span>

                {/* Action icon */}
                <span className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  <NotificationActionIcon type={item.notification_type} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
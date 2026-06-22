"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  Check,
  HeartHandshake,
  MessageCircle,
  MoreVertical,
  ShieldCheck,
  Trash2,
  UserPlus,
  Phone,
  Megaphone,
} from "lucide-react";
import type { Notification, NotificationType } from "@/shared/types/notification.types";
import {
  useNotificationList,
  useMarkNotificationsRead,
  useMarkAllNotificationsRead,
  useDeleteAllNotifications,
  notificationKeys,
} from "@/features/notification/hooks/useNotifications";
import { deleteNotification } from "@/shared/api/notification.api";
import { formatTimeWithClock } from "@/shared/utils/time";
import { showError, showSuccess, showUndo } from "@/shared/utils/toast";
import { useRouter } from "next/navigation";

const UNDO_WINDOW_MS = 5000;

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

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-gray-50 " +
        (danger ? "text-[#7A2432]" : "text-[#2D2424]")
      }
    >
      {icon}
      {label}
    </button>
  );
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

function NotificationRow({
  item,
  onOpen,
  onMarkRead,
  onDelete,
}: {
  item: Notification;
  onOpen: (item: Notification) => void;
  onMarkRead: (id: string) => void;
  onDelete: (item: Notification) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div
      className={
        "glass-card group relative flex w-full items-start gap-3 rounded-lg border p-4 " +
        (item.is_read ? "border-[#EADDD2]" : "border-[#D4A89A]")
      }
    >
      {/* Clickable content — opens / routes the notification */}
      <button
        type="button"
        onClick={() => onOpen(item)}
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
          <span className="mt-1 block text-xs text-[#A89090]">
            {formatTimeWithClock(item.created_at)}
          </span>
        </span>
      </button>

      {/* Action cluster: unread dot · three-dot menu */}
      <div className="flex shrink-0 items-center gap-1">
        {!item.is_read && (
          <span className="mr-0.5 h-2 w-2 shrink-0 rounded-full bg-[#B78A3B]" />
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Notification actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="glass-btn grid h-7 w-7 place-items-center rounded-full"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={closeMenu} />
              <div
                role="menu"
                className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-xl bg-white text-sm shadow-xl ring-1 ring-black/5"
              >
                {!item.is_read && (
                  <MenuItem
                    icon={<Check className="h-4 w-4" />}
                    label="Mark as read"
                    onClick={() => {
                      onMarkRead(item.id);
                      closeMenu();
                    }}
                  />
                )}
                <MenuItem
                  icon={<Trash2 className="h-4 w-4" />}
                  label="Delete"
                  danger
                  onClick={() => {
                    onDelete(item);
                    closeMenu();
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotificationHome() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const navigate = useNotificationNavigation();
  const { data, isLoading }                              = useNotificationList();
  const { mutate: markRead }                             = useMarkNotificationsRead();
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllNotificationsRead();
  const { mutate: clearAll, isPending: isClearing }     = useDeleteAllNotifications();

  // Delayed-commit delete: hidden immediately, committed after the undo window.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const unhide = (id: string) =>
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const commitDelete = (item: Notification) => {
    timers.current.delete(item.id);
    deleteNotification(item.id)
      .then(() => {
        // Drop from the cache so it stays gone across refetches.
        queryClient.setQueryData<Notification[]>(notificationKeys.all, (old = []) =>
          old.filter((n) => n.id !== item.id)
        );
        unhide(item.id);
      })
      .catch((e) => {
        unhide(item.id); // restore to view
        showError(e, "Could not delete notification.");
      });
  };

  // Opens the "undo phase" with three controls: Undo (restore), a 5s countdown
  // that auto-commits, and ✕ (commit immediately) — all driven from the toast.
  const requestDelete = (item: Notification) => {
    if (timers.current.has(item.id)) return; // already pending
    setPendingIds((prev) => new Set(prev).add(item.id));
    const timer = setTimeout(() => commitDelete(item), UNDO_WINDOW_MS);
    timers.current.set(item.id, timer);

    showUndo("Notification deleted", {
      durationMs: UNDO_WINDOW_MS,
      onUndo: () => {
        const t = timers.current.get(item.id);
        if (t) clearTimeout(t);
        timers.current.delete(item.id);
        unhide(item.id);
      },
      onDeleteNow: () => {
        const t = timers.current.get(item.id);
        if (t) clearTimeout(t);
        commitDelete(item);
      },
    });
  };

  // On unmount, flush any still-pending deletions so leaving the page doesn't
  // silently cancel them (deletion is the intended action; undo is the exception).
  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const [id, timer] of map.entries()) {
        clearTimeout(timer);
        deleteNotification(id).catch(() => {});
      }
      map.clear();
    };
  }, []);

  const visible = data.filter((n: Notification) => !pendingIds.has(n.id));
  const unreadCount = visible.filter((n: Notification) => !n.is_read).length;

  const handleOpen = (item: Notification) => {
    if (!item.is_read) markRead([item.id]);
    navigate(item);
  };

  const handleClearAll = () => {
    // Cancel any in-flight per-item undos so they don't fire after the bulk wipe.
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
    setPendingIds(new Set());
    clearAll(undefined, {
      onSuccess: () => showSuccess("All notifications cleared"),
      onError: (e) => showError(e, "Could not clear notifications."),
    });
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
                className="shrink-0 rounded-full border border-[#EADDD2] px-3 py-1.5 text-xs font-medium text-[#7A2432] disabled:opacity-50"
              >
                {isMarkingAll ? "Marking..." : "Mark all read"}
              </button>
            )}
            {visible.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={isClearing}
                className="shrink-0 rounded-full border border-[#EADDD2] px-3 py-1.5 text-xs font-medium text-[#7A2432] disabled:opacity-50"
              >
                {isClearing ? "Clearing..." : "Clear all"}
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

        {!isLoading && visible.length === 0 && (
          <div className="grid min-h-[420px] place-items-center rounded-lg border border-[#EADDD2] p-8 text-center">
            <div>
              <Bell className="mx-auto mb-4 h-10 w-10 text-[#FFBF00] fill-current" />
              <h2 className="font-semibold">No notifications yet</h2>
            </div>
          </div>
        )}

        {!isLoading && visible.length > 0 && (
          <div className="space-y-3">
            {visible.map((item: Notification) => (
              <NotificationRow
                key={item.id}
                item={item}
                onOpen={handleOpen}
                onMarkRead={(id) => markRead([id])}
                onDelete={requestDelete}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

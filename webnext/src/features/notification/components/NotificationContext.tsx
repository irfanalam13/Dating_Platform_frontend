"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationWebSocket } from "@/shared/lib/websocket";
import { getAccessToken } from "@/shared/api/client";
import { notificationKeys } from "@/features/notification/hooks/useNotifications";
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { Notification, NotificationType } from "@/shared/types/notification.types";
import type { UnreadCounts } from "@/shared/types/chat.types";
import {
  type WSNotificationEvent,
  type WSNewMessageEvent,
  type WSUserOnlineEvent,
  type WSUserOfflineEvent,
  type WSUnreadCountEvent,
  type WSMessageReadEvent,
  type WSFriendRequestEvent,
  type WSFriendAcceptedEvent,
  type WSMissedCallEvent,
  type WSSafetyAlertEvent,
  type WSSystemEvent,
  isNewMessageEvent,
  isPresenceEvent,
  isUnreadCountEvent,
  isMessageReadEvent,
} from "@/shared/types/notification.types";

// ─────────────────────────────────────────────────────────
// Context shape
// ─────────────────────────────────────────────────────────

interface NotificationContextValue {
  notifications: Notification[];
  unreadCounts: UnreadCounts;
  totalUnread: number;
  onlineUsers: Set<number>;
  wsStatus: "connecting" | "connected" | "disconnected" | "error";
  markConversationRead: (conversationId: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ─────────────────────────────────────────────────────────
// Build a Notification row from a WS event
// so it appears in the bell panel instantly
// ─────────────────────────────────────────────────────────

const EVENT_TO_TYPE: Record<string, NotificationType> = {
  "notification.new_message":    "new_message",
  "notification.friend_request": "friend_request",
  "notification.friend_accepted":"friend_accepted",
  "notification.missed_call":    "missed_call",
  "notification.safety_alert":   "safety_alert",
  "notification.system":         "system",
};

function buildNotification(event: WSNotificationEvent): Notification | null {
  const notifType = EVENT_TO_TYPE[event.event];
  if (!notifType) return null;

  let title = "";
  let body  = "";

  switch (event.event) {
    case "notification.new_message": {
      const e = event as WSNewMessageEvent;
      title = `New message from ${e.sender_name}`;
      body  = e.preview;
      break;
    }
    case "notification.friend_request": {
      const e = event as WSFriendRequestEvent;
      title = "New friend request";
      body  = `${e.from_name} wants to connect with you.`;
      break;
    }
    case "notification.friend_accepted": {
      const e = event as WSFriendAcceptedEvent;
      title = "Friend request accepted";
      body  = `${e.by_name} accepted your request.`;
      break;
    }
    case "notification.missed_call": {
      const e = event as WSMissedCallEvent;
      title = "Missed call";
      body  = `You missed a ${e.call_type} call from ${e.from_name}.`;
      break;
    }
    case "notification.safety_alert": {
      const e = event as WSSafetyAlertEvent;
      title = "Safety notice";
      body  = e.reason;
      break;
    }
    case "notification.system": {
      const e = event as WSSystemEvent;
      title = "System notice";
      body  = e.message;
      break;
    }
  }

  return {
    id: crypto.randomUUID(),
    notification_type: notifType,
    title,
    body,
    data: event as unknown as Record<string, unknown>,
    is_read: false,
    read_at: null,
    created_at: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const queryClient                         = useQueryClient();
  const user                                = useAuthStore((s) => s.user);
  const wsRef                               = useRef<NotificationWebSocket | null>(null);
  const [notifications, setNotifications]   = useState<Notification[]>([]);
  const [unreadCounts, setUnreadCounts]     = useState<UnreadCounts>({});
  const [totalUnread, setTotalUnread]       = useState(0);
  const [onlineUsers, setOnlineUsers]       = useState<Set<number>>(new Set());
  const [wsStatus, setWsStatus]             = useState<NotificationContextValue["wsStatus"]>(
    "disconnected"
  );

  // ── WS event handler ──────────────────────────────────

  const handleEvent = useCallback(
    (event: WSNotificationEvent) => {

      // 1. Bulk unread sync — on connect + after mark_read
      if (isUnreadCountEvent(event)) {
        const e = event as WSUnreadCountEvent;
        setUnreadCounts(e.unread_counts);
        setTotalUnread(e.total);
        return;
      }

      // 2. Presence — green/grey dot on avatars
      if (isPresenceEvent(event)) {
        if (event.event === "notification.user_online") {
          const e = event as WSUserOnlineEvent;
          setOnlineUsers((prev) => new Set([...prev, e.user_id]));
        } else {
          const e = event as WSUserOfflineEvent;
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            next.delete(e.user_id);
            return next;
          });
        }
        return;
      }

      // 3. New message — increment conversation badge
      if (isNewMessageEvent(event)) {
        const e = event as WSNewMessageEvent;
        setUnreadCounts((prev) => ({
          ...prev,
          [e.conversation_id]: (prev[e.conversation_id] ?? 0) + 1,
        }));
        setTotalUnread((t) => t + 1);
        // Fall through — also store in notification list
      }

      // 4. Message read — clear sender's badge
      if (isMessageReadEvent(event)) {
        const e = event as WSMessageReadEvent;
        setUnreadCounts((prev) => {
          const next = { ...prev };
          delete next[e.conversation_id];
          return next;
        });
        setTotalUnread((t) => Math.max(0, t - 1));
        return;
      }

      // 5. Pong — keepalive reply, ignore
      if (event.event === "pong") return;

      // 6. Error
      if (event.event === "error") {
        console.error("NotificationWS error:", event.message);
        return;
      }

      // 7. All other events — store in bell panel list
      //    and invalidate React Query so NotificationHome refreshes
      const notif = buildNotification(event);
      if (notif) {
        setNotifications((prev) => [notif, ...prev].slice(0, 50));
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      }
    },
    [queryClient]
  );

  // ── WebSocket lifecycle ────────────────────────────────

  useEffect(() => {
    if (!user) return;

    const token = getAccessToken();
    if (!token) return;

    const ws = new NotificationWebSocket({
      onOpen:  () => setWsStatus("connected"),
      onClose: () => setWsStatus("disconnected"),
      onError: () => setWsStatus("error"),
    });

    wsRef.current = ws;
    const unsub = ws.subscribe(handleEvent);
    ws.connect(token);

    return () => {
      unsub();
      ws.disconnect();
      wsRef.current = null;
      setWsStatus("disconnected");
    };
  }, [user, handleEvent]);

  // ── Public actions ─────────────────────────────────────

  const markConversationRead = useCallback((conversationId: string) => {
    // Tells NotificationConsumer to clear the badge +
    // triggers a fresh unread_count sync from the backend
    wsRef.current?.markRead(conversationId);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCounts,
        totalUnread,
        onlineUsers,
        wsStatus,
        markConversationRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────

export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotificationContext must be used inside NotificationProvider");
  }
  return ctx;
}
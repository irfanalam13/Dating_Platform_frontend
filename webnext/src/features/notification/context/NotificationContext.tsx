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
import { useAuth } from "@/features/auth";
import { notificationKeys } from "@/features/notification/hooks/useNotifications";
import type { UnreadCounts } from "@/shared/types/chat.types";
import type {
  Notification,
  NotificationContextValue,
  NotificationType,
  WSNotificationEvent,
  WSNewMessageEvent,
  WSFriendRequestEvent,
  WSFriendAcceptedEvent,
  WSMissedCallEvent,
  WSSafetyAlertEvent,
  WSSystemEvent,
  WSUnreadCountEvent,
  WSUserOnlineEvent,
  WSUserOfflineEvent,
  WSMessageReadEvent,
} from "@/shared/types/notification.types";
import {
  isNewMessageEvent,
  isPresenceEvent,
  isUnreadCountEvent,
  isMessageReadEvent,
} from "@/shared/types/notification.types";
import api, { getAccessToken, setAccessToken } from '@/shared/api/client';

// ─────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────

const NotifContext = createContext<NotificationContextValue | null>(null);

// ─────────────────────────────────────────────────────────
// Build Notification row from WS event for bell panel
// ─────────────────────────────────────────────────────────

const EVENT_TO_TYPE: Partial<Record<string, NotificationType>> = {
  "notification.new_message":     "new_message",
  "notification.friend_request":  "friend_request",
  "notification.friend_accepted": "friend_accepted",
  "notification.missed_call":     "missed_call",
  "notification.safety_alert":    "safety_alert",
  "notification.system":          "system",
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
  const { user }                            = useAuth();
  const queryClient                         = useQueryClient();
  const wsRef                               = useRef<NotificationWebSocket | null>(null);
  const [notifications, setNotifications]   = useState<Notification[]>([]);
  const [unreadCounts, setUnreadCounts]     = useState<UnreadCounts>({});
  const [totalUnread, setTotalUnread]       = useState(0);
  const [onlineUsers, setOnlineUsers]       = useState<Set<number>>(new Set());
  const [wsStatus, setWsStatus]             = useState<NotificationContextValue["wsStatus"]>("disconnected");

  // ── Event handler ─────────────────────────────────────

  const handleEvent = useCallback(
    (event: WSNotificationEvent) => {

      // 1. Bulk unread sync
      if (isUnreadCountEvent(event)) {
        const e = event as WSUnreadCountEvent;
        setUnreadCounts(e.unread_counts);
        setTotalUnread(e.total);
        return;
      }

      // 2. Presence
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

      // 3. New message — increment badge
      if (isNewMessageEvent(event)) {
        const e = event as WSNewMessageEvent;
        setUnreadCounts((prev) => ({
          ...prev,
          [e.conversation_id]: (prev[e.conversation_id] ?? 0) + 1,
        }));
        setTotalUnread((t) => t + 1);
        // fall through to store in bell list
      }

      // 4. Message read — clear badge
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

      // 5. Pong — ignore
      if (event.event === "pong") return;

      // 6. Error
      if (event.event === "error") {
        console.error("NotificationWS error:", event.message);
        return;
      }

      // 7. Store in bell panel + invalidate React Query list
      const notif = buildNotification(event);
      if (notif) {
        setNotifications((prev) => [notif, ...prev].slice(0, 50));
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      }
    },
    [queryClient]
  );

  // ── WS lifecycle ──────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const connectWS = async () => {
      // ✅ Refresh token first
      let token = getAccessToken();

      try {
        const { default: api, setAccessToken } = await import('@/shared/api/client');
        const refreshRes = await api.post('/auth/refresh/');
        const newToken = refreshRes?.data?.data?.access || null;
        if (newToken) {
          setAccessToken(newToken);
          token = newToken;
        }
      } catch (e) {
        console.warn('Could not refresh token before notification WS connect');
      }

      if (!token || cancelled) return;

      const ws = new NotificationWebSocket({
        onOpen:  () => setWsStatus('connected'),
        onClose: () => setWsStatus('disconnected'),
        onError: () => setWsStatus('error'),
      });

      wsRef.current = ws;
      const unsub = ws.subscribe(handleEvent);
      ws.connect(token);

      return unsub;
    };

    connectWS();

    return () => {
      cancelled = true;
      wsRef.current?.disconnect();
      wsRef.current = null;
      setWsStatus('disconnected');
    };
  }, [user, handleEvent]);

  // ── markConversationRead ──────────────────────────────

  const markConversationRead = useCallback((conversationId: string) => {
    wsRef.current?.markRead(conversationId);
  }, []);

  // ── Render ────────────────────────────────────────────

  return (
    <NotifContext.Provider
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
    </NotifContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────

export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error("useNotificationContext must be used inside NotificationProvider");
  return ctx;
}
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { NotificationWebSocket } from "@/shared/lib/websocket";
import { getAccessToken } from "@/shared/api/client";

import {
  getNotifications,
  markNotificationsRead,
  markAllNotificationsRead,
} from "@/shared/api/notification.api";

import type {
  Notification,
  WSNotificationEvent,
  WSNewMessageEvent,
  WSUserOnlineEvent,
  WSUserOfflineEvent,
  WSUnreadCountEvent,
  WSMessageReadEvent,
  WSSafetyAlertEvent,
  WSSystemEvent,
  WSFriendRequestEvent,
  WSFriendAcceptedEvent,
  WSMissedCallEvent,
} from "@/shared/types/notification.types";
import type { UnreadCounts } from "@/shared/types/chat.types";
import {
  isNewMessageEvent,
  isPresenceEvent,
  isUnreadCountEvent,
  isMessageReadEvent,
} from "@/shared/types/notification.types";





// ─────────────────────────────────────────────────────────
// Query key factory
// ─────────────────────────────────────────────────────────

export const notificationKeys = {
  all: ["notifications"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};

// ─────────────────────────────────────────────────────────
// useNotifications
// ─────────────────────────────────────────────────────────

interface UseNotificationsReturn {
  // State
  notifications: Notification[];
  unreadCounts: UnreadCounts;
  totalUnread: number;
  onlineUsers: Set<number>;
  wsStatus: "connecting" | "connected" | "disconnected" | "error";

  // Actions
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  markConversationRead: (conversationId: string) => void;
}

export function useNotifications(userId: number | null): UseNotificationsReturn {
  const queryClient = useQueryClient();
  const wsRef = useRef<NotificationWebSocket | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [totalUnread, setTotalUnread] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [wsStatus, setWsStatus] = useState<UseNotificationsReturn["wsStatus"]>(
    "disconnected"
  );

  // ── WebSocket lifecycle ────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const token = getAccessToken();
    if (!token) return;

    const ws = new NotificationWebSocket({
      onOpen: () => setWsStatus("connected"),
      onClose: () => setWsStatus("disconnected"),
      onError: () => setWsStatus("error"),
    });

    wsRef.current = ws;

    const unsub = ws.subscribe((event: WSNotificationEvent) => {
      handleWSEvent(event);
    });

    ws.connect(token);

    return () => {
      unsub();
      ws.disconnect();
      wsRef.current = null;
      setWsStatus("disconnected");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── WS event handler ──────────────────────────────────

  const handleWSEvent = useCallback((event: WSNotificationEvent) => {

    // ── Bulk unread sync (on connect + after mark_read) ─
    if (isUnreadCountEvent(event)) {
      const e = event as WSUnreadCountEvent;
      setUnreadCounts(e.unread_counts);
      setTotalUnread(e.total);
      return;
    }

    // ── Presence ────────────────────────────────────────
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

    // ── New message — increment badge ────────────────────
    if (isNewMessageEvent(event)) {
      const e = event as WSNewMessageEvent;
      setUnreadCounts((prev) => ({
        ...prev,
        [e.conversation_id]: (prev[e.conversation_id] ?? 0) + 1,
      }));
      setTotalUnread((t) => t + 1);
      // Fall through to also store in notification list
    }

    // ── Message read — clear sender badge ───────────────
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

    // ── Pong — keepalive reply, ignore ──────────────────
    if (event.event === "pong") return;

    // ── Error ────────────────────────────────────────────
    if (event.event === "error") {
      console.error("NotificationWS error:", event.message);
      return;
    }

    // ── All other events — persist in notification list ──
    // Covers: new_message, friend_request, friend_accepted,
    //         missed_call, safety_alert, system
    const storedNotif = buildNotification(event);
    if (storedNotif) {
      setNotifications((prev) => [storedNotif, ...prev].slice(0, 50));

      // Invalidate React Query notification list so bell panel refreshes
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    }
  }, [queryClient]);

  // ── Build a local Notification from a WS event ────────

  function buildNotification(event: WSNotificationEvent): Notification | null {
    const typeMap: Record<string, Notification["notification_type"]> = {
      "notification.new_message":    "new_message",
      "notification.friend_request": "friend_request",
      "notification.friend_accepted":"friend_accepted",
      "notification.missed_call":    "missed_call",
      "notification.safety_alert":   "safety_alert",
      "notification.system":         "system",
    };

    const notifType = typeMap[event.event];
    if (!notifType) return null;

    // Build a human-readable title + body from the typed event
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

  // ── Public actions ─────────────────────────────────────

  const markRead = useCallback(async (ids: string[]) => {
    await markNotificationsRead(ids);
    setNotifications((prev) =>
      prev.map((n) =>
        ids.includes(n.id)
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      )
    );
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  }, [queryClient]);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    );
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });
  }, [queryClient]);

  /**
   * Called by useChat when the user opens a conversation.
   * Tells the NotificationConsumer to clear the badge
   * and triggers a fresh unread_count sync from the backend.
   */
  const markConversationRead = useCallback((conversationId: string) => {
    wsRef.current?.markRead(conversationId);
  }, []);

  return {
    notifications,
    unreadCounts,
    totalUnread,
    onlineUsers,
    wsStatus,
    markRead,
    markAllRead,
    markConversationRead,
  };
}

// ─────────────────────────────────────────────────────────
// useMarkNotificationsRead — marks specific IDs as read
// ─────────────────────────────────────────────────────────

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => markNotificationsRead(ids),

    // Optimistic update — mark read immediately in cache
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previous = queryClient.getQueryData<Notification[]>(
        notificationKeys.all
      );

      queryClient.setQueryData<Notification[]>(
        notificationKeys.all,
        (old = []) =>
          old.map((n: Notification) =>
            ids.includes(n.id)
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
      );

      return { previous };
    },

    // Roll back on error
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.all, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// ─────────────────────────────────────────────────────────
// useMarkAllNotificationsRead — marks every notification read
// ─────────────────────────────────────────────────────────

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),

    // Optimistic update
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previous = queryClient.getQueryData<Notification[]>(
        notificationKeys.all
      );

      queryClient.setQueryData<Notification[]>(
        notificationKeys.all,
        (old = []) =>
          old.map((n: Notification) => ({
            ...n,
            is_read: true,
            read_at: new Date().toISOString(),
          }))
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.all, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
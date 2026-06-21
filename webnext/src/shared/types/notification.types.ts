import type { UnreadCounts } from "@/shared/types/chat.types";

// ─────────────────────────────────────────────────────────
// Persisted notification types — matches backend model exactly
// ─────────────────────────────────────────────────────────

export type NotificationType =
  | "new_message"
  | "friend_request"
  | "friend_accepted"
  | "missed_call"
  | "safety_alert"
  | "system"
  | "interest_claimed";

// ─────────────────────────────────────────────────────────
// Notification row — matches GET /notifications/ response
// ─────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────
// WebSocket event type strings
// ─────────────────────────────────────────────────────────

export type WSNotificationEventType =
  | "notification.new_message"
  | "notification.friend_request"
  | "notification.friend_accepted"
  | "notification.user_online"
  | "notification.user_offline"
  | "notification.missed_call"
  | "notification.message_read"
  | "notification.unread_count"
  | "notification.safety_alert"
  | "notification.system"
  | "notification.interest_claimed"
  | "pong"
  | "error";

// ─────────────────────────────────────────────────────────
// Typed WS payload per event
// ─────────────────────────────────────────────────────────

export interface WSNewMessageEvent {
  event: "notification.new_message";
  conversation_id: string;
  sender_name: string;
  preview: string;
  unread_count: number;
  timestamp: string;
}

export interface WSFriendRequestEvent {
  event: "notification.friend_request";
  from_user_id: number;
  from_name: string;
  timestamp: string;
}

export interface WSFriendAcceptedEvent {
  event: "notification.friend_accepted";
  by_user_id: number;
  by_name: string;
  timestamp: string;
}

export interface WSUserOnlineEvent {
  event: "notification.user_online";
  user_id: number;
  is_online: true;
  last_seen: string;
}

export interface WSUserOfflineEvent {
  event: "notification.user_offline";
  user_id: number;
  is_online: false;
  last_seen: string;
}

export interface WSMissedCallEvent {
  event: "notification.missed_call";
  from_user_id: number;
  from_name: string;
  call_type: "voice" | "video";
  timestamp: string;
}

export interface WSMessageReadEvent {
  event: "notification.message_read";
  conversation_id: string;
  read_by_id: string;
  read_at: string;
}

export interface WSUnreadCountEvent {
  event: "notification.unread_count";
  unread_counts: UnreadCounts;
  total: number;
  synced_at: string;
}

export interface WSSafetyAlertEvent {
  event: "notification.safety_alert";
  reason: string;
  severity: "info" | "warning" | "critical";
  timestamp: string;
}

export interface WSSystemEvent {
  event: "notification.system";
  message: string;
  action_url: string;
  timestamp: string;
}

export interface WSInterestClaimedEvent {
  event: "notification.interest_claimed";
  from_user_id: number;
  from_name: string;
  timestamp: string;
}

export interface WSPongEvent {
  event: "pong";
  timestamp: string;
}

export interface WSErrorEvent {
  event: "error";
  message: string;
}

// ─────────────────────────────────────────────────────────
// Discriminated union — use this everywhere
// ─────────────────────────────────────────────────────────

export type WSNotificationEvent =
  | WSNewMessageEvent
  | WSFriendRequestEvent
  | WSFriendAcceptedEvent
  | WSUserOnlineEvent
  | WSUserOfflineEvent
  | WSMissedCallEvent
  | WSMessageReadEvent
  | WSUnreadCountEvent
  | WSSafetyAlertEvent
  | WSSystemEvent
  | WSInterestClaimedEvent
  | WSPongEvent
  | WSErrorEvent;

// ─────────────────────────────────────────────────────────
// Context shape — lives here so context + hooks share it
// ─────────────────────────────────────────────────────────

export interface NotificationContextValue {
  notifications: Notification[];
  unreadCounts: UnreadCounts;
  totalUnread: number;
  /** Sum of all per-conversation chat unread counts (drives the chat badge). */
  totalChatUnread: number;
  onlineUsers: Set<number>;
  wsStatus: "connecting" | "connected" | "disconnected" | "error";
  /** Mark one conversation read: optimistically clears its badge + notifies the server (WS). */
  markConversationRead: (conversationId: string) => void;
  /** Clear every conversation's unread badge and persist it server-side. */
  markAllRead: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────
// Type guards
// ─────────────────────────────────────────────────────────

export function isNewMessageEvent(e: WSNotificationEvent): e is WSNewMessageEvent {
  return e.event === "notification.new_message";
}

export function isPresenceEvent(
  e: WSNotificationEvent
): e is WSUserOnlineEvent | WSUserOfflineEvent {
  return (
    e.event === "notification.user_online" ||
    e.event === "notification.user_offline"
  );
}

export function isUnreadCountEvent(e: WSNotificationEvent): e is WSUnreadCountEvent {
  return e.event === "notification.unread_count";
}

export function isMessageReadEvent(e: WSNotificationEvent): e is WSMessageReadEvent {
  return e.event === "notification.message_read";
}
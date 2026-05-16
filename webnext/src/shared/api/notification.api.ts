import api from "@/shared/api/client";
import type { Notification } from "@/shared/types/notification.types";
import type { PaginatedResponse } from "@/shared/types/chat.types"
// ─────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────

function data<T>(config: Parameters<typeof api.request>[0]): Promise<T> {
  return api.request<T>(config).then((res) => res.data);
}

// ─────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────

/**
 * GET /notifications/
 * Paginated list, newest first.
 * Matches NotificationListView on the backend.
 */
export function getNotifications(): Promise<PaginatedResponse<Notification>> {
  return data({ method: "GET", url: "/notifications/" });
}

/**
 * POST /notifications/read/
 * body: { notification_ids: string[] }
 * Marks specific notifications as read.
 * Max 100 IDs per request (backend enforced).
 */
export function markNotificationsRead(ids: string[]): Promise<{ marked_read: number }> {
  return data({
    method: "POST",
    url: "/notifications/read/",
    data: { notification_ids: ids },
  });
}

/**
 * POST /notifications/read-all/
 * Marks every unread notification for the current user as read.
 */
export function markAllNotificationsRead(): Promise<{ marked_read: number }> {
  return data({
    method: "POST",
    url: "/notifications/read-all/",
  });
}

/**
 * GET /notifications/unread-count/
 * Lightweight endpoint for initial page load badge count.
 * After login, the WS unread_count event takes over.
 */
export function getUnreadCount(): Promise<{ unread_count: number }> {
  return data({ method: "GET", url: "/notifications/unread-count/" });
}
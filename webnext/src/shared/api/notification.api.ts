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
// Notification
// ─────────────────────────────────────────────────────────

/**
 * GET /notification/
 * Paginated list, newest first.
 * Matches NotificationListView on the backend.
 */
export function getNotifications(): Promise<PaginatedResponse<Notification>> {
  return data({ method: "GET", url: "/notification/" });
}

/**
 * POST /notification/read/
 * body: { notification_ids: string[] }
 * Marks specific notification as read.
 * Max 100 IDs per request (backend enforced).
 */
export function markNotificationsRead(ids: string[]): Promise<{ marked_read: number }> {
  return data({
    method: "POST",
    url: "/notification/read/",
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
    url: "/notification/read-all/",
  });
}

/**
 * GET /notifications/unread-count/
 * Lightweight endpoint for initial page load badge count.
 * After login, the WS unread_count event takes over.
 */
export function getUnreadCount(): Promise<{ unread_count: number }> {
  return data({ method: "GET", url: "/notification/unread-count/" });
}

/**
 * DELETE /notification/{id}/
 * Permanently removes a single notification owned by the caller.
 */
export function deleteNotification(id: string): Promise<void> {
  return data({ method: "DELETE", url: `/notification/${id}/` });
}

/**
 * POST /notification/delete-all/
 * Clears every notification for the current user.
 */
export function deleteAllNotifications(): Promise<{ deleted: number }> {
  return data({ method: "POST", url: "/notification/delete-all/" });
}

// ─────────────────────────────────────────────────────────
// Preferences (per category × channel)
// ─────────────────────────────────────────────────────────

export interface NotificationPreferences {
  match_inapp: boolean; message_inapp: boolean; follow_inapp: boolean;
  match_push: boolean; message_push: boolean; follow_push: boolean; marketing_push: boolean;
  email_enabled: boolean;
  match_email: boolean; message_email: boolean; follow_email: boolean; marketing_email: boolean;
  updated_at?: string;
}

export function getNotificationPreferences(): Promise<NotificationPreferences> {
  return data({ method: "GET", url: "/notification/preferences/" });
}

export function updateNotificationPreferences(
  patch: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  return data({ method: "PATCH", url: "/notification/preferences/", data: patch });
}
// @/shared/types/notification.types.ts

export type NotificationType = "match" | "message" | "safety" | string;

export interface AppNotification {
  id: number;
  title: string;
  body: string | null;
  notification_type: NotificationType;
  is_read: boolean;
  conversation_id?: number | null;
  profile_id?: number | null;
  created_at: string;
}
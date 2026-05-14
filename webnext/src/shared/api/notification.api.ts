// @/shared/api/notification.api.ts
import api from "./client";
import type { AppNotification } from "@/shared/types/notification.types";

export type { AppNotification }; // re-export so existing imports don't break

export const getNotifications = async (): Promise<AppNotification[]> => {
  const res = await api.get("/notification/");
  return res.data;
};

export const markNotificationRead = async (id: number): Promise<{ message: string }> => {
  const res = await api.post(`/notification/${id}/read/`);
  return res.data;
};
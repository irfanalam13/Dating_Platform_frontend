// features/notification/hooks/useNotifications.ts
import {
  useCallback,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  getNotifications,
  markNotificationsRead,
  markAllNotificationsRead,
} from "@/shared/api/notification.api";

import type { Notification } from "@/shared/types/notification.types";

// ─────────────────────────────────────────────────────────
// Query key factory
// ─────────────────────────────────────────────────────────

export const notificationKeys = {
  all: ["notifications"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};

// ─────────────────────────────────────────────────────────
// useNotificationList — REST fetch for the full page list
// Used by NotificationHome.tsx
// ─────────────────────────────────────────────────────────

interface UseNotificationListReturn {
  data: Notification[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useNotificationList(): UseNotificationListReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: notificationKeys.all,
    queryFn: async () => {
      const res = await getNotifications();
      return res.results;
    },
    staleTime: 30_000,
    retry: 1,
    // Safety net so new notifications (e.g. match requests) appear without a
    // manual refresh even if the realtime WS event is missed.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  return {
    data: data ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// ─────────────────────────────────────────────────────────
// useMarkNotificationsRead — marks specific IDs as read
// ─────────────────────────────────────────────────────────

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => markNotificationsRead(ids),

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
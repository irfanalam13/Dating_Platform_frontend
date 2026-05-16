"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/shared/api/auth.api";
import { useAuthStore } from "../store/auth.store";
import { setAccessToken } from "@/shared/api/client";
import api from "@/shared/api/client";  // ✅ missing import

export function useCurrentUser() {
  const { user: storeUser, setAuth } = useAuthStore();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["authUser"],  // ✅ missing queryKey — required by React Query

    queryFn: async () => {
      try {
        // Step 1 — get access token from httpOnly refresh cookie
        const refreshRes = await api.post("/auth/refresh/");

        console.log("REFRESH RESPONSE:", JSON.stringify(refreshRes?.data, null, 2));

        const token =
          refreshRes?.data?.data?.tokens?.access ||
          refreshRes?.data?.tokens?.access       ||
          refreshRes?.data?.access               ||
          refreshRes?.data?.access_token         ||
          null;

        if (token) {
          setAccessToken(token);
          console.log("✅ Token restored on page load:", token.slice(0, 20) + "...");
        } else {
          console.warn("⚠️ Refresh returned no token:", refreshRes?.data);
        }

        // Step 2 — fetch user profile
        const res = await getMe();
        return (res as Record<string, unknown>)?.data
          ?? (res as Record<string, unknown>)?.user
          ?? res
          ?? null;

      } catch {
        // No active session — stay logged out
        return null;
      }
    },

    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });

  // Sync React Query result → Zustand store
  useEffect(() => {
    if (data) {
      if (JSON.stringify(storeUser) !== JSON.stringify(data)) {
        setAuth(data as Parameters<typeof setAuth>[0]);
      }
    } else if (!isLoading && storeUser !== null) {
      setAuth(null);
    }
  }, [data, isLoading, storeUser, setAuth]);

  return {
    user: storeUser,
    loading: isLoading,
    isAuthenticated: !!storeUser,
    error,
    refetch,
  };
}
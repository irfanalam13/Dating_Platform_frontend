"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/shared/api/auth.api";
import { useAuthStore } from "../store/auth.store";
import { refreshOnce } from "@/shared/api/client";  // ✅ import refreshOnce

export function useCurrentUser() {
  const { user: storeUser, setAuth } = useAuthStore();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["authUser"],

    queryFn: async () => {
      try {
        // ✅ Single refresh — no duplicate calls
        const token = await refreshOnce()

        if (token) {
          console.log("✅ Token restored:", token.slice(0, 20) + "...");
        } else {
          console.warn("⚠️ Could not refresh token");
        }

        const res = await getMe();
        return (res as Record<string, unknown>)?.data
          ?? (res as Record<string, unknown>)?.user
          ?? res
          ?? null;

      } catch {
        return null;
      }
    },

    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });

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

"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { getMe } from "@/shared/api/auth.api";
import { useAuthStore } from "../store/auth.store";
import { getAccessToken, refreshOnce } from "@/shared/api/client";

export function useCurrentUser() {
  const { user: storeUser, setAuth } = useAuthStore();

  const { data, isLoading, isFetched, error, refetch } = useQuery({
    queryKey: ["authUser"],

    queryFn: async () => {
      try {
        const loggedIn = Cookies.get("logged_in") === "true";
        let token = getAccessToken();

        if (!token) {
          token = await refreshOnce();
        }

        if (!token && !loggedIn) {
          return null;
        }

        const res = await getMe();
        return (res as Record<string, unknown>)?.data
          ?? (res as Record<string, unknown>)?.user
          ?? res
          ?? null;
      } catch {
        if (Cookies.get("logged_in") !== "true" && !getAccessToken()) {
          setAuth(null);
        }
        return null;
      }
    },

    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!isFetched) return;

    if (data) {
      if (JSON.stringify(storeUser) !== JSON.stringify(data)) {
        setAuth(data as Parameters<typeof setAuth>[0]);
      }
    } else if (storeUser !== null && Cookies.get("logged_in") !== "true") {
      setAuth(null);
    }
  }, [data, isFetched, storeUser, setAuth]);

  return {
    user: storeUser,
    loading: isLoading || !isFetched,
    isAuthenticated: isFetched ? !!data : false,
    error,
    refetch,
  };
}
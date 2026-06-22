
"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/shared/api/auth.api";
import { useAuthStore } from "../store/auth.store";
import { refreshOnce } from "@/shared/api/client";
import { authLogger } from "@/shared/utils/authLogger";

//   Helper to check hint cookie.
// The backend (set_auth_cookies) and the login flow (setLoggedInCookie) both
// set a JS-readable `logged_in=true` cookie. `rt_exists` is never set anywhere,
// so checking it always failed → on a cold reload we short-circuited to null and
// wiped the persisted user, disabling every `enabled: !!user` query (e.g. the
// home discover feed) until a fresh login.
function hasRefreshTokenHint(): boolean {
  return document.cookie.includes("logged_in=true");
}

export function useCurrentUser() {
  const { user: storeUser, setAuth } = useAuthStore();

  const { data, isLoading, isFetched, error, refetch } = useQuery({
    queryKey: ["authUser"],

    queryFn: async () => {
      try {
        const hinted = hasRefreshTokenHint();
        authLogger.log("bootstrap", {
          loggedInHint: hinted,
          cookies: authLogger.cookieState(),
        });

        //   Skip refresh entirely if no hint cookie
        if (!hinted) {
          return null;
        }

        const token = await refreshOnce();

        if (!token) {
          setAuth(null);
          return null;
        }

        const res = await getMe();
        return (res as Record<string, unknown>)?.data
          ?? (res as Record<string, unknown>)?.user
          ?? res
          ?? null;

      } catch {
        setAuth(null);
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
    if (!isFetched) return;

    if (data) {
      if (JSON.stringify(storeUser) !== JSON.stringify(data)) {
        setAuth(data as Parameters<typeof setAuth>[0]);
      }
    } else if (storeUser !== null) {
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
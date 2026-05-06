// src/features/auth/hooks/useCurrentUser.ts
"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/shared/api/auth.api";
import { useAuthStore } from "../store/auth.store";

export interface User {
  id: string | number;
  email: string;
  name?: string;
  full_name?: string;
  image?: string;
  profile_image?: string;
  location?: string;
  age?: number;
  bio?: string;
  about?: string;
  interests?: string[];
  matches?: number;
  likes_received?: number;
  photos_count?: number;
  photos?: string[];
  settings?: any;
}

export function useCurrentUser() {
  const { user: storeUser, setAuth } = useAuthStore();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      try {
        const res = await getMe();
        return res;
      } catch (err: any) {
        if (err.response?.status === 401) {
          return null; // Graceful 401 handling
        }
        throw err;
      }
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false, // 🔒 Stops the query from refetching on remount
    refetchOnReconnect: false,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    retry: false, // Prevents endless API retries
  });

  useEffect(() => {
    const currentUser = data?.user || data;

    if (currentUser) {
      // 🔒 Only update Zustand store if the user object has changed
      if (JSON.stringify(storeUser) !== JSON.stringify(currentUser)) {
        setAuth(currentUser);
      }
    } else if (!isLoading) {
      // 🔒 Only update Zustand to null if it's not already null
      if (storeUser !== null) {
        setAuth(null);
      }
    }
  }, [data, isLoading, storeUser, setAuth]);

  return {
    user: (data?.user || data) as User | null,
    loading: isLoading,
    isAuthenticated: !!(data?.user || data),
    error,
    refetch,
  };
}
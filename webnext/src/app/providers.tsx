"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useAuth } from "@/features/auth";
import { NotificationProvider } from "@/features/notification/context/NotificationContext";

// ─────────────────────────────────────────────────────────
// Public routes — no auth check, no loading spinner
// ─────────────────────────────────────────────────────────

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

// ─────────────────────────────────────────────────────────
// Inner — separated so it can call useAuth inside
// QueryClientProvider (hooks need the client above them)
// ─────────────────────────────────────────────────────────

function InnerProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading } = useAuth(); // ← "loading" not "isLoading" — matches useCurrentUser

  if (!isPublicRoute(pathname) && loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#7A2432]" />
        <span className="ml-3 font-medium text-[#746767]">Loading...</span>
      </div>
    );
  }

  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  );
}

// ─────────────────────────────────────────────────────────
// Root providers
// ─────────────────────────────────────────────────────────

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/*
        No AuthProvider here — auth state lives in Zustand (useAuthStore).
        useCurrentUser syncs React Query → Zustand on mount.
        No wrapper needed.
      */}
      <InnerProviders>
        {children}
      </InnerProviders>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

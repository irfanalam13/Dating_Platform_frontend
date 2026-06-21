"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/features/auth";

// Dev-only. The import() lives in a branch that is statically dead in
// production (NODE_ENV is inlined as a constant), so the bundler tree-shakes
// @tanstack/react-query-devtools out of the prod bundle entirely. In prod this
// resolves to a no-op component.
const ReactQueryDevtools =
  process.env.NODE_ENV === "development"
    ? dynamic(
        () =>
          import("@tanstack/react-query-devtools").then(
            (m) => m.ReactQueryDevtools
          ),
        { ssr: false }
      )
    : () => null;
import { NotificationProvider } from "@/features/notification/context/NotificationContext";
import AppToaster from "@/shared/ui/toaster";

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
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-[#F87171]" />
        <span className="ml-3 font-medium text-[#746767]">Loading...</span>
      </div>
    );
  }

  return (
    <NotificationProvider>
      <AppToaster />
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

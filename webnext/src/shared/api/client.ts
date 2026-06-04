"use client";

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
import { showError } from "@/shared/utils/toast";
import { logger } from "@/shared/utils/logger";

// Allow callers to opt out of the interceptor's automatic error toast.
declare module "axios" {
  interface AxiosRequestConfig {
    skipErrorToast?: boolean;
  }
}

// ─────────────────────────────────────────────────────────
// Axios instance
// ─────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  // When true, the response interceptor will NOT auto-show an error toast for
  // this request — the caller (e.g. a mutation's onError) owns the messaging,
  // so we avoid a second, generic toast overshadowing the detailed one.
  skipErrorToast?: boolean;
}

interface QueueEntry {
  resolve: (value: unknown) => void;
  reject:  (reason: unknown) => void;
}

// ─────────────────────────────────────────────────────────
// Refresh queue
// ─────────────────────────────────────────────────────────

let isRefreshing = false;
let failedQueue: QueueEntry[] = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach((entry) => {
    if (error) entry.reject(error);
    else       entry.resolve(token);
  });
  failedQueue = [];
}

// ─────────────────────────────────────────────────────────
// Token storage
// Three layers: memory → sessionStorage → cookie
// Memory:          fastest, lost on refresh
// sessionStorage:  survives refresh, cleared on tab close
// Cookie:          tertiary backup, readable by JS
//
// ⚠️  NOT localStorage — tokens should not persist
//     across browser sessions for security
// ─────────────────────────────────────────────────────────

const TOKEN_KEY = "chat_access_token";
let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;  // SSR guard

  if (token) {
    // 1. Memory
    _accessToken = token;

    // 2. sessionStorage
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {}

    // 3. Cookie (1 day — short lived)
    Cookies.set("access_token", token, {
      expires: 1,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    // Clear all three layers
    _accessToken = null;

    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {}

    Cookies.remove("access_token");
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;  // SSR guard

  // 1. Memory — fastest path
  if (_accessToken) return _accessToken;

  // 2. sessionStorage — survives page refresh
  try {
    const fromSession = sessionStorage.getItem(TOKEN_KEY);
    if (fromSession) {
      _accessToken = fromSession;   // restore to memory
      return fromSession;
    }
  } catch {}

  // 3. Cookie — last resort
  const fromCookie = Cookies.get("access_token");
  if (fromCookie) {
    _accessToken = fromCookie;      // restore to memory
    return fromCookie;
  }

  return null;
}

// shared/api/client.ts — add this

let refreshPromise: Promise<string | null> | null = null

export const refreshOnce = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise

  refreshPromise = api.post('/auth/refresh/')
    .then(res => {
      const token = res?.data?.data?.access ?? null
      if (token) setAccessToken(token)
      return token
    })
    .catch(() => {
      return null
    })
    .finally(() => {
      refreshPromise = null    // ✅ reset immediately, not after 5s
    })

  return refreshPromise
}

// ─────────────────────────────────────────────────────────
// Force logout — clears everything and redirects
// ─────────────────────────────────────────────────────────

async function forceLogout(): Promise<never> {
  // Clear token from all layers
  setAccessToken(null);

  // Clear all app state
  try {
    sessionStorage.clear();
    // ⚠️ Do NOT localStorage.clear() — other app data may live there
  } catch {}

  Cookies.remove("logged_in");

  // Tell server to clear httpOnly refresh cookie
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}/auth/logout/`,
      { method: "POST", credentials: "include" }
    );
  } catch {}

  window.location.replace("/login");
  return new Promise(() => {});   // never resolves — redirect takes over
}

// ─────────────────────────────────────────────────────────
// Auth routes — never trigger refresh loop
// ─────────────────────────────────────────────────────────

const AUTH_ROUTES = [
  "/auth/login/",
  "/auth/register",
  "/auth/google/",
  "/auth/refresh/",
  "/auth/logout/",
  "/auth/me/",
];

function isAuthRoute(url: string): boolean {
  return AUTH_ROUTES.some((route) => url.includes(route));
}

// ─────────────────────────────────────────────────────────
// Request interceptor — attach CSRF token
// ─────────────────────────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/csrftoken=([^;]+)/);
      if (match) {
        config.headers["X-CSRFToken"] = match[1];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────────────────
// Response interceptor — handle 401 with token refresh
// ─────────────────────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig | undefined;

    if (error.code === "ERR_CANCELED") {
      return Promise.reject(error);
    }

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const { status } = error.response;
    const url = originalRequest.url ?? "";

    // ── 401 — try refresh ───────────────────────────────
    if (status === 401 && !originalRequest._retry && !isAuthRoute(url)) {

      // Another refresh already in flight — queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Route through refreshOnce() so a refresh triggered here shares the
        // SAME in-flight promise as one triggered by useCurrentUser. The refresh
        // token rotates and blacklists the old one on every call, so two
        // concurrent refreshes would make the second use a blacklisted token →
        // 401 → false forced logout. Deduping prevents that.
        const newToken = await refreshOnce();

        if (!newToken) {
          throw new Error("Token refresh returned no access token");
        }

        processQueue(null);
        isRefreshing = false;
        return api(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;

        logger.error("Refresh failed — forcing logout", refreshError);
        showError(refreshError, "Your session expired. Please log in again.");
        return forceLogout();
      }
    }

    const responseData = error.response?.data as
      | { detail?: string; message?: string; error?: string }
      | undefined;

    // Skip the global toast when the caller opts to handle errors itself,
    // so a single detailed toast shows instead of two competing ones.
    if (!originalRequest.skipErrorToast) {
      showError(
        responseData ?? error,
        responseData?.detail ||
          responseData?.message ||
          responseData?.error ||
          "Request failed. Please try again.",
      );
    }

    return Promise.reject(error);
  }
);

export default api;

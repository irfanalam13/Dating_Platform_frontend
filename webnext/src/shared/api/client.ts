"use client";

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
import { showError } from "@/shared/utils/toast";
import { logger } from "@/shared/utils/logger";
import { authLogger } from "@/shared/utils/authLogger";
import { extractRefreshToken } from "./parse";

// Allow callers to opt out of the interceptor's automatic error toast.
declare module "axios" {
  interface AxiosRequestConfig {
    skipErrorToast?: boolean;
  }
}

// ─────────────────────────────────────────────────────────
// Axios instance
// ─────────────────────────────────────────────────────────

// Final base URL Axios will use. Unchanged behaviour — just hoisted into a
// const so the debug block below can print the exact resolved value.
const resolvedBaseURL: string =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ─────────────────────────────────────────────────────────
// ⚠️ TEMPORARY DEBUG — remove after verifying the production API URL.
// NEXT_PUBLIC_* values are inlined into the client bundle and are NOT secrets,
// so printing this one is safe. Only the API URL is logged — no other env vars.
// Gated so it never runs for normal production users: it prints automatically
// in dev, or in prod ONLY when you set NEXT_PUBLIC_DEBUG_API=true in Vercel.
// Runs at module load (once per client load + once per server render), so it
// surfaces in BOTH the browser console and the Vercel server/function logs.
// ─────────────────────────────────────────────────────────
const DEBUG_API: boolean =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_DEBUG_API === "true";

if (DEBUG_API) {
  console.log("[api-debug] NEXT_PUBLIC_API_URL:", process.env.NEXT_PUBLIC_API_URL);
  console.log("[api-debug] resolved axios baseURL:", resolvedBaseURL);
  console.log(
    "[api-debug] mode:",
    resolvedBaseURL.startsWith("/")
      ? "RELATIVE → Vercel same-origin proxy "
      : "ABSOLUTE → calling backend directly (third-party cookies; Safari/ITP will fail)"
  );
}

const api = axios.create({
  baseURL: resolvedBaseURL,
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
  // Correlation id (also sent as the X-Auth-Trace header) so a 401 logged on the
  // frontend matches the backend's auth-decision log line.
  _authTrace?: string;
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

    authLogger.log("token:set", { which: "access", fp: authLogger.fingerprint(token) });
  } else {
    // Clear all three layers
    _accessToken = null;

    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {}

    Cookies.remove("access_token");

    authLogger.log("token:clear", { which: "access" });
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

// ─────────────────────────────────────────────────────────
// Refresh token storage (JS fallback for cross-host prod)
// The HttpOnly `refresh` cookie stays primary. But on a Vercel+Render split the
// cookie isn't sent cross-site, so we also keep the refresh token in
// sessionStorage and POST it in the refresh body. sessionStorage (not cookie/
// localStorage) limits exposure: it clears on tab close and isn't sent anywhere
// automatically. Cleared on logout.
// ─────────────────────────────────────────────────────────

const REFRESH_KEY = "chat_refresh_token";
let _refreshToken: string | null = null;

export function setRefreshToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    _refreshToken = token;
    try { sessionStorage.setItem(REFRESH_KEY, token); } catch {}
    authLogger.log("token:set", { which: "refresh", fp: authLogger.fingerprint(token) });
  } else {
    _refreshToken = null;
    try { sessionStorage.removeItem(REFRESH_KEY); } catch {}
    authLogger.log("token:clear", { which: "refresh" });
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  if (_refreshToken) return _refreshToken;
  try {
    const fromSession = sessionStorage.getItem(REFRESH_KEY);
    if (fromSession) { _refreshToken = fromSession; return fromSession; }
  } catch {}
  return null;
}

let refreshPromise: Promise<string | null> | null = null

export const refreshOnce = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise

  // Send the stored refresh token in the body as a fallback for when the
  // HttpOnly cookie can't be delivered (cross-host). The backend prefers the
  // cookie and only uses the body when the cookie is absent.
  const stored = getRefreshToken()
  const body = stored ? { refresh: stored } : {}

  authLogger.log("refresh:start", {
    sentBodyToken: Boolean(stored),
    refreshFp: authLogger.fingerprint(stored),
    cookies: authLogger.cookieState(),
  })

  refreshPromise = api.post('/auth/refresh/', body)
    .then(res => {
      const token = res?.data?.data?.access ?? null
      if (token) setAccessToken(token)
      // Persist the rotated refresh token (returned in the body) so the next
      // body-based refresh uses the current token, not a blacklisted one.
      const rotated = extractRefreshToken(res)
      if (rotated) setRefreshToken(rotated)
      authLogger.log("refresh:success", {
        gotAccess: Boolean(token),
        rotatedRefresh: Boolean(rotated),
      })
      return token
    })
    .catch((err: AxiosError) => {
      const data = err.response?.data as { code?: string; detail?: string } | undefined
      authLogger.log("refresh:fail", {
        status: err.response?.status,
        // The backend's reason: NO_REFRESH_TOKEN / INVALID_TOKEN / etc.
        reason: data?.code ?? data?.detail ?? err.message,
      })
      return null
    })
    .finally(() => {
      refreshPromise = null    //   reset immediately, not after 5s
    })

  return refreshPromise
}

// ─────────────────────────────────────────────────────────
// Force logout — clears everything and redirects
// ─────────────────────────────────────────────────────────

async function forceLogout(): Promise<never> {
  // Clear token from all layers
  setAccessToken(null);
  setRefreshToken(null);

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
    const url = config.url ?? "";

    // Attach the access token as a Bearer header so authenticated requests work
    // even when the HttpOnly `access` cookie can't be delivered (cross-host prod:
    // Vercel frontend + Render backend, where SameSite=Lax cookies aren't sent
    // cross-site). The backend's CookieJWTAuthentication accepts either. We skip
    // this on /auth/refresh/ since that path carries the refresh token itself.
    const token = getAccessToken();
    const isRefresh = url.includes("/auth/refresh/");
    if (token && !isRefresh) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (typeof document !== "undefined") {
      const match = document.cookie.match(/csrftoken=([^;]+)/);
      if (match) {
        config.headers["X-CSRFToken"] = match[1];
      }
    }

    // Correlation trace: the backend logs its auth decision against this id, so a
    // 401 here can be matched to the exact backend reason. Stored on the config
    // so the response interceptor can reference the same id.
    const trace = authLogger.newTraceId();
    config.headers["X-Auth-Trace"] = trace;
    (config as CustomAxiosRequestConfig)._authTrace = trace;

    authLogger.log(
      "request",
      {
        method: (config.method ?? "get").toUpperCase(),
        url,
        authHeader: Boolean(token) && !isRefresh,
        accessFp: authLogger.fingerprint(token),
        hasRefreshToken: Boolean(getRefreshToken()),
        cookies: authLogger.cookieState(),
        withCredentials: config.withCredentials,
      },
      trace,
    );

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

    // Log EVERY 401 against the request's trace id so it lines up with the
    // backend's auth-decision log line (which logs the same X-Auth-Trace).
    if (status === 401) {
      const data = error.response.data as { code?: string; detail?: string } | undefined;
      authLogger.log(
        "401",
        {
          url,
          // Backend reason: NO_REFRESH_TOKEN / INVALID_TOKEN / "Token expired or invalid" …
          reason: data?.code ?? data?.detail,
          willTryRefresh: !originalRequest._retry && !isAuthRoute(url),
          hadAccessToken: Boolean(getAccessToken()),
          cookies: authLogger.cookieState(),
        },
        originalRequest._authTrace,
      );
    }

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

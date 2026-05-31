"use client";

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";

// ─────────────────────────────────────────────────────────
// Axios instance
// ─────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  withCredentials: true,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
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

    console.log("✅ Token stored — layers: memory + sessionStorage + cookie");
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

/** Parse JWT access token from any backend envelope (login, refresh, verify). */
export function parseAccessToken(payload: unknown): string | null {
  const p = payload as Record<string, unknown> | null;
  if (!p) return null;

  const data = p.data as Record<string, unknown> | undefined;
  const nested = data?.data as Record<string, unknown> | undefined;
  const tokens =
    (nested?.tokens ?? data?.tokens ?? p.tokens) as Record<string, unknown> | undefined;

  const candidates = [
    nested?.access,
    tokens?.access,
    data?.access,
    p.access,
    (p as { access_token?: string }).access_token,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return null;
}

let refreshPromise: Promise<string | null> | null = null;

/**
 * Localhost + remote API: refresh cookies often fail cross-origin.
 * Prefer the JWT already stored from login (sessionStorage).
 */
export const refreshOnce = async (): Promise<string | null> => {
  const existing = getAccessToken();
  if (existing) return existing;

  if (refreshPromise) return refreshPromise;

  refreshPromise = api
    .post("/auth/refresh/")
    .then((res) => {
      const token = parseAccessToken(res.data);
      if (token) setAccessToken(token);
      return token ?? getAccessToken();
    })
    .catch(() => getAccessToken())
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

/** Restore token from sessionStorage into memory on app load. */
export function hydrateAccessToken(): string | null {
  return getAccessToken();
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
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

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
        // Django uses httpOnly refresh cookie — no body needed
        const refreshRes = await api.post("/auth/refresh/");

        // ✅ If backend returns new access token, store it
        // const newToken =
        //   refreshRes?.data?.data?.tokens?.access ||
        //   refreshRes?.data?.tokens?.access       ||
        //   refreshRes?.data?.access               ||
        //   refreshRes?.data?.access_token         ||
        //   null;
        // interceptor in client.ts — fix this
        const newToken = parseAccessToken(refreshRes.data);

        if (newToken) {
          setAccessToken(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        } else if (getAccessToken()) {
          originalRequest.headers.Authorization = `Bearer ${getAccessToken()}`;
        }

        processQueue(null);
        isRefreshing = false;
        return api(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;

        // Keep session if we still have a stored access token (common on localhost + remote API)
        if (getAccessToken()) {
          return Promise.reject(error);
        }

        console.error("REFRESH FAILED — forcing logout", refreshError);
        return forceLogout();
      }
    }

    return Promise.reject(error);
  }
);

export default api;
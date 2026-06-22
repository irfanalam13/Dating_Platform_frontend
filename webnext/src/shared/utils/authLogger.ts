"use client";

// ─────────────────────────────────────────────────────────
// Auth debugging logger — pinpoints WHERE and WHY 401s happen.
//
// OFF by default. Two ways to turn it on:
//   • Build time:  NEXT_PUBLIC_AUTH_DEBUG=true
//   • Runtime:     localStorage.setItem("auth_debug","1")  (no redeploy — works
//                  in production; reload after setting)
//
// SAFE in production: token VALUES are never logged. Only presence, length, and
// the last 4 chars (a "fingerprint") so you can tell two tokens apart without
// exposing them.
//
// Every request gets a short TRACE id (sent as the `X-Auth-Trace` header). The
// backend logs its auth decision against the same id, so a frontend "401" lines
// up with the exact backend reason (NO_REFRESH_TOKEN / INVALID_TOKEN / expired /
// blacklisted / which source the token came from).
//
// Inspect/export the recent log from the console:  window.__authLog
// ─────────────────────────────────────────────────────────

export type AuthEvent =
  | "request"
  | "401"
  | "refresh:start"
  | "refresh:success"
  | "refresh:fail"
  | "login"
  | "logout"
  | "bootstrap"
  | "token:set"
  | "token:clear";

export interface AuthLogEntry {
  t: string;                 // ISO timestamp
  event: AuthEvent;
  trace?: string;            // correlates with the backend log line
  payload: Record<string, unknown>;
}

function isEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_AUTH_DEBUG === "true") return true;
  try {
    return typeof window !== "undefined" && localStorage.getItem("auth_debug") === "1";
  } catch {
    return false;
  }
}

/** Redact a token to presence + length + last 4 chars. Never returns the value. */
export function fingerprint(token?: string | null): string {
  if (!token) return "∅";
  return `len${token.length}…${token.slice(-4)}`;
}

/** Presence of the JS-readable cookies (HttpOnly access/refresh are invisible to JS — that's expected). */
export function cookieState(): Record<string, boolean> {
  if (typeof document === "undefined") return {};
  const jar = document.cookie;
  return {
    logged_in: /(?:^|;\s*)logged_in=/.test(jar),
    access_token: /(?:^|;\s*)access_token=/.test(jar),   // the JS mirror (not the HttpOnly `access`)
    csrftoken: /(?:^|;\s*)csrftoken=/.test(jar),
  };
}

// Short, monotonic-ish trace id. (App code — Date.now/Math.random are fine here.)
let _seq = 0;
export function newTraceId(): string {
  _seq = (_seq + 1) % 1_000_000;
  return `${Date.now().toString(36)}-${_seq.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// In-memory ring buffer so you can export the last N events even when console
// output is off. Exposed as window.__authLog.
const RING_MAX = 300;
const ring: AuthLogEntry[] = [];

function record(entry: AuthLogEntry): void {
  ring.push(entry);
  if (ring.length > RING_MAX) ring.shift();
  if (typeof window !== "undefined") {
    (window as unknown as { __authLog?: AuthLogEntry[] }).__authLog = ring;
  }
}

export const authLogger = {
  isEnabled,
  newTraceId,
  fingerprint,
  cookieState,

  log(event: AuthEvent, payload: Record<string, unknown> = {}, trace?: string): void {
    const entry: AuthLogEntry = { t: new Date().toISOString(), event, trace, payload };
    record(entry);

    if (!isEnabled()) return;

    const isError = event === "401" || event === "refresh:fail";
    const fn = isError ? console.error : console.log;
    fn(
      `%c[auth]%c ${event}${trace ? ` #${trace}` : ""}`,
      "color:#B78A3B;font-weight:bold",
      "color:inherit",
      payload,
    );
  },

  /** Snapshot of the last `n` events — handy to copy out of the console. */
  dump(n = RING_MAX): AuthLogEntry[] {
    return ring.slice(-n);
  },

  clear(): void {
    ring.length = 0;
  },
};

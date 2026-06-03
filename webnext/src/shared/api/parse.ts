// Centralized helpers for reading the backend's (historically inconsistent)
// response envelopes. Keeping the defensive lookups in one place means the
// auth hooks/API modules don't each re-implement the same fallback chains.

/** Safe deep-get: returns undefined if any key along the path is missing. */
export function get(obj: unknown, ...keys: string[]): unknown {
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Pull an access token out of any of the shapes the API may return. */
export function extractToken(res: unknown): string | null {
  const candidates = [
    get(res, "data", "data", "tokens", "access"),
    get(res, "data", "tokens", "access"),
    get(res, "data", "data", "access"),
    get(res, "data", "access"),
    get(res, "access"),
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }
  return null;
}

/** Pull the user object out of any of the shapes the API may return. */
export function extractUser(res: unknown): Record<string, unknown> | null {
  const candidates = [
    get(res, "data", "data", "user"),
    get(res, "data", "user"),
    get(res, "data"),
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as Record<string, unknown>;
    }
  }
  return null;
}

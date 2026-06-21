// Resolves image/media values coming back from the API into URLs the browser
// can actually load.
//
// The browser talks to the backend through a RELATIVE same-origin proxy
// (NEXT_PUBLIC_API_URL=/api/v1), so it never learns the backend's real origin
// from the API base. Some serializers (notably chat conversation participants)
// return profile pictures as a RELATIVE path like "/media/profiles/x.jpg".
// Loaded as-is that resolves against the *frontend* origin → 404 → the avatar
// silently falls back to initials. We prefix those relative paths with the
// backend origin (derived from the public WS URL, which the browser does have).

// wss://host → https://host , ws://host → http://host. No path/query on WS_URL.
const BACKEND_ORIGIN = (process.env.NEXT_PUBLIC_WS_URL || "")
  .replace(/^wss:\/\//, "https://")
  .replace(/^ws:\/\//, "http://")
  .replace(/\/+$/, "");

/**
 * Turn a raw image value from the API into a loadable URL.
 * - Empty / "/default.png" → returned unchanged (callers/ProfileImage handle the
 *   initials fallback themselves).
 * - Absolute (http/https/data/blob) → returned unchanged.
 * - Relative path (e.g. "/media/...") → prefixed with the backend origin.
 */
export function resolveImageUrl(src?: string | null): string | null {
  if (!src) return src ?? null;
  const trimmed = src.trim();
  if (trimmed === "" || trimmed === "/default.png") return trimmed;
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  if (!BACKEND_ORIGIN) return trimmed; // nothing to prefix with — leave as-is
  return `${BACKEND_ORIGIN}/${trimmed.replace(/^\/+/, "")}`;
}

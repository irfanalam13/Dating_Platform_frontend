/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

// Server-side only (NOT exposed to the browser): where the rewrite proxy below
// forwards /api/v1/* requests. The browser uses a RELATIVE API base URL
// (NEXT_PUBLIC_API_URL=/api/v1) and Next.js proxies the call to this origin
// server-side. That makes the auth cookies the backend sets first-party to THIS
// origin — the only way Safari/iOS/macOS (which block third-party cookies via
// ITP) will store and resend the `refresh` cookie. Talking to the backend origin
// directly makes those cookies third-party → Safari drops the refresh cookie →
// /auth/refresh/ sees no token → forced logout ("invalid refresh token").
const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET ||
  process.env.BACKEND_ORIGIN ||
  "http://localhost:8000";

// Bare origin (scheme + host[:port]) for the API, used in connect-src.
let apiOrigin = "";
try {
  apiOrigin = new URL(API_URL).origin;
} catch {
  apiOrigin = "";
}

const connectSrc = [
  "'self'",
  apiOrigin,
  WS_URL,
  "https://dating-platform-backend.onrender.com",
  "wss://dating-platform-backend.onrender.com",
  "http://localhost:8000",
  "ws://localhost:8000",
]
  .filter(Boolean)
  .join(" ");

// Next's App Router injects inline bootstrap scripts (no nonce by default), so
// 'unsafe-inline' is required for the app to run; dev/HMR additionally needs
// 'unsafe-eval'. Everything else is locked to same-origin + known CDNs.
const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline'";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://dating-platform-backend.onrender.com http://localhost:8000",
  "font-src 'self' data:",
  `connect-src ${connectSrc}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  // Auto-memoization (the babel-plugin-react-compiler dep is already installed
  // but was never activated). Removes manual useMemo/useCallback overhead and
  // trims unnecessary re-renders on the client.
  reactCompiler: true,

  // Drop the `X-Powered-By: Next.js` response header — one fewer byte-of-no-value
  // header on every response, and a small infoleak removed.
  poweredByHeader: false,

  // Keep trailing slashes intact when proxying to the backend. Without this Next
  // normalizes `/api/v1/auth/refresh/` → `/api/v1/auth/refresh` before the rewrite
  // forwards it, and Django's APPEND_SLASH then tries to 301-redirect the POST
  // (which it can't do without losing the body) → 500. Django's API routes all
  // require the trailing slash, so we must preserve it.
  skipTrailingSlashRedirect: true,

  // Brotli/gzip on the Node response is handled by the platform/CDN; keep Next's
  // own gzip on as a backstop for self-hosted deploys.
  compress: true,

  // Source maps bloat the production build output and are not needed for the
  // browser bundle; keeping them off speeds builds and avoids shipping them.
  productionBrowserSourceMaps: false,

  experimental: {
    // Inline Tailwind's CSS into the document <head> as a <style> tag instead of
    // a render-blocking <link>. Eliminates the CSS request waterfall on first
    // load — a direct FCP/LCP win for first-time visitors with atomic CSS.
    inlineCss: true,

    // framer-motion is a large barrel; only pull the modules actually imported.
    // (lucide-react is already optimized by Next's defaults.)
    optimizePackageImports: ["framer-motion"],
  },

  images: {
    remotePatterns: [
      //   Unsplash
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },

      //   Cloudinary (IMPORTANT)
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },

      //   Local Development
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },

      //   Production Backend (Render)
      {
        protocol: "https",
        hostname: "dating-platform-backend.onrender.com",
        pathname: "/media/**",
      },
    ],

    // ⚡ Recommended for Cloudinary (no distortion)
    unoptimized: false,

    // ⚡ Keep SVG safe if needed
    dangerouslyAllowSVG: true,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Same-origin API proxy. The browser calls /api/v1/* on THIS origin and Next
  // forwards it (cookies + Set-Cookie passed through transparently) to the real
  // backend. Keeping the round-trip same-origin is what makes the httpOnly auth
  // cookies first-party so Safari/iOS keep the refresh cookie. The /api/v1 path
  // is excluded from `proxy.ts` middleware, so these never get redirected to
  // /login. WebSockets still connect directly via NEXT_PUBLIC_WS_URL (they auth
  // by access-token query param, not cookies, so they're unaffected).
  async rewrites() {
    return [
      {
        // Trailing slash is re-added here: Next's `:path*` capture drops it, but
        // every Django/DRF route ends in `/` (APPEND_SLASH). Without it Django
        // would try to 301-redirect the request to the slash URL — which fails on
        // POST (can't redirect and keep the body) → 500. Forwarding with the slash
        // also avoids the 301 round-trip on GETs.
        source: "/api/v1/:path*/",
        destination: `${API_PROXY_TARGET}/api/v1/:path*/`,
      },
      {
        source: "/api/v1/:path*",
        destination: `${API_PROXY_TARGET}/api/v1/:path*/`,
      },
    ];
  },
};

export default nextConfig;

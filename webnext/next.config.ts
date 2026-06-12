/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

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
};

export default nextConfig;

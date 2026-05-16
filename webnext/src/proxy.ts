import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────
// Route groups
// ─────────────────────────────────────────────────────────

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

const ALWAYS_ALLOWED = [
  "/_next/static",
  "/_next/image",
  "/_next/data",
  "/favicon.ico",
  "/api",            // Next.js API routes handle their own auth
];

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

function isAlwaysAllowed(pathname: string): boolean {
  return ALWAYS_ALLOWED.some((path) => pathname.startsWith(path));
}

// ─────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Never touch static assets, API routes, Next internals
  if (isAlwaysAllowed(pathname)) {
    return NextResponse.next();
  }

  // 2. Read auth signal from cookie
  //    "logged_in" is a plain cookie your frontend sets on login
  //    It is NOT the httpOnly refresh token — middleware can't read httpOnly
  const loggedIn = request.cookies.get("logged_in")?.value === "true";

  // 3. Logged-in user hitting a public route → send to app
  if (isPublicRoute(pathname) && loggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 4. Logged-out user hitting a protected route → send to login
  if (!isPublicRoute(pathname) && !loggedIn) {
    const loginUrl = new URL("/login", request.url);

    // Preserve the intended destination so we can redirect back after login
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  // 5. Everything else — allow through
  return NextResponse.next();
}

// ─────────────────────────────────────────────────────────
// Matcher — run middleware on every route except
// static files, images, and api routes
// ─────────────────────────────────────────────────────────

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.gif$|.*\\.ico$|api).*)",
  ],
};
// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";

// export function middleware(request: NextRequest) {
//   // 🚫 DO NOT check auth here
//   // Middleware cannot handle refresh logic

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/((?!_next|favicon.ico|api).*)"],
// };


// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// export function middleware(request: NextRequest) {
//   const token = request.cookies.get('access')?.value;
//   const { pathname } = request.nextUrl;

//   // 1. Define public paths that shouldn't be protected
//   const isPublicPath = pathname === '/login' || pathname === '/register';

//   // 2. If accessing a public path and already logged in, redirect away (e.g., to your inbox)
//   if (isPublicPath && token) {
//     return NextResponse.redirect(new URL('/message', request.url));
//   }

//   // 3. If accessing a protected route and not logged in, redirect to login
//   if (!isPublicPath && !token) {
//     return NextResponse.redirect(new URL('/login', request.url));
//   }

//   // 4. Otherwise, continue with the request
//   return NextResponse.next();
// }

// export const config = {
//   matcher: [
//     /*
//      * Match all request paths except for internal Next.js files and assets:
//      * - api (API routes)
//      * - _next/static (static files)
//      * - _next/image (image optimization files)
//      * - favicon.ico (favicon file)
//      */
//     '/((?!api|_next/static|_next/image|favicon.ico).*)',
//   ],
// };


// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";

// export function middleware(request: NextRequest) {
//   const token = request.cookies.get("access");

//   const isAuthPage = request.nextUrl.pathname === "/login";

//   // 🔐 Not logged in → block protected routes
//   if (!token && !isAuthPage) {
//     return NextResponse.redirect(new URL("/login", request.url));
//   }

//   // 🔁 Logged in → prevent going back to login
//   if (token && isAuthPage) {
//     return NextResponse.redirect(new URL("/chat", request.url));
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/chat", "/notification", "/imageupload", "/login"],
// };



// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Your existing authentication / routing logic
  const currentUser = request.cookies.get('access')?.value;

  if (request.nextUrl.pathname.startsWith('/login') && currentUser) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  return NextResponse.next();
}
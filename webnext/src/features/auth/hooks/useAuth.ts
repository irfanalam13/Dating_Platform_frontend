// "use client";

// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { useRouter } from "next/navigation";
// import { registerUser, loginUser } from "@/shared/api/auth.api";
// import { useAuthStore } from "../store/auth.store";
// import { showSuccess, showError } from "@/shared/utils/toast";
// import Cookies from "js-cookie";
// import { setAccessToken } from "@/shared/api/client";

// function getApiErrorMessage(err: unknown, fallback: string): string {
//   const responseData = (err as { response?: { data?: unknown } })?.response?.data;
//   if (responseData && typeof responseData === "object") {
//     const data = responseData as Record<string, unknown>;
//     const fieldErrors = (data.data ?? data.errors) as Record<string, unknown> | undefined;
//     if (fieldErrors && typeof fieldErrors === "object") {
//       const firstError = Object.values(fieldErrors).flat().find((msg) => typeof msg === "string");
//       if (firstError) return firstError as string;
//     }
//     if (typeof data.detail === "string") return data.detail;
//     if (typeof data.message === "string") return data.message;
//   }
//   return fallback;
// }

// function setLoggedInCookie() {
//   Cookies.set("logged_in", "true", {
//     expires: 7,
//     sameSite: "lax",
//     secure: process.env.NODE_ENV === "production",
//   });
// }

// function clearLoggedInCookie() {
//   Cookies.remove("logged_in");
// }

// export const useRegister = () => {
//   const setAuth = useAuthStore((s) => s.setAuth);
//   const queryClient = useQueryClient();
//   const router = useRouter();

//   return useMutation({
//     mutationFn: registerUser,
//     onSuccess: (res: unknown) => {
//       const response = res as { data?: { data?: { user?: unknown; tokens?: { access?: string } }; user?: unknown } };
      
//       const token = response?.data?.data?.tokens?.access;
//       if (token) setAccessToken(token);

//       const user = response?.data?.data?.user ?? response?.data?.user ?? response?.data;
//       if (user && typeof user === "object") {
//         setAuth(user as Parameters<typeof setAuth>[0]);
//         queryClient.setQueryData(["authUser"], user);
//       }

//       setLoggedInCookie();
//       showSuccess("Account created! Let's set up your profile.");
//       router.push("/onboarding");
//     },
//     onError: (err: unknown) => {
//       console.error("REGISTER ERROR", err);
//       showError(getApiErrorMessage(err, "Registration failed. Please try again."));
//     },
//   });
// };

// export const useLogin = () => {
//   const setAuth = useAuthStore((s) => s.setAuth);
//   const queryClient = useQueryClient();
//   const router = useRouter();

//   return useMutation({
//     mutationFn: loginUser,
//     onSuccess: (res: unknown) => {
//       const response = res as { data?: { data?: { user?: unknown; tokens?: { access?: string } }; user?: unknown } };

//       const token = response?.data?.data?.tokens?.access;
//       if (token) setAccessToken(token);

//       const user = response?.data?.data?.user ?? response?.data?.user ?? response?.data;
//       if (!user || typeof user !== "object") {
//         console.error("USER DATA MISSING IN RESPONSE", res);
//         showError("Invalid login response from server");
//         return;
//       }

//       setAuth(user as Parameters<typeof setAuth>[0]);
//       queryClient.setQueryData(["authUser"], user);
//       setLoggedInCookie();
//       showSuccess("Welcome back!");
//       router.push("/dashboard");
//     },
//     onError: (err: unknown) => {
//       console.error("LOGIN ERROR", err);
//       showError(getApiErrorMessage(err, "Login failed"));
//     },
//   });
// };

// export const useLogout = () => {
//   const setAuth = useAuthStore((s) => s.setAuth);
//   const queryClient = useQueryClient();
//   const router = useRouter();

//   const performLogout = async () => {
//     const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
//     await fetch(`${baseUrl}/auth/logout/`, { method: "POST", credentials: "include" });
//   };

//   const cleanup = () => {
//     setAccessToken(null);
//     setAuth(null);
//     queryClient.clear();
//     clearLoggedInCookie();
//   };

//   return useMutation({
//     mutationFn: performLogout,
//     onSuccess: () => {
//       cleanup();
//       showSuccess("Logged out successfully");
//       router.push("/login");
//     },
//     onError: () => {
//       cleanup();
//       router.push("/login");
//     },
//   });
// };


















"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { registerUser, loginUser } from "@/shared/api/auth.api";
import { useAuthStore } from "../store/auth.store";
import { showSuccess, showError } from "@/shared/utils/toast";
import Cookies from "js-cookie";
import { setAccessToken } from "@/shared/api/client";  // ✅ client.ts not lib/api



// ─────────────────────────────────────────────────────────
// Safe deep-get helper — replaces broken nested casting
// ─────────────────────────────────────────────────────────

// ✅ Simple, readable, zero parse errors
function get(obj: unknown, ...keys: string[]): unknown {
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}


// ─────────────────────────────────────────────────────────
// Error helper
// ─────────────────────────────────────────────────────────

function getApiErrorMessage(err: unknown, fallback: string): string {
  const responseData = (err as { response?: { data?: unknown } })?.response?.data;

  if (responseData && typeof responseData === "object") {
    const data = responseData as Record<string, unknown>;

    const fieldErrors = (data.data ?? data.errors) as
      | Record<string, unknown>
      | undefined;

    if (fieldErrors && typeof fieldErrors === "object") {
      const firstError = Object.values(fieldErrors)
        .flat()
        .find((msg) => typeof msg === "string");
      if (firstError) return firstError as string;
    }

    if (typeof data.detail  === "string") return data.detail;
    if (typeof data.message === "string") return data.message;
  }

  return fallback;
}



// ─────────────────────────────────────────────────────────
// Token extractor — handles every backend response shape
//
// Tries in order:
//   { data: { data: { tokens: { access } } } }   ← most nested
//   { data: { tokens: { access } } }
//   { data: { access } }
//   { access }                                    ← flat
// ─────────────────────────────────────────────────────────

function extractToken(res: unknown): string | null {
  const candidates = [
    get(res, "data", "data", "tokens", "access"),
    get(res, "data", "tokens", "access"),
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

// ─────────────────────────────────────────────────────────
// User extractor — same multi-shape handling
//
// Tries in order:
//   { data: { data: { user } } }
//   { data: { user } }
//   { data }                    ← data IS the user object
// ─────────────────────────────────────────────────────────

function extractUser(res: unknown): Record<string, unknown> | null {
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

// ─────────────────────────────────────────────────────────
// Cookie helpers
// ─────────────────────────────────────────────────────────

function setLoggedInCookie(): void {
  Cookies.set("logged_in", "true", {
    expires: 7,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function clearLoggedInCookie(): void {
  Cookies.remove("logged_in");
}

// ─────────────────────────────────────────────────────────
// Register
// ─────────────────────────────────────────────────────────

export const useRegister = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: registerUser,

    onSuccess: (res: unknown) => {
      const token = extractToken(res);
      const user  = extractUser(res);

      if (token) {
        setAccessToken(token);
        console.log("✅ Register token stored");
      } else {
        console.warn("⚠️ No access token in register response", res);
      }

      if (user) {
        setAuth(user as Parameters<typeof setAuth>[0]);
        queryClient.setQueryData(["authUser"], user);
      }

      setLoggedInCookie();
      showSuccess("Account created! Let's set up your profile.");
      router.push("/onboarding");
    },

    onError: (err: unknown) => {
      console.error("REGISTER ERROR", err);
      showError(getApiErrorMessage(err, "Registration failed. Please try again."));
    },
  });
};

// ─────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────

export const useLogin = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: loginUser,

    onSuccess: (res: unknown) => {
      const token = extractToken(res);
      const user  = extractUser(res);
      // In useLogin onSuccess — add temporarily
      console.log("RAW RESPONSE:", JSON.stringify(res, null, 2))

      if (token) {
        setAccessToken(token);
        console.log("✅ Login token stored:", token.slice(0, 20) + "...");
      } else {
        console.warn("⚠️ No token in login response — WS will fail", res);
      }

      if (!user) {
        console.error("USER DATA MISSING IN RESPONSE", res);
        showError("Invalid login response from server");
        return;
      }

      setAuth(user as Parameters<typeof setAuth>[0]);
      queryClient.setQueryData(["authUser"], user);
      setLoggedInCookie();
      showSuccess("Welcome back!");
      router.push("/dashboard");
    },

    onError: (err: unknown) => {
      console.error("LOGIN ERROR", err);
      showError(getApiErrorMessage(err, "Login failed"));
    },
    
  });
};

// ─────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────

export const useLogout = () => {
  const setAuth     = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();
  const router      = useRouter();

  const performLogout = async (): Promise<void> => {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
    await fetch(`${baseUrl}/auth/logout/`, {
      method: "POST",
      credentials: "include",
    });
  };

  const cleanup = (): void => {
    setAccessToken(null);   // clears memory + sessionStorage + cookie
    setAuth(null);
    queryClient.clear();
    clearLoggedInCookie();
  };

  return useMutation({
    mutationFn: performLogout,

    onSuccess: () => {
      cleanup();
      showSuccess("Logged out successfully");
      router.push("/login");
    },

    onError: () => {
      cleanup();   // always clean up even if server call fails
      router.push("/login");
    },
  });
};
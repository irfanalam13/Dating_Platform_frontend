
// "use client";

// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { useRouter } from "next/navigation";
// import { registerUser, loginUser } from "@/shared/api/auth.api";
// import { useAuthStore } from "../store/auth.store";
// import { showSuccess, showError } from "@/shared/utils/toast";
// import Cookies from "js-cookie";
// import { setAccessToken } from "@/shared/api/client";  // ✅ client.ts not lib/api



// // ─────────────────────────────────────────────────────────
// // Safe deep-get helper — replaces broken nested casting
// // ─────────────────────────────────────────────────────────

// // ✅ Simple, readable, zero parse errors
// function get(obj: unknown, ...keys: string[]): unknown {
//   let current: unknown = obj;
//   for (const key of keys) {
//     if (current === null || current === undefined) return undefined;
//     current = (current as Record<string, unknown>)[key];
//   }
//   return current;
// }


// // ─────────────────────────────────────────────────────────
// // Error helper
// // ─────────────────────────────────────────────────────────

// function getApiErrorMessage(err: unknown, fallback: string): string {
//   const responseData = (err as { response?: { data?: unknown } })?.response?.data;

//   if (responseData && typeof responseData === "object") {
//     const data = responseData as Record<string, unknown>;

//     const fieldErrors = (data.data ?? data.errors) as
//       | Record<string, unknown>
//       | undefined;

//     if (fieldErrors && typeof fieldErrors === "object") {
//       const firstError = Object.values(fieldErrors)
//         .flat()
//         .find((msg) => typeof msg === "string");
//       if (firstError) return firstError as string;
//     }

//     if (typeof data.detail  === "string") return data.detail;
//     if (typeof data.message === "string") return data.message;
//   }

//   return fallback;
// }



// // ─────────────────────────────────────────────────────────
// // Token extractor — handles every backend response shape
// //
// // Tries in order:
// //   { data: { data: { tokens: { access } } } }   ← most nested
// //   { data: { tokens: { access } } }
// //   { data: { access } }
// //   { access }                                    ← flat
// // ─────────────────────────────────────────────────────────

// function extractToken(res: unknown): string | null {
//   const candidates = [
//     get(res, "data", "data", "tokens", "access"),
//     get(res, "data", "tokens", "access"),
//     get(res, "data", "access"),
//     get(res, "access"),
//   ];

//   for (const candidate of candidates) {
//     if (typeof candidate === "string" && candidate.length > 0) {
//       return candidate;
//     }
//   }

//   return null;
// }

// // ─────────────────────────────────────────────────────────
// // User extractor — same multi-shape handling
// //
// // Tries in order:
// //   { data: { data: { user } } }
// //   { data: { user } }
// //   { data }                    ← data IS the user object
// // ─────────────────────────────────────────────────────────

// function extractUser(res: unknown): Record<string, unknown> | null {
//   const candidates = [
//     get(res, "data", "data", "user"),
//     get(res, "data", "user"),
//     get(res, "data"),
//   ];

//   for (const candidate of candidates) {
//     if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
//       return candidate as Record<string, unknown>;
//     }
//   }

//   return null;
// }

// // ─────────────────────────────────────────────────────────
// // Cookie helpers
// // ─────────────────────────────────────────────────────────

// function setLoggedInCookie(): void {
//   Cookies.set("logged_in", "true", {
//     expires: 7,
//     sameSite: "lax",
//     secure: process.env.NODE_ENV === "production",
//   });
// }

// function clearLoggedInCookie(): void {
//   Cookies.remove("logged_in");
// }

// // ─────────────────────────────────────────────────────────
// // Register
// // ─────────────────────────────────────────────────────────

// export const useRegister = () => {
//   const setAuth = useAuthStore((s) => s.setAuth);
//   const queryClient = useQueryClient();
//   const router = useRouter();

//   return useMutation({
//     mutationFn: registerUser,

//     onSuccess: (res: unknown) => {
//       const token = extractToken(res);
//       const user  = extractUser(res);

//       if (token) {
//         setAccessToken(token);
//         console.log("✅ Register token stored");
//       } else {
//         console.warn("⚠️ No access token in register response", res);
//       }

//       if (user) {
//         setAuth(user as unknown as Parameters<typeof setAuth>[0]);
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

// // ─────────────────────────────────────────────────────────
// // Login
// // ─────────────────────────────────────────────────────────

// export const useLogin = () => {
//   const setAuth = useAuthStore((s) => s.setAuth);
//   const queryClient = useQueryClient();
//   const router = useRouter();

//   return useMutation({
//     mutationFn: loginUser,

//     onSuccess: (res: unknown) => {
//       const token = extractToken(res);
//       const user  = extractUser(res);
//       // In useLogin onSuccess — add temporarily
//       console.log("RAW RESPONSE:", JSON.stringify(res, null, 2))

//       if (token) {
//         setAccessToken(token);
//         console.log("✅ Login token stored:", token.slice(0, 20) + "...");
//       } else {
//         console.warn("⚠️ No token in login response — WS will fail", res);
//       }

//       if (!user) {
//         console.error("USER DATA MISSING IN RESPONSE", res);
//         showError("Invalid login response from server");
//         return;
//       }
//       setAuth(user as unknown as Parameters<typeof setAuth>[0]);

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

// // ─────────────────────────────────────────────────────────
// // Logout
// // ─────────────────────────────────────────────────────────

// export const useLogout = () => {
//   const setAuth     = useAuthStore((s) => s.setAuth);
//   const queryClient = useQueryClient();
//   const router      = useRouter();

//   const performLogout = async (): Promise<void> => {
//     const baseUrl =
//       process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
//     await fetch(`${baseUrl}/auth/logout/`, {
//       method: "POST",
//       credentials: "include",
//     });
//   };

//   const cleanup = (): void => {
//     setAccessToken(null);   // clears memory + sessionStorage + cookie
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
//       cleanup();   // always clean up even if server call fails
//       router.push("/login");
//     },
//   });
// };
















































"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  registerUser,
  loginUser,
  extractAccessToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  resendVerification,
} from "@/shared/api/auth.api";
import { useAuthStore } from "../store/auth.store";
import { showSuccess, showError } from "@/shared/utils/toast";
import Cookies from "js-cookie";
import { setAccessToken, getAccessToken } from "@/shared/api/client";
import { getMyProfile } from "@/shared/api/profile.api";

// ─────────────────────────────────────────────────────────
// Safe deep-get helper
// ─────────────────────────────────────────────────────────
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
// Token extractor
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
// User extractor
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
  const router = useRouter();

  return useMutation({
    mutationFn: registerUser,

    onSuccess: (res: unknown) => {
      // No token after register — user must verify email first
      const email = get(res, "data", "data", "user", "email") as string | undefined;

      showSuccess("Account created! Please check your email to verify your account.");

      // Redirect to verify-email page with email pre-filled
      const params = email ? `?email=${encodeURIComponent(email)}` : "";
      router.push(`/verify-email${params}`);
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
function sanitizeRedirectPath(next: string | null): string {
  if (!next || !next.startsWith("/")) return "/dashboard";
  if (next === "/profile/me" || next.startsWith("/profile/me/")) return "/profile";
  return next;
}

export const useLogin = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: loginUser,

    onSuccess: (res: unknown) => {
      const axiosData = (res as { data?: unknown })?.data;
      const token = extractToken(res) ?? extractAccessToken(axiosData);
      const user  = extractUser(res);

      // ✅ Allow login even if token wasn't in response
      // (backend may use httpOnly cookies + loginUser already called refresh)
      if (!token) {
        console.warn("⚠️ No token in login response, but checking if refresh worked...");
        // Try to get token from session storage (loginUser may have set it via refresh)
        const storedToken = getAccessToken();
        if (!storedToken) {
          console.error("❌ No token available after login");
          showError("Login OK but no access token available. Please try again.");
          return;
        }
        console.log("✅ Token found in storage from refresh call");
      }

      if (token) {
        setAccessToken(token);
        console.log("✅ Login token stored:", token.slice(0, 20) + "...");
      }

      if (!user) {
        console.error("USER DATA MISSING IN RESPONSE", res);
        showError("Invalid login response from server");
        return;
      }

      setAuth(user as unknown as Parameters<typeof setAuth>[0]);
      queryClient.setQueryData(["authUser"], user);
      setLoggedInCookie();

      void queryClient
        .prefetchQuery({ queryKey: ["myProfile"], queryFn: getMyProfile })
        .catch(() => {});

      showSuccess("Welcome back!");
      const next =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      router.push(sanitizeRedirectPath(next));
    },

    onError: (err: unknown) => {
      console.error("LOGIN ERROR", err);
      // Handle unverified email specifically
      const code = (err as { response?: { data?: { code?: string } } })
        ?.response?.data?.code;
      if (code === "EMAIL_NOT_VERIFIED") {
        showError("Please verify your email before logging in.");
        router.push("/verify-email");
        return;
      }
      showError(getApiErrorMessage(err, "Login failed"));
    },
  });
};

// ─────────────────────────────────────────────────────────
// Verify Email
// ─────────────────────────────────────────────────────────
export const useVerifyEmail = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: verifyEmail,

    onSuccess: (res: unknown) => {
      const token = extractToken(res);
      const user  = extractUser(res);

      if (token) {
        setAccessToken(token);
        console.log("✅ Email verified — token stored");
      }

      if (user) {
        setAuth(user as unknown as Parameters<typeof setAuth>[0]);
        queryClient.setQueryData(["authUser"], user);
      }

      setLoggedInCookie();
      showSuccess("Email verified! Let's set up your profile.");
      router.push("/onboarding");
    },

    onError: (err: unknown) => {
      console.error("VERIFY EMAIL ERROR", err);
      showError(getApiErrorMessage(err, "Invalid or expired verification link."));
    },
  });
};

// ─────────────────────────────────────────────────────────
// Resend Verification Email
// ─────────────────────────────────────────────────────────
export const useResendVerification = () => {
  return useMutation({
    mutationFn: resendVerification,

    onSuccess: () => {
      showSuccess("Verification email resent! Please check your inbox.");
    },

    onError: (err: unknown) => {
      console.error("RESEND VERIFICATION ERROR", err);
      showError(getApiErrorMessage(err, "Could not resend verification email."));
    },
  });
};

// ─────────────────────────────────────────────────────────
// Forgot Password
// ─────────────────────────────────────────────────────────
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: forgotPassword,

    onSuccess: () => {
      showSuccess("Reset link sent! Please check your email.");
    },

    onError: (err: unknown) => {
      console.error("FORGOT PASSWORD ERROR", err);
      showError(getApiErrorMessage(err, "Could not send reset email. Please try again."));
    },
  });
};

// ─────────────────────────────────────────────────────────
// Reset Password
// ─────────────────────────────────────────────────────────
export const useResetPassword = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: resetPassword,

    onSuccess: () => {
      showSuccess("Password reset successful! You can now log in.");
      router.push("/login");
    },

    onError: (err: unknown) => {
      console.error("RESET PASSWORD ERROR", err);
      showError(getApiErrorMessage(err, "Invalid or expired reset link."));
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
    setAccessToken(null);
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
      cleanup();
      router.push("/login");
    },
  });
};
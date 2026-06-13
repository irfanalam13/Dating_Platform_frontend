"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  registerUser,
  loginUser,
  googleAuth,
  verifyEmail,
  forgotPassword,
  resetPassword,
  resendVerification,
} from "@/shared/api/auth.api";
import { useAuthStore } from "../store/auth.store";
import type { LoginPayload } from "@/shared/types/auth.types";
import { showSuccess, showError } from "@/shared/utils/toast";
import { logger } from "@/shared/utils/logger";
import Cookies from "js-cookie";
import { setAccessToken } from "@/shared/api/client";
import { get, extractToken, extractUser } from "@/shared/api/parse";

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
      logger.error("REGISTER ERROR", err);
      showError(err, "Registration failed. Please try again.");
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
      const user = extractUser(res);

      if (!user) {
        logger.error("USER DATA MISSING IN RESPONSE", res);
        showError("Invalid login response from server");
        return;
      }

      setAuth(user as unknown as Parameters<typeof setAuth>[0]);
      queryClient.setQueryData(["authUser"], user);
      setLoggedInCookie();

      const hour = new Date().getHours();
      const timeGreeting =
        hour < 12 ? "Good morning" :
        hour < 17 ? "Good afternoon" :
                    "Good evening";

      const firstName = ((user as any)?.full_name ?? "").trim().split(/\s+/)[0] ?? "";

      showSuccess(`${timeGreeting}${firstName ? `, ${firstName}` : ""}!`);
      router.push("/dashboard");
    },

    onError: (err: unknown, variables: LoginPayload) => {
      logger.error("LOGIN ERROR", err);
      // Handle unverified email specifically
      const resData = (
        err as { response?: { data?: { code?: string; data?: { email?: string } } } }
      )?.response?.data;
      if (resData?.code === "EMAIL_NOT_VERIFIED") {
        showError("Please verify your email. We've sent you a new code.");
        // Carry the email so the verify page is pre-filled and resend works,
        // letting the user finish verification instead of looping. Prefer the
        // address the server echoed back, falling back to what was typed.
        const email = resData?.data?.email || variables?.email;
        const params = email ? `?email=${encodeURIComponent(email)}` : "";
        router.push(`/verify-email${params}`);
        return;
      }
      showError("Invalid email or password");
    },
  });
};

// ─────────────────────────────────────────────────────────
// Google Login / Signup
// ─────────────────────────────────────────────────────────
export const useGoogleAuth = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: googleAuth,

    onSuccess: (res: unknown) => {
      const user = extractUser(res);

      if (!user) {
        logger.error("GOOGLE USER DATA MISSING IN RESPONSE", res);
        showError("Invalid Google sign-in response from server");
        return;
      }

      setAuth(user as unknown as Parameters<typeof setAuth>[0]);
      queryClient.setQueryData(["authUser"], user);
      setLoggedInCookie();
      showSuccess("Signed in with Google!");

      const isNew = get(res, "data", "data", "is_new") === true;
      router.push(isNew ? "/onboarding" : "/dashboard");
    },

    onError: (err: unknown) => {
      logger.error("GOOGLE AUTH ERROR", err);
      showError(err, "Google sign-in failed. Please try again.");
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
        logger.log("Email verified — token stored");
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
      logger.error("VERIFY EMAIL ERROR", err);
      showError(err, "Invalid or expired verification code.");
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
      logger.error("RESEND VERIFICATION ERROR", err);
      showError(err, "Could not resend verification email.");
    },
  });
};

// ─────────────────────────────────────────────────────────
// Forgot Password
// ─────────────────────────────────────────────────────────
export const useForgotPassword = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: forgotPassword,

    onSuccess: (_res: unknown, variables: { email: string }) => {
      showSuccess("Reset code sent! Please check your email.");
      router.push(`/reset-password?email=${encodeURIComponent(variables.email)}`);
    },

    onError: (err: unknown) => {
      logger.error("FORGOT PASSWORD ERROR", err);
      // Surfaces the backend message (e.g. "No account is registered with this email.")
      showError(err, "Could not send reset code. Please try again.");
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
      logger.error("RESET PASSWORD ERROR", err);
      showError(err, "Invalid or expired reset code.");
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

import api from "./client";
import { refreshOnce } from "./client";
import {
  LoginPayload,
  RegisterPayload,
  VerifyEmailPayload,
  VerifyEmailResponse,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  ResendVerificationPayload,
} from "../types/auth.types";

export async function loginUser(credentials: LoginPayload) {
  // Django sets the HttpOnly refresh cookie on login but doesn't return the
  // access token in the body. A single refresh reads that cookie and pulls the
  // access token into JS memory. refreshOnce() dedupes concurrent refreshes so
  // we never rotate the refresh token twice and log ourselves out.
  const res = await api.post("/auth/login/", credentials);
  await refreshOnce();
  return res;
}

export async function registerUser(credentials: RegisterPayload) {
  const res = await api.post("/auth/register/", credentials);
  // No token after register — user must verify email first.
  return res;
}

export async function verifyEmail(payload: VerifyEmailPayload): Promise<VerifyEmailResponse> {
  const res = await api.post("/auth/verify_email/", payload);
  // Verification logs the user in: sync the access token into JS memory.
  await refreshOnce();
  return res.data;
}

export async function forgotPassword(payload: ForgotPasswordPayload) {
  const res = await api.post("/auth/forgot_password/", payload);
  return res.data;
}

export async function resetPassword(payload: ResetPasswordPayload) {
  const res = await api.post("/auth/reset_password/", payload);
  return res.data;
}

export async function resendVerification(payload: ResendVerificationPayload) {
  const res = await api.post("/auth/resend_verification/", payload);
  return res.data;
}

export const logoutUser = async (refresh: string) => {
  const res = await api.post("/auth/logout/", { refresh }, { withCredentials: true });
  return res.data;
};

export const getMe = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/auth/me/`,
    {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    }
  );
  if (!res.ok) return null;
  return res.json();
};

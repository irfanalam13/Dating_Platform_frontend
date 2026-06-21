import api from "./client";
import { refreshOnce, setAccessToken, setRefreshToken } from "./client";
import { extractToken, extractRefreshToken } from "./parse";
import {
  LoginPayload,
  RegisterPayload,
  GoogleAuthPayload,
  VerifyEmailPayload,
  VerifyEmailResponse,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  ResendVerificationPayload,
} from "../types/auth.types";

export async function loginUser(credentials: LoginPayload) {
  // Login now returns the freshly minted access token in the body (data.tokens.
  // access), so we read it straight into JS memory for the WebSocket. This
  // avoids an immediate /auth/refresh/ which would ROTATE and blacklist the
  // just-issued refresh token one second after login — the root cause of the
  // intermittent "token invalid" logouts. refreshOnce() stays as a fallback for
  // older backends that don't return the token.
  // useLogin's onError shows a detailed toast, so suppress the interceptor's
  // generic one to avoid a second toast overshadowing it.
  const res = await api.post("/auth/login/", credentials, { skipErrorToast: true });
  const token = extractToken(res);
  const refresh = extractRefreshToken(res);
  if (refresh) setRefreshToken(refresh);
  if (token) setAccessToken(token);
  else await refreshOnce();
  return res;
}

export async function registerUser(credentials: RegisterPayload) {
  const res = await api.post("/auth/register/", credentials);
  // No token after register — user must verify email first.
  return res;
}

export async function googleAuth(payload: GoogleAuthPayload) {
  const res = await api.post("/auth/google/", payload, { skipErrorToast: true });
  const token = extractToken(res);
  const refresh = extractRefreshToken(res);
  if (refresh) setRefreshToken(refresh);

  if (token) {
    setAccessToken(token);
  } else {
    await refreshOnce();
  }

  return res;
}

export async function verifyEmail(payload: VerifyEmailPayload): Promise<VerifyEmailResponse> {
  const res = await api.post("/auth/verify_email/", payload);
  // Verification logs the user in and returns the token pair in the body. Read
  // the tokens directly instead of rotating via refreshOnce (see loginUser).
  const token = extractToken(res);
  const refresh = extractRefreshToken(res);
  if (refresh) setRefreshToken(refresh);
  if (token) setAccessToken(token);
  else await refreshOnce();
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

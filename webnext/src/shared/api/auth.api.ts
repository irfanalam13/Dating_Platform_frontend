// import api from "./client";
// import { setAccessToken } from "./client";
// import { LoginPayload, RegisterPayload, AuthResponse } from "../types/auth.types";

// // export const registerUser = async (data: RegisterPayload): Promise<AuthResponse> => {
// //   const res = await api.post("/auth/register/", data);
// //   const token = res.data?.data?.tokens?.access;
// //   if (token) setAccessToken(token);
// //   return res.data;
// // };

// // // export const loginUser = async (data: LoginPayload): Promise<AuthResponse> => {
// // //   const res = await api.post("/auth/login/", data);
// // //   const token = res.data?.data?.tokens?.access;
// // //   if (token) setAccessToken(token);
// // //   return res.data;
// // // };
// // export const loginUser = async (data: LoginPayload): Promise<AuthResponse> => {
// //   const res = await api.post("/auth/login/", data);
// //   console.log("Login response:", JSON.stringify(res.data));
// //   const token = res.data?.data?.tokens?.access;
// //   console.log("Token extracted:", token);
// //   if (token) setAccessToken(token);
// //   return res.data;
// // };


// export async function loginUser(credentials: LoginPayload) {
//   // 1. Login — Django sets httpOnly refresh cookie in Set-Cookie header
//   const res = await api.post("/auth/login/", credentials);
//   const refreshRes = await api.post("/auth/refresh/");
//   console.log("REFRESH RESPONSE:", JSON.stringify(refreshRes?.data, null, 2));
//   // 2. Immediately call refresh to get the access token into JS memory
//   // Django reads the httpOnly cookie it just set and returns the access token
//   try {
//     const refreshRes = await api.post("/auth/refresh/");
//     // const token =
//     //   refreshRes?.data?.data?.tokens?.access ||
//     //   refreshRes?.data?.tokens?.access       ||
//     //   refreshRes?.data?.access               ||
//     //   refreshRes?.data?.access_token         ||
//     //   null;

//     const token = refreshRes?.data?.data?.access || null;

//     if (token) {
//       setAccessToken(token);
//       console.log("✅ Token obtained after login:", token.slice(0, 20) + "...");
//     } else {
//       console.warn("⚠️ Refresh returned no token:", refreshRes?.data);
//     }
//   } catch (e) {
//     console.warn("⚠️ Could not get access token after login:", e);
//   }

//   return res;
// }

// export async function registerUser(credentials: RegisterPayload) {
//   const res = await api.post("/auth/register/", credentials);

//   // Same pattern — get token after register
//   try {
//     const refreshRes = await api.post("/auth/refresh/");
//     const token =
//       refreshRes?.data?.data?.tokens?.access ||
//       refreshRes?.data?.tokens?.access       ||
//       refreshRes?.data?.access               ||
//       refreshRes?.data?.access_token         ||
//       null;

//     if (token) {
//       setAccessToken(token);
//       console.log("✅ Token obtained after register:", token.slice(0, 20) + "...");
//     }
//   } catch (e) {
//     console.warn("⚠️ Could not get access token after register:", e);
//   }

//   return res;
// }

// export const logoutUser = async (refresh: string) => {
//   const res = await api.post("/auth/logout/", { refresh }, { withCredentials: true });
//   return res.data;
// };

// export const getMe = async () => {
//   const res = await fetch(
//     `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/auth/me/`,
//     {
//       method: "GET",
//       credentials: "include",
//       headers: { "Content-Type": "application/json" },
//     }
//   );
//   if (!res.ok) return null;
//   return res.json();
// };











import api, { parseAccessToken, setAccessToken } from "./client";
import {
  LoginPayload,
  RegisterPayload,
  VerifyEmailPayload,
  VerifyEmailResponse,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  ResendVerificationPayload,
} from "../types/auth.types";

export function extractAccessToken(payload: unknown): string | null {
  return parseAccessToken(payload);
}

export async function loginUser(credentials: LoginPayload) {
  const res = await api.post("/auth/login/", credentials);

  // Try to get token from login response
  const fromLogin = extractAccessToken(res.data);
  if (fromLogin) {
    setAccessToken(fromLogin);
    return res;
  }

  // If no token in login response, the backend likely uses httpOnly cookies
  // Call refresh to get the access token from the cookie
  try {
    console.log("📍 No token in login response, calling refresh...");
    const refreshRes = await api.post("/auth/refresh/");
    const token = extractAccessToken(refreshRes.data);
    
    if (token) {
      setAccessToken(token);
      console.log("✅ Token obtained from refresh after login:", token.slice(0, 20) + "...");
      // Return the original login response but with token now stored
      return res;
    } else {
      console.warn("⚠️ Refresh also returned no token");
      // Still return login response - user data is there, just no token
      return res;
    }
  } catch (e) {
    console.warn("⚠️ Could not get access token after login:", e);
    // Return login response anyway - let the app try to proceed
    return res;
  }
}

export async function registerUser(credentials: RegisterPayload) {
  const res = await api.post("/auth/register/", credentials);
  // No token after register — user must verify email first
  return res;
}

export async function verifyEmail(payload: VerifyEmailPayload): Promise<VerifyEmailResponse> {
  const res = await api.post("/auth/verify_email/", payload);

  const token = parseAccessToken(res.data);
  if (token) {
    setAccessToken(token);
  }

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
  const res = await api.get("/auth/me/");
  return res.data;
};
import api from "./client";
import { setAccessToken } from "./client";
import { LoginPayload, RegisterPayload, AuthResponse } from "../types/auth.types";

// export const registerUser = async (data: RegisterPayload): Promise<AuthResponse> => {
//   const res = await api.post("/auth/register/", data);
//   const token = res.data?.data?.tokens?.access;
//   if (token) setAccessToken(token);
//   return res.data;
// };

// // export const loginUser = async (data: LoginPayload): Promise<AuthResponse> => {
// //   const res = await api.post("/auth/login/", data);
// //   const token = res.data?.data?.tokens?.access;
// //   if (token) setAccessToken(token);
// //   return res.data;
// // };
// export const loginUser = async (data: LoginPayload): Promise<AuthResponse> => {
//   const res = await api.post("/auth/login/", data);
//   console.log("Login response:", JSON.stringify(res.data));
//   const token = res.data?.data?.tokens?.access;
//   console.log("Token extracted:", token);
//   if (token) setAccessToken(token);
//   return res.data;
// };


export async function loginUser(credentials: LoginPayload) {
  // 1. Login — Django sets httpOnly refresh cookie in Set-Cookie header
  const res = await api.post("/auth/login/", credentials);
  const refreshRes = await api.post("/auth/refresh/");
  console.log("REFRESH RESPONSE:", JSON.stringify(refreshRes?.data, null, 2));
  // 2. Immediately call refresh to get the access token into JS memory
  // Django reads the httpOnly cookie it just set and returns the access token
  try {
    const refreshRes = await api.post("/auth/refresh/");
    // const token =
    //   refreshRes?.data?.data?.tokens?.access ||
    //   refreshRes?.data?.tokens?.access       ||
    //   refreshRes?.data?.access               ||
    //   refreshRes?.data?.access_token         ||
    //   null;

    const token = refreshRes?.data?.data?.access || null;

    if (token) {
      setAccessToken(token);
      console.log("✅ Token obtained after login:", token.slice(0, 20) + "...");
    } else {
      console.warn("⚠️ Refresh returned no token:", refreshRes?.data);
    }
  } catch (e) {
    console.warn("⚠️ Could not get access token after login:", e);
  }

  return res;
}

export async function registerUser(credentials: RegisterPayload) {
  const res = await api.post("/auth/register/", credentials);

  // Same pattern — get token after register
  try {
    const refreshRes = await api.post("/auth/refresh/");
    const token =
      refreshRes?.data?.data?.tokens?.access ||
      refreshRes?.data?.tokens?.access       ||
      refreshRes?.data?.access               ||
      refreshRes?.data?.access_token         ||
      null;

    if (token) {
      setAccessToken(token);
      console.log("✅ Token obtained after register:", token.slice(0, 20) + "...");
    }
  } catch (e) {
    console.warn("⚠️ Could not get access token after register:", e);
  }

  return res;
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
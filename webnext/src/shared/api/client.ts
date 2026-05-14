


"use client";

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ================= TYPES & STATE =================
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let failedQueue: { resolve: (val: any) => void; reject: (err: any) => void }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// ================= REQUEST INTERCEPTOR =================
api.interceptors.request.use((config) => {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    if (match) {
      config.headers["X-CSRFToken"] = match[1];
    }
  }
  return config;
});

// ================= RESPONSE INTERCEPTOR =================
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response.status;
    const url = originalRequest.url || "";

    const isAuthRoute =
      url.includes("/auth/login/") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh/") ||
      url.includes("/auth/logout/") ||
      url.includes("/auth/me/");

    if (status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post("/auth/refresh/");
        processQueue(null);
        isRefreshing = false;
        return api(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError);
        isRefreshing = false;

        if (typeof window !== "undefined") {
          console.error("REFRESH FAILED - FORCING LOGOUT", refreshError);
          localStorage.clear();
          sessionStorage.clear();

          // ✅ Clear logged_in cookie from frontend domain
          Cookies.remove("logged_in");

          // ✅ Let server clear HttpOnly cookies
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout/`, {
            method: "POST",
            credentials: "include",
          }).catch(() => {});

          window.location.replace("/login");
          return new Promise(() => {});
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
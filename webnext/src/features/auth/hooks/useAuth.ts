// src/features/auth/hooks/useAuth.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { registerUser, loginUser } from "@/shared/api/auth.api";
import { useAuthStore } from "../store/auth.store";
import { showSuccess, showError } from "@/shared/utils/toast";
import api from "@/shared/api/client"; // Needed for the logout call

// ================= REGISTER =================
export const useRegister = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  return useMutation({
    mutationFn: registerUser,

    onSuccess: async (res: any) => {
      console.log("✅ REGISTER SUCCESS", res);
      
      const user = res?.data?.data?.user || res?.data?.user || res?.user || res;

      if (user) {
        setAuth(user);
        showSuccess("Account created successfully! Redirecting...");

        setTimeout(() => {
          router.push("/profile");
        }, 1000);
      } else {
        showSuccess("Account created! Please log in.");
        router.push("/login");
      }
    },

    onError: (err: any) => {
      console.error("❌ REGISTER ERROR", err);
      showError(err?.response?.data?.message || "Registration failed. Please try again.");
    },
  });
};

// ================= LOGIN =================
export const useLogin = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  return useMutation({
    mutationFn: loginUser,

    onSuccess: (res: any) => {
      console.log("🔥 LOGIN RESPONSE:", res);

      // Adjusted to match your Django api_response utility structure
      const user = res?.data?.data?.user || res?.data?.user;

      if (!user) {
        console.error("❌ USER NOT FOUND IN RESPONSE", res);
        showError("Invalid login response");
        return;
      }

      setAuth(user);
      showSuccess("Login successful");
      router.push("/profile");
    },

    onError: (err: any) => {
      console.error("❌ LOGIN ERROR", err);
      showError(err?.response?.data?.message || "Login failed");
    },
  });
};

// ================= LOGOUT =================
export const useLogout = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const router = useRouter();

  return useMutation({
    // We call the backend so Django can delete the HttpOnly cookies
    mutationFn: async () => {
      const res = await api.post("/auth/logout/");
      return res.data;
    },
    
    onSuccess: () => {
      setAuth(null); // Clear the frontend state
      showSuccess("Logged out successfully");
      router.push("/login");
    },

    onError: (err: any) => {
      console.error("❌ LOGOUT ERROR", err);
      // Even if the backend fails, we should force clear the frontend state
      setAuth(null);
      router.push("/login");
    }
  });
};
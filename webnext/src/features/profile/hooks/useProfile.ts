import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { getMyProfile, getUserProfile, updateProfile } from "@/shared/api/profile.api";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { getAccessToken } from "@/shared/api/client";

function canFetchProfile(): boolean {
  if (typeof window === "undefined") return false;
  return (
    !!getAccessToken() ||
    Cookies.get("logged_in") === "true"
  );
}

// 🔥 My profile
export const useMyProfile = () => {
  const user = useAuthStore((s) => s.user);
  const isAuthed = !!user || canFetchProfile();

  return useQuery({
    queryKey: ["myProfile"],
    queryFn: getMyProfile,
    enabled: isAuthed,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
};

// 🔥 Other user
export const useUserProfile = (userId: number) => {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getUserProfile(userId),
    enabled: !!userId,

    // ✅ FIXES
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
};

// 🔥 Update
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
    },
  });
};
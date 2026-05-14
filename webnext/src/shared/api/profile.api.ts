import type { DiscoverResponse, MatchResponse, Profile } from "@/shared/types/profile.types";
import api from "./client";

// 👤 My profile
export const getMyProfile = async (): Promise<Profile> => {
  const res = await api.get("/profile/me/");
  return res.data;
};

// 👤 Other profile
export const getUserProfile = async (userId: number) => {
  const res = await api.get(`/profile/${userId}/`);
  return res.data;
};

// ✏️ Update profile
export const updateProfile = (formData: FormData) => {
  return api.patch("/profile/me/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// 🔥 Discover (MUST match backend matcher app)
export const getDiscoverProfiles = async (): Promise<DiscoverResponse> => {
  const res = await api.get("/matcher/recommendations/");
  return res.data;
};

// 💖 Match action
export const sendInterest = async (
  profileId: number,
  action: "like" | "pass"
): Promise<MatchResponse> => {
  const res = await api.post(`/matcher/send/${profileId}/`, { action });
  return res.data;
};

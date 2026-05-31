import type { DiscoverResponse, MatchResponse, Profile } from "@/shared/types/profile.types";
import api, { getAccessToken, refreshOnce } from "./client";

function unwrapProfile(payload: unknown): Profile {
  const body = payload as Record<string, unknown> | null;
  if (!body) throw new Error("Empty profile response");

  const nested = body.data as Record<string, unknown> | undefined;
  const profile = (nested?.profile ?? nested) as Record<string, unknown> | undefined;

  if (profile && (typeof profile.id !== "undefined" || typeof profile.user !== "undefined")) {
    return profile as unknown as Profile;
  }
  if (typeof body.id !== "undefined" || typeof body.user !== "undefined") {
    return body as unknown as Profile;
  }
  if (nested && (typeof nested.id !== "undefined" || typeof nested.user !== "undefined")) {
    return nested as unknown as Profile;
  }

  throw new Error("Profile payload missing id");
}

async function ensureAccessToken(): Promise<string> {
  const existing = getAccessToken();
  if (existing) return existing;

  const token = await refreshOnce();
  if (!token) {
    throw new Error("Not authenticated — please log in again");
  }
  return token;
}

// 👤 My profile
export const getMyProfile = async (): Promise<Profile> => {
  await ensureAccessToken();
  const res = await api.get("/profile/me/");
  return unwrapProfile(res.data);
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

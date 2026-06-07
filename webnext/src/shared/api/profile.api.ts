// import type { DiscoverResponse, MatchResponse, Profile } from "@/shared/types/profile.types";
// import api from "./client";

// // 👤 My profile
// export const getMyProfile = async (): Promise<Profile> => {
//   const res = await api.get("/profile/me/");
//   return res.data;
// };

// // 👤 Other profile
// export const getUserProfile = async (userId: number) => {
//   const res = await api.get(`/profile/${userId}/`);
//   return res.data;
// };

// // ✏️ Update profile
// export const updateProfile = (formData: FormData) => {
//   return api.patch("/profile/me/", formData, {
//     headers: {
//       "Content-Type": "multipart/form-data",
//     },
//   });
// };

// //  Discover (MUST match backend matcher app)
// export const getDiscoverProfiles = async (): Promise<DiscoverResponse> => {
//   const res = await api.get("/matcher/recommendations/");
//   return res.data;
// };

// // 💖 Match action
// export const sendInterest = async (
//   profileId: number,
//   action: "like" | "pass"
// ): Promise<MatchResponse> => {
//   const res = await api.post(`/matcher/send/${profileId}/`, { action });
//   return res.data;
// };




// shared/api/profile.api.ts

import type {
  PublicProfile,
  SocialLink,
  SocialLinkPayload,
  BulkSocialLinkPayload,
  DiscoverResponse,
  MatchResponse,
  Profile,
} from "@/shared/types/profile.types";
import api from "./client";

// ──────────────────────────────────────────────
// 👤 Own Profile
// ──────────────────────────────────────────────

export const getMyProfile = async (): Promise<Profile> => {
  const res = await api.get("/profile/me/");
  return res.data;
};

export const updateProfile = (formData: FormData) => {
  return api.patch("/profile/me/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// ──────────────────────────────────────────────
// 👥 Public Profile Viewer
// ──────────────────────────────────────────────

/**
 * Fetch another user's public profile.
 * GET /profile/<user_id>/
 * Also logs a profile view on the backend (de-duplicated per hour).
 */
export const getPublicProfile = async (userId: number): Promise<PublicProfile> => {
  const res = await api.get(`/profile/${userId}/`);
  return res.data;
};

// // 👤 Other profile
// export const getUserProfile = async (userId: number) => {
//   const res = await api.get(`/profile/${userId}/`);
//   return res.data;
// };

// ──────────────────────────────────────────────
//  Discovery
// ──────────────────────────────────────────────

export const getDiscoverProfiles = async (): Promise<DiscoverResponse> => {
  const res = await api.get("/matcher/recommendations/");
  return res.data;
};

/**
 * My-Type deck — accounts that match the preferences the user saved
 * (gender, age, religion/caste/gotra, city, etc.). Same shape as Discover.
 * GET /matcher/my-type/
 */
export const getMyTypeProfiles = async (): Promise<DiscoverResponse> => {
  const res = await api.get("/matcher/my-type/");
  return res.data;
};

// ──────────────────────────────────────────────
// 💖 Match Actions
// ──────────────────────────────────────────────

export const sendInterest = async (
  profileId: number,
  action: "like" | "pass"
): Promise<MatchResponse> => {
  const res = await api.post(`/matcher/send/${profileId}/`, { action });
  return res.data;
};

// ──────────────────────────────────────────────
// 🔗 Social Links — Own Profile
// ──────────────────────────────────────────────

/**
 * Get all social links for the logged-in user.
 * GET /profile/me/social-links/
 */
export const getMySocialLinks = async (): Promise<SocialLink[]> => {
  const res = await api.get("/profile/me/social-links/");
  return res.data;
};

/**
 * Add or update a single social link (upsert by platform).
 * POST /profile/me/social-links/
 */
export const upsertSocialLink = async (
  payload: SocialLinkPayload
): Promise<SocialLink> => {
  const res = await api.post("/profile/me/social-links/", payload);
  return res.data;
};

/**
 * Replace ALL social links in one request.
 * PUT /profile/me/social-links/bulk/
 */
export const bulkUpsertSocialLinks = async (
  payload: BulkSocialLinkPayload
): Promise<SocialLink[]> => {
  const res = await api.put("/profile/me/social-links/bulk/", payload);
  return res.data;
};

/**
 * Update a single social link by ID.
 * PATCH /profile/me/social-links/<link_id>/
 */
export const updateSocialLink = async (
  linkId: number,
  payload: Partial<SocialLinkPayload>
): Promise<SocialLink> => {
  const res = await api.patch(`/profile/me/social-links/${linkId}/`, payload);
  return res.data;
};

/**
 * Delete a single social link by ID.
 * DELETE /profile/me/social-links/<link_id>/
 */
export const deleteSocialLink = async (linkId: number): Promise<void> => {
  await api.delete(`/profile/me/social-links/${linkId}/`);
};
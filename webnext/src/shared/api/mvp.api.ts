import api from "./client";

export interface PrivacySettings {
  id?: number;
  show_age: boolean;
  show_location: boolean;
  show_profile_image: boolean;
  allow_messages_from: "everyone" | "matches" | "none";
  is_profile_public: boolean;
  // Per-field "hide from others" toggles (apply to the public profile view).
  show_dob?: boolean;
  show_height?: boolean;
  show_weight?: boolean;
  show_languages?: boolean;
  show_education?: boolean;
  show_career?: boolean;
  show_religion?: boolean;
}

export interface ProfileSettings {
  id?: number;
  show_dob: boolean;
  show_profile_image: boolean;
  show_location: boolean;
  show_profile_views: boolean;
  anonymous_viewing: boolean;
  is_private: boolean;
  blur_profile_image: boolean;
}

export interface BlockedUser {
  id: number;
  blocked: number;
  blocked_email: string;
  blocked_profile_id: number;
  created_at: string;
}

export const getPrivacySettings = async (): Promise<PrivacySettings> => {
  const res = await api.get("/privacy/");
  return res.data;
};

export const updatePrivacySettings = async (
  data: Partial<PrivacySettings>
): Promise<PrivacySettings> => {
  const res = await api.patch("/privacy/", data);
  return res.data;
};

export const getProfileSettings = async (): Promise<ProfileSettings> => {
  const res = await api.get("/setting/settings/");
  return res.data;
};

export const updateProfileSettings = async (
  data: Partial<ProfileSettings>
): Promise<ProfileSettings> => {
  const res = await api.patch("/setting/settings/", data);
  return res.data;
};

export const getBlockedUsers = async (): Promise<BlockedUser[]> => {
  const res = await api.get("/block/block/list/");
  return res.data;
};

export const unblockProfile = async (profileId: number): Promise<{ message: string }> => {
  const res = await api.delete(`/block/unblock/${profileId}/`);
  return res.data;
};

export const blockProfile = async (profileId: number): Promise<{ message: string }> => {
  const res = await api.post(`/block/block/${profileId}/`);
  return res.data;
};

// Must match backend ReportReason choices (apps/report/models.py).
export type ReportReasonValue =
  | "fake_identity"
  | "scam"
  | "harassment"
  | "sexual_content"
  | "violence"
  | "hate_speech"
  | "underage"
  | "impersonation"
  | "spam"
  | "other";

export const reportProfile = async (
  profileId: number,
  data: { reason: ReportReasonValue; description?: string }
): Promise<{ message: string }> => {
  const res = await api.post(`/reports/report/${profileId}/`, data);
  return res.data;
};

import api from "./client";

export type VerificationBadgeKey = "email" | "phone" | "id" | "selfie" | "premium";

export interface VerificationStatus {
  badges: Record<VerificationBadgeKey, boolean>;
  requests: Partial<Record<VerificationBadgeKey, string>>; // type -> status
  phone: string | null;
}

export const getVerificationStatus = async (): Promise<VerificationStatus> => {
  const res = await api.get("/verify/status/");
  return res.data;
};

export const requestPhoneOtp = async (phone: string): Promise<{ detail?: string }> => {
  const res = await api.post("/verify/phone/request/", { phone });
  return res.data ?? {};
};

export const verifyPhoneOtp = async (code: string): Promise<{ detail?: string }> => {
  const res = await api.post("/verify/phone/verify/", { code });
  return res.data ?? {};
};

/** POST /verify/:vtype/submit/ — vtype = id | selfie. Multipart image upload. */
export const submitVerification = async (
  vtype: "id" | "selfie",
  file: File
): Promise<{ detail?: string; status?: string }> => {
  const form = new FormData();
  form.append("image", file);
  const res = await api.post(`/verify/${vtype}/submit/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data ?? {};
};

// src/shared/api/preference.api.ts

import api from "./client";
import type {
  Religion,
  Caste,
  Gotra,
  Preferences,
  PreferencesPayload,
} from "../types/preference.types";


// ─────────────────────────────────────────
// Preferences — Get & Update
// ─────────────────────────────────────────

export const getPreferences = async (): Promise<Preferences> => {
  const res = await api.get("/preference/");
  return res.data;
};

export const updatePreferences = async (
  payload: PreferencesPayload
): Promise<Preferences> => {
  const res = await api.patch("/preference/", payload);
  return res.data;
};


// ─────────────────────────────────────────
// Cultural Dropdowns
// ─────────────────────────────────────────

// shared/api/preference.api.ts

export const getReligions = async (): Promise<Religion[]> => {
  const res = await api.get("/preference/cultural/religions/");  // ✅ fix path
  return Array.isArray(res.data) ? res.data : res.data?.results ?? [];
};

export const getCastes = async (religionId: number): Promise<Caste[]> => {
  const res = await api.get(`/preference/cultural/castes/?religion=${religionId}`);  // ✅
  return Array.isArray(res.data) ? res.data : res.data?.results ?? [];
};

export const getGotras = async (casteId: number): Promise<Gotra[]> => {
  const res = await api.get(`/preference/cultural/gotras/?caste=${casteId}`);  // ✅
  return Array.isArray(res.data) ? res.data : res.data?.results ?? [];
};

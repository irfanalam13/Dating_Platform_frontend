// src/shared/api/preference.api.ts

import api from "./client";
import type {
  Religion,
  Caste,
  Gotra,
  Community,
  CasteCategory,
  CasteV2,
  SubCaste,
  Clan,
  GotraV2,
  Preferences,
  PreferencesPayload,
} from "../types/preference.types";

const asList = <T,>(data: unknown): T[] =>
  Array.isArray(data) ? (data as T[]) : ((data as { results?: T[] })?.results ?? []);


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
  const res = await api.get("/preference/cultural/religions/");  //   fix path
  return Array.isArray(res.data) ? res.data : res.data?.results ?? [];
};

export const getCastes = async (religionId: number): Promise<Caste[]> => {
  const res = await api.get(`/preference/cultural/castes/?religion=${religionId}`);  //  
  return Array.isArray(res.data) ? res.data : res.data?.results ?? [];
};

export const getGotras = async (casteId: number): Promise<Gotra[]> => {
  const res = await api.get(`/preference/cultural/gotras/?caste=${casteId}`);  //
  return Array.isArray(res.data) ? res.data : res.data?.results ?? [];
};


// ─────────────────────────────────────────
// Deep-taxonomy cascade
// Religion → Community → CasteCategory → CasteV2 → SubCaste → Clan → GotraV2
// ─────────────────────────────────────────

export const getCommunities = async (religionId: number): Promise<Community[]> => {
  const res = await api.get(`/preference/cultural/communities/?religion=${religionId}`);
  return asList<Community>(res.data);
};

export const getCasteCategories = async (communityId: number): Promise<CasteCategory[]> => {
  const res = await api.get(`/preference/cultural/caste-categories/?community=${communityId}`);
  return asList<CasteCategory>(res.data);
};

export const getCastesV2 = async (categoryId: number): Promise<CasteV2[]> => {
  const res = await api.get(`/preference/cultural/castes-v2/?category=${categoryId}`);
  return asList<CasteV2>(res.data);
};

export const getSubCastes = async (casteId: number): Promise<SubCaste[]> => {
  const res = await api.get(`/preference/cultural/sub-castes/?caste=${casteId}`);
  return asList<SubCaste>(res.data);
};

export const getClans = async (subCasteId: number): Promise<Clan[]> => {
  const res = await api.get(`/preference/cultural/clans/?sub_caste=${subCasteId}`);
  return asList<Clan>(res.data);
};

export const getGotrasV2 = async (clanId: number): Promise<GotraV2[]> => {
  const res = await api.get(`/preference/cultural/gotras-v2/?clan=${clanId}`);
  return asList<GotraV2>(res.data);
};

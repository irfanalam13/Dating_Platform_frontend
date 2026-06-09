// src/shared/types/preference.types.ts

// ─────────────────────────────────────────
// Cultural Dropdowns
// ─────────────────────────────────────────

export interface Religion {
  id: number;
  name: string;
}

export interface Caste {
  id: number;
  name: string;
  religion: number;
}

export interface Gotra {
  id: number;
  name: string;
  caste: number;
}

// ── Deep taxonomy nodes. Each carries its parent FK id under the parent's name
// (matching the {id, name, <parent>_id} shape returned by the cascade API).
export interface Community {
  id: number;
  name: string;
  religion_id: number;
}

export interface CasteCategory {
  id: number;
  name: string;
  community_id: number;
}

export interface CasteV2 {
  id: number;
  name: string;
  category_id: number;
}

export interface SubCaste {
  id: number;
  name: string;
  caste_id: number;
}

export interface Clan {
  id: number;
  name: string;
  sub_caste_id: number;
}

export interface GotraV2 {
  id: number;
  name: string;
  clan_id: number;
}


// ─────────────────────────────────────────
// Preferences
// ─────────────────────────────────────────

export interface Preferences {
  id: number;

  // Age
  min_age: number;
  max_age: number;

  // Gender
  preferred_gender: "male" | "female" | "other" | "";

  // Location
  preferred_city: string;
  max_distance_km: number;

  // Height range
  preferred_min_height_cm: number | null;
  preferred_max_height_cm: number | null;

  // Cultural (legacy) — read (name) + write (id)
  preferred_religion: number | null;
  preferred_religion_name: string | null;
  preferred_caste: number | null;
  preferred_caste_name: string | null;
  preferred_gotra: number | null;
  preferred_gotra_name: string | null;

  // Cultural (deep taxonomy) — read (name) + write (id)
  preferred_community: number | null;
  preferred_community_name: string | null;
  preferred_caste_category: number | null;
  preferred_caste_category_name: string | null;
  preferred_caste_v2: number | null;
  preferred_caste_v2_name: string | null;
  preferred_sub_caste: number | null;
  preferred_sub_caste_name: string | null;
  preferred_clan: number | null;
  preferred_clan_name: string | null;
  preferred_gotra_v2: number | null;
  preferred_gotra_v2_name: string | null;
  gotra_rule: string;

  // Lifestyle
  preferred_education: string;
  preferred_relationship_intent: string;
  preferred_ethnicity: string;

  // Lifestyle preferences
  preferred_diet: string[];
  preferred_alcohol: string;
  preferred_smoking: string;

  // Religious compatibility
  accept_different_religion: boolean;
  accept_different_community: boolean;
  accept_different_caste: boolean;
  accept_different_gotra: boolean;

  // Deal breakers
  deal_breakers: { must_have: string[]; nice_to_have: string[]; avoid: string[] };

  // From ChoiceForm
  preferred_horoscope: string;

  preferred_hobbies: string;
  preferred_preferences: string;
}


// ─────────────────────────────────────────
// Payload — for PATCH request (all optional)
// ─────────────────────────────────────────

export type PreferencesPayload = Partial<Omit<Preferences,
  | "id"
  | "preferred_religion_name"
  | "preferred_caste_name"
  | "preferred_gotra_name"
  | "preferred_community_name"
  | "preferred_caste_category_name"
  | "preferred_caste_v2_name"
  | "preferred_sub_caste_name"
  | "preferred_clan_name"
  | "preferred_gotra_v2_name"
>>;


// ─────────────────────────────────────────
// Frontend ChoiceForm (your existing type)
// ─────────────────────────────────────────

export interface ChoiceForm {
  gotra: string;
  religion: string;
  caste: string;
  horoscope: string;

  preferences: string;
  hobbies: string;
}

export interface PreferencePayload {
  your_hobbies: ChoiceForm;
  partners_type: ChoiceForm;
}

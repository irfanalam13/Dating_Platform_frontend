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

  // Cultural — read (name) + write (id)
  preferred_religion: number | null;
  preferred_religion_name: string | null;
  preferred_caste: number | null;
  preferred_caste_name: string | null;
  preferred_gotra: number | null;
  preferred_gotra_name: string | null;

  // Lifestyle
  preferred_education: string;
  preferred_relationship_intent: string;
  preferred_ethnicity: string;

  // From ChoiceForm
  preferred_horoscope: string;
  preferred_gan: string;
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
>>;


// ─────────────────────────────────────────
// Frontend ChoiceForm (your existing type)
// ─────────────────────────────────────────

export interface ChoiceForm {
  gotra: string;
  religion: string;
  caste: string;
  horoscope: string;
  gans: string;
  preferences: string;
  hobbies: string;
}

export interface PreferencePayload {
  your_hobbies: ChoiceForm;
  partners_type: ChoiceForm;
}

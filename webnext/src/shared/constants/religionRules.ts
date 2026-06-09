// Religion-conditional cultural-field rules for the UI.
//
// Mirror of the backend source of truth
// (dating_backend/django/apps/profiles/religion_rules.py). The backend is
// authoritative and hard-clears disallowed fields on save; this drives which
// fields are *rendered* so non-Hindu users never see caste/gotra/horoscope.
//
// Model:
//   • Hindu      → full cascade (community → gotra_v2) + horoscope/gan + temple.
//   • Islam      → `community` only, labeled "Sect" (Sunni/Shia).
//   • Christian  → `community` only, labeled "Denomination".
//   • Buddhism/Sikh/Jain/Others/unset → no cultural hierarchy fields.

export const HINDU = "Hindu";

export type CulturalLevel =
  | "community"
  | "caste_category"
  | "caste_v2"
  | "sub_caste"
  | "clan"
  | "gotra_v2";

export interface ReligionRules {
  /** Cascade levels to show, in order. Empty = no cultural hierarchy. */
  levels: CulturalLevel[];
  /** Hindu astrology: gan + horoscope. */
  showHoroscope: boolean;
  /** Temple attendance / ritual importance section. */
  showTemple: boolean;
  /** Label for the level-1 `community` field (relabeled per religion). */
  communityLabel: string;
}

const FULL_LEVELS: CulturalLevel[] = [
  "community",
  "caste_category",
  "caste_v2",
  "sub_caste",
  "clan",
  "gotra_v2",
];

const RULES: Record<string, ReligionRules> = {
  Hindu: {
    levels: FULL_LEVELS,
    showHoroscope: true,
    showTemple: true,
    communityLabel: "Community / Ethnicity",
  },
  Islam: {
    levels: ["community"],
    showHoroscope: false,
    showTemple: false,
    communityLabel: "Sect",
  },
  Christian: {
    levels: ["community"],
    showHoroscope: false,
    showTemple: false,
    communityLabel: "Denomination",
  },
};

const NONE: ReligionRules = {
  levels: [],
  showHoroscope: false,
  showTemple: false,
  communityLabel: "Community",
};

export function getReligionRules(religionName?: string | null): ReligionRules {
  if (!religionName) return NONE;
  return RULES[religionName.trim()] ?? NONE;
}

export const isHindu = (religionName?: string | null): boolean =>
  (religionName ?? "").trim() === HINDU;

/** Convenience: is a given cascade level visible for this religion? */
export function showsLevel(religionName: string | null | undefined, level: CulturalLevel): boolean {
  return getReligionRules(religionName).levels.includes(level);
}

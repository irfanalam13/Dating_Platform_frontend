// Option lists for the structured profile / preference fields.
// Values MUST match the backend choice values in:
//   dating_backend/django/apps/profiles/models/profile.py
//   dating_backend/django/apps/preferences/models.py
// (and the canonical src/shared/schema/profileSchema.json).

export type Option = { value: string; label: string };

// export const RELIGIOUS_PRACTICE_OPTIONS: Option[] = [
//   { value: "very_religious", label: "Very Religious" },
//   { value: "religious", label: "Religious" },
//   { value: "moderate", label: "Moderate" },
//   { value: "spiritual", label: "Spiritual" },
//   { value: "not_practicing", label: "Not Practicing" },
// ];

export const TEMPLE_ATTENDANCE_OPTIONS: Option[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "festivals_only", label: "Festivals Only" },
  { value: "rarely", label: "Rarely" },
];

export const MARRIAGE_TRADITION_OPTIONS: Option[] = [
  { value: "traditional", label: "Traditional / Arranged" },
  { value: "love", label: "Love Marriage" },
  { value: "love_cum_arranged", label: "Love-cum-Arranged" },
  { value: "court", label: "Court Marriage" },
  { value: "no_preference", label: "No Preference" },
];

export const DIET_OPTIONS: Option[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "eggetarian", label: "Eggetarian" },
  { value: "non_vegetarian", label: "Non-Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "jain_vegetarian", label: "Jain Vegetarian" },
];

export const FREQUENCY_OPTIONS: Option[] = [
  { value: "never", label: "Never" },
  { value: "occasionally", label: "Occasionally" },
  { value: "frequently", label: "Frequently" },
];

export const EDUCATION_LEVEL_OPTIONS: Option[] = [
  { value: "high_school", label: "High School" },
  { value: "diploma", label: "Diploma" },
  { value: "bachelor", label: "Bachelor's" },
  { value: "master", label: "Master's" },
  { value: "phd", label: "PhD" },
  { value: "other", label: "Other" },
];

export const INDUSTRY_OPTIONS: Option[] = [
  { value: "it_software", label: "IT / Software" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education" },
  { value: "government", label: "Government / Public" },
  { value: "business_finance", label: "Business / Finance" },
  { value: "engineering", label: "Engineering" },
  { value: "arts_media", label: "Arts / Media" },
  { value: "agriculture", label: "Agriculture" },
  { value: "hospitality", label: "Hospitality" },
  { value: "self_employed", label: "Self-employed" },
  { value: "student", label: "Student" },
  { value: "other", label: "Other" },
];

export const INCOME_RANGE_OPTIONS: Option[] = [
  { value: "below_2_5l", label: "Below 2.5 L" },
  { value: "2_5_to_5l", label: "2.5 - 5 L" },
  { value: "5_to_10l", label: "5 - 10 L" },
  { value: "10_to_20l", label: "10 - 20 L" },
  { value: "above_20l", label: "20 L+" },
  { value: "prefer_not", label: "Prefer not to say" },
];

// export const FAMILY_TYPE_OPTIONS: Option[] = [
//   { value: "joint", label: "Joint" },
//   { value: "nuclear", label: "Nuclear" },
// ];

// export const FAMILY_VALUES_OPTIONS: Option[] = [
//   { value: "traditional", label: "Traditional" },
//   { value: "moderate", label: "Moderate" },
//   { value: "liberal", label: "Liberal" },
// ];

export const IMPORTANCE_OPTIONS: Option[] = [
  { value: "very_important", label: "Very Important" },
  { value: "important", label: "Important" },
  { value: "flexible", label: "Flexible" },
  { value: "not_important", label: "Not Important" },
];

export const RELATIONSHIP_GOAL_OPTIONS: Option[] = [
  { value: "dating", label: "Dating" },
  { value: "serious", label: "Serious Relationship" },
  { value: "marriage", label: "Marriage" },
  { value: "marriage_family", label: "Marriage & Family" },
  { value: "friendship", label: "Friendship" },
];

// export const WANTS_CHILDREN_OPTIONS: Option[] = [
//   { value: "yes", label: "Yes" },
//   { value: "no", label: "No" },
//   { value: "undecided", label: "Undecided" },
// ];

// export const NATIONALITY_OPTIONS: Option[] = [
//   { value: "nepali", label: "Nepali" },
//   { value: "indian", label: "Indian" },
//   { value: "other", label: "Other" },
// ];

// export const CITIZENSHIP_OPTIONS: Option[] = [
//   { value: "nepali", label: "Nepali" },
//   { value: "indian", label: "Indian" },
//   { value: "dual", label: "Dual" },
//   { value: "other", label: "Other" },
// ];

export const GOTRA_RULE_OPTIONS: Option[] = [
  { value: "must_differ", label: "Must Differ (no same gotra)" },
  { value: "same_ok", label: "Same Gotra OK" },
  { value: "no_preference", label: "No Preference" },
];

export const LANGUAGE_OPTIONS: string[] = [
  "Nepali", "Hindi", "Maithili", "Bhojpuri", "Tharu", "Newari", "Tamang",
  // "Gurung", "Magar", "Limbu", "English", "Bengali", "Tamil", "Telugu",
  // "Kannada", "Malayalam", "Marathi", "Gujarati", "Punjabi", "Urdu", "Other",
];

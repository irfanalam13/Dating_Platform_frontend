export interface ProfileImage {
  id: number;
  url: string;
  image_type: "profile" | "gallery" | "verification";
  is_primary: boolean;
  uploaded_at: string;
}

export interface Profile {
  id: number;
  user: number;
  full_name: string;
  bio: string;
  city: string;
  age: number;
  gender: string;
  date_of_birth: string | null;

  // relationship_intent: string;
  education: string;
  career: string;
  values: string;

  hobbies: string;
  preferences: string;

  religion?: number | null;
  religion_name?: string;
  caste?: number | null;
  caste_name?: string;
  gotra?: number | null;
  gotra_name?: string;

  ethnicity: string;

  horoscope: string;

  // Legacy field (local file upload)
  profile_image: string | null;

  // Cloudinary URL (resolved by serializer)
  profile_image_url: string | null;

  is_complete: boolean;
  is_profile_public: boolean;
  // True when the account is private — shown in the deck but with a blurred photo.
  is_private?: boolean;
  verified: boolean;

  compatibility_tags?: string[]; // Add this line

  created_at: string;
  updated_at: string;
}

export interface ProfileStats {
  likes: number;
  matches: number;
  views: number;
}

export interface ProfileSettings {
  discoverable: boolean;
  show_online_status: boolean;
  show_distance: boolean;
  is_private: boolean;
}

export interface DiscoverResponse {
  results: Profile[];
}

export interface MatchResponse {
  message: string;
  matched: boolean;
  match_id?: number;
}

export interface ImageListResponse {
  count: number;
  images: ProfileImage[];
}


// types/profile.ts

export type SocialPlatform =
  | "instagram"
  | "spotify"
  | "linkedin"
  | "twitter"
  | "facebook"
  | "snapchat"
  | "tiktok"
  | "other";

export interface SocialLink {
  id: number;
  platform: SocialPlatform;
  url: string;
  created_at: string;
  updated_at: string;
}

// shared/types/profile.types.ts

export interface PublicProfile {
  id: number;
  user: number;
  full_name: string;
  bio: string;
  city: string | null;
  profile_image_url: string | null;
  age: number;
  gender: string | null;
  // relationship_intent: string;
  education: string;
  career: string;
  values: string;
  hobbies: string;
  ethnicity: string;

  horoscope: string;
  religion_name?: string;
  caste_name?: string;
  gotra_name?: string;
  is_profile_public: boolean;
  verified: boolean;
  is_online?: boolean;
  // social_links added later when backend is ready
  social_links?: { platform: string; url: string }[];
}

export interface SocialLinkPayload {
  platform: SocialPlatform;
  url: string;
}

export interface BulkSocialLinkPayload {
  links: SocialLinkPayload[];
}
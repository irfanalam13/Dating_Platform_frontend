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

  relationship_intent: string;
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
  gan: string;
  horoscope: string;

  // Legacy field (local file upload)
  profile_image: string | null;

  // Cloudinary URL (resolved by serializer)
  profile_image_url: string | null;

  is_complete: boolean;
  is_profile_public: boolean;
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

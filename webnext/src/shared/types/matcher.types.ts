// src/shared/types/matcher.types.ts

export interface AcceptedMatch {
  id: number;
  user_id: number;
  email: string;
  name: string;
  profile_id: number | null;
  profile_image: string | null;
}

export interface PendingMatch {
  id: number;
  sender?: string;   // ⚠️ likely a user id or email — add console.log to confirm
  receiver?: string;
  status: string;
  // Backend should set one of these when the interest was a "superstar"
  // (double-tap) rather than a normal like. Until then it reads as a like.
  type?: "like" | "superstar" | string;
  is_super?: boolean;
}


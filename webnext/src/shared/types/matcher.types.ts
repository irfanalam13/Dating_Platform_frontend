// src/shared/types/matcher.types.ts

export interface AcceptedMatch {
  id: number;
  user_id: number;
  email: string;
  name: string;
  profile_id: number | null;
  profile_image: string | null;
}

/** Shape returned by /matcher/sent/ and /matcher/received/ (nested user card). */
export interface MatchRequestItem {
  id: number;
  status: string;
  match_percentage: number | null;
  sent_date: string;
  expires_at: string | null;
  user: {
    user_id: number;
    email: string;
    name: string;
    profile_id: number | null;
    profile_image: string | null;
  };
}

// /matcher/received/ returns the same rich card as /matcher/sent/ — the sender's
// full profile (name + photo + match %), not a bare id. They share one shape.
export type PendingMatch = MatchRequestItem;


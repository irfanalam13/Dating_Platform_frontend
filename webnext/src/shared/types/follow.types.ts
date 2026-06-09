export interface FollowUser {
  user_id: number;
  email: string;
  name: string;
  profile_id: number | null;
  profile_image: string | null;
}

export interface FollowRequest {
  id: string;
  follower: FollowUser;
  status: string;
  created_at: string;
}

export interface SavedProfileEntry {
  id: string;
  profile: FollowUser;
  note: string;
  created_at: string;
}

export interface LimitOffsetPage<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface FollowState {
  status: string;
  pending: boolean;
}

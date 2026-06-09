import api from "./client";
import type {
  FollowUser, FollowRequest, SavedProfileEntry, LimitOffsetPage, FollowState,
} from "@/shared/types/follow.types";

// ── Follow / unfollow ──────────────────────────────────────

/** POST /engagement/follow/:userId/ — idempotent; returns follow state. */
export const followUser = async (userId: number): Promise<FollowState> => {
  const res = await api.post(`/engagement/follow/${userId}/`);
  return res.data;
};

export const unfollowUser = async (userId: number): Promise<void> => {
  await api.delete(`/engagement/follow/${userId}/`);
};

export const removeFollower = async (userId: number): Promise<void> => {
  await api.delete(`/engagement/followers/${userId}/remove/`);
};

// ── Lists ──────────────────────────────────────────────────

export const getFollowers = async (userId: number): Promise<LimitOffsetPage<FollowUser>> => {
  const res = await api.get(`/engagement/users/${userId}/followers/`, { params: { limit: 100 } });
  return res.data;
};

export const getFollowing = async (userId: number): Promise<LimitOffsetPage<FollowUser>> => {
  const res = await api.get(`/engagement/users/${userId}/following/`, { params: { limit: 100 } });
  return res.data;
};

// ── Follow requests (private accounts) ─────────────────────

export const getFollowRequests = async (): Promise<LimitOffsetPage<FollowRequest>> => {
  const res = await api.get(`/engagement/follow-requests/`);
  return res.data;
};

export const actOnFollowRequest = async (
  followId: string,
  action: "accept" | "reject"
): Promise<{ status?: string }> => {
  const res = await api.post(`/engagement/follow-requests/${followId}/${action}/`);
  return res.data ?? {};
};

// ── Saved profiles ─────────────────────────────────────────

export const getSavedProfiles = async (): Promise<LimitOffsetPage<SavedProfileEntry>> => {
  const res = await api.get(`/engagement/saved/`);
  return res.data;
};

export const saveProfileUser = async (userId: number): Promise<SavedProfileEntry> => {
  const res = await api.post(`/engagement/saved/${userId}/`);
  return res.data;
};

export const unsaveProfileUser = async (userId: number): Promise<void> => {
  await api.delete(`/engagement/saved/${userId}/delete/`);
};

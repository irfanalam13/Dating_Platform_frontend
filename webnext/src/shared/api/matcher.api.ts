

import api from "./client";
import type { AcceptedMatch, PendingMatch } from "../types/matcher.types";

export const getAcceptedMatches = async (): Promise<AcceptedMatch[]> => {
  const res = await api.get("/matcher/accepted/");
  console.log("✅ ACCEPTED:", res.data); // ← remove after confirming shape
  return Array.isArray(res.data) ? res.data : res.data?.results ?? [];
};

export const getReceivedMatches = async (): Promise<PendingMatch[]> => {
  const res = await api.get("/matcher/received/");
  console.log("📥 RECEIVED:", res.data); // ← remove after confirming shape
  return Array.isArray(res.data) ? res.data : res.data?.results ?? [];
};

export const acceptMatch = async (matchId: number): Promise<{ message: string }> => {
  const res = await api.post(`/matcher/accept/${matchId}/`);
  return res.data;
};

export const rejectMatch = async (matchId: number): Promise<{ message: string }> => {
  const res = await api.post(`/matcher/reject/${matchId}/`);
  return res.data;
};
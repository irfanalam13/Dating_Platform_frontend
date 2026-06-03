import api from "./client";
import type { AcceptedMatch, PendingMatch } from "../types/matcher.types";

// Tolerates both a bare list and a DRF-paginated { results: [...] } envelope.
export const getAcceptedMatches = async (): Promise<AcceptedMatch[]> => {
  const res = await api.get("/matcher/accepted/");
  return Array.isArray(res.data) ? res.data : res.data?.results ?? [];
};

export const getReceivedMatches = async (): Promise<PendingMatch[]> => {
  const res = await api.get("/matcher/received/");
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
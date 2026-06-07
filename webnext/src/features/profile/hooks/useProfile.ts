import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyProfile,
  getPublicProfile,
  updateProfile,
  getMySocialLinks,
  upsertSocialLink,
  bulkUpsertSocialLinks,
  deleteSocialLink,
} from "@/shared/api/profile.api";
import type {
  PublicProfile,
  SocialLink,
  SocialLinkPayload,
  BulkSocialLinkPayload,
} from "@/shared/types/profile.types";

// ── My Profile ─────────────────────────────────────────────

export const useMyProfile = () => {
  return useQuery({
    queryKey: ["myProfile"],
    queryFn: getMyProfile,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
};

// ── Other User Profile (React Query) ──────────────────────

export const useUserProfile = (userId: number) => {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getPublicProfile(userId),
    enabled: !!userId,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
};

// ── Update Profile ─────────────────────────────────────────

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myProfile"] });
    },
  });
};

// ── Public Profile Hook ────────────────────────────────────

interface UsePublicProfileReturn {
  profile: PublicProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePublicProfile(userId: number): UsePublicProfileReturn {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPublicProfile(userId);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  return { profile, loading, error, refetch: load };
}

// ── Social Links Hook ──────────────────────────────────────

interface UseSocialLinksReturn {
  links: SocialLink[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  upsert: (payload: SocialLinkPayload) => Promise<void>;
  bulkUpsert: (payload: BulkSocialLinkPayload) => Promise<void>;
  remove: (linkId: number) => Promise<void>;
  refetch: () => void;
}

export function useSocialLinks(): UseSocialLinksReturn {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMySocialLinks();
      setLinks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load social links.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upsert = async (payload: SocialLinkPayload) => {
    setSaving(true);
    try {
      const updated = await upsertSocialLink(payload);
      setLinks((prev) => {
        const exists = prev.find((l) => l.platform === updated.platform);
        return exists
          ? prev.map((l) => (l.platform === updated.platform ? updated : l))
          : [...prev, updated];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save link.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const bulkUpsert = async (payload: BulkSocialLinkPayload) => {
    setSaving(true);
    try {
      const updated = await bulkUpsertSocialLinks(payload);
      setLinks(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save links.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const remove = async (linkId: number) => {
    setSaving(true);
    try {
      await deleteSocialLink(linkId);
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete link.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return { links, loading, error, saving, upsert, bulkUpsert, remove, refetch: load };
}
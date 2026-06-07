// src/features/preference/hooks/usePreference.ts

import { useState, useEffect, useCallback } from "react";
import {
  getPreferences,
  updatePreferences,
  getReligions,
  getCastes,
  getGotras,
  getCommunities,
  getCasteCategories,
  getCastesV2,
  getSubCastes,
  getClans,
  getGotrasV2,
} from "../../../shared/api/preference.api";
import type {
  Preferences,
  PreferencesPayload,
  Religion,
  Caste,
  Gotra,
  Community,
  CasteCategory,
  CasteV2,
  SubCaste,
  Clan,
  GotraV2,
} from "../../../shared/types/preference.types";


// ─────────────────────────────────────────
// usePreferences — fetch & update
// ─────────────────────────────────────────

export const usePreferences = () => {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPreferences();
      setPreferences(data);
    } catch {
      setError("Failed to load preferences.");
    } finally {
      setLoading(false);
    }
  }, []);

  const savePreferences = useCallback(async (payload: PreferencesPayload) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updatePreferences(payload);
      setPreferences(updated);
      return updated;
    } catch {
      setError("Failed to save preferences.");
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    saving,
    error,
    fetchPreferences,
    savePreferences,
  };
};


// ─────────────────────────────────────────
// useReligions — all religions dropdown
// ─────────────────────────────────────────

export const useReligions = () => {
  const [religions, setReligions] = useState<Religion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getReligions();
        setReligions(data);
      } catch {
        setError("Failed to load religions.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { religions, loading, error };
};


// ─────────────────────────────────────────
// useCastes — filtered by selected religion
// ─────────────────────────────────────────

export const useCastes = (religionId: number | null) => {
  const [castes, setCastes] = useState<Caste[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!religionId) {
      setCastes([]);
      return;
    }
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getCastes(religionId);
        setCastes(data);
      } catch {
        setError("Failed to load castes.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [religionId]);

  return { castes, loading, error };
};


// ─────────────────────────────────────────
// useGotras — filtered by selected caste
// ─────────────────────────────────────────

export const useGotras = (casteId: number | null) => {
  const [gotras, setGotras] = useState<Gotra[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!casteId) {
      setGotras([]);
      return;
    }
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getGotras(casteId);
        setGotras(data);
      } catch {
        setError("Failed to load gotras.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [casteId]);

  return { gotras, loading, error };
};


// ─────────────────────────────────────────
// Deep-taxonomy cascade hooks. Each fetches its level filtered by the parent id,
// and clears when the parent is unset — identical behaviour to useCastes above.
// ─────────────────────────────────────────

const useCascadeLevel = <T,>(
  parentId: number | null,
  fetcher: (id: number) => Promise<T[]>,
  errorLabel: string,
) => {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!parentId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const data = await fetcher(parentId);
        if (!cancelled) setItems(data);
      } catch {
        if (!cancelled) setError(`Failed to load ${errorLabel}.`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [parentId, fetcher, errorLabel]);

  return { items, loading, error };
};

export const useCommunities = (religionId: number | null) => {
  const { items, loading, error } = useCascadeLevel<Community>(religionId, getCommunities, "communities");
  return { communities: items, loading, error };
};

export const useCasteCategories = (communityId: number | null) => {
  const { items, loading, error } = useCascadeLevel<CasteCategory>(communityId, getCasteCategories, "caste categories");
  return { casteCategories: items, loading, error };
};

export const useCastesV2 = (categoryId: number | null) => {
  const { items, loading, error } = useCascadeLevel<CasteV2>(categoryId, getCastesV2, "castes");
  return { castesV2: items, loading, error };
};

export const useSubCastes = (casteId: number | null) => {
  const { items, loading, error } = useCascadeLevel<SubCaste>(casteId, getSubCastes, "sub-castes");
  return { subCastes: items, loading, error };
};

export const useClans = (subCasteId: number | null) => {
  const { items, loading, error } = useCascadeLevel<Clan>(subCasteId, getClans, "clans");
  return { clans: items, loading, error };
};

export const useGotrasV2 = (clanId: number | null) => {
  const { items, loading, error } = useCascadeLevel<GotraV2>(clanId, getGotrasV2, "gotras");
  return { gotras: items, loading, error };
};

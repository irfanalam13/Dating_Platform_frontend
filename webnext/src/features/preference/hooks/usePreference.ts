// src/features/preference/hooks/usePreference.ts

import { useState, useEffect, useCallback } from "react";
import {
  getPreferences,
  updatePreferences,
  getReligions,
  getCastes,
  getGotras,
} from "../../../shared/api/preference.api";
import type {
  Preferences,
  PreferencesPayload,
  Religion,
  Caste,
  Gotra,
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

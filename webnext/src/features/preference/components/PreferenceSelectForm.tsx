// features/preference/components/PreferenceSelectForm.tsx

import { useState, useEffect } from "react";
import { usePreferences, useReligions, useCastes, useGotras } from "../hooks/usePreference";
import type { PreferencesPayload } from "../../../shared/types/preference.types";

const HOROSCOPE_OPTIONS = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
];

const HOBBY_OPTIONS = [
  "Reading","Travel","Cooking","Music","Sports",
  "Art","Fitness","Photography","Gaming","Yoga",
];

const GAN_OPTIONS = ["Deva","Manushya","Rakshasa"];

export const PreferenceSelectForm = () => {
  const { preferences, saving, savePreferences } = usePreferences();
  const { religions } = useReligions();

  const [selectedReligion, setSelectedReligion] = useState<number | null>(null);
  const [selectedCaste, setSelectedCaste] = useState<number | null>(null);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);

  const { castes } = useCastes(selectedReligion);
  const { gotras } = useGotras(selectedCaste);

  const [form, setForm] = useState<PreferencesPayload>({
    min_age: 18,
    max_age: 50,
    preferred_gender: "",
    preferred_city: "",
    max_distance_km: 50,
    preferred_religion: null,
    preferred_caste: null,
    preferred_gotra: null,
    preferred_relationship_intent: "",
    preferred_education: "",
    preferred_ethnicity: "",
    preferred_horoscope: "",
    preferred_gan: "",
    preferred_hobbies: "",
    preferred_preferences: "",
  });

  // Populate form from fetched preferences
  useEffect(() => {
    if (!preferences) return;
    setForm({
      min_age: preferences.min_age,
      max_age: preferences.max_age,
      preferred_gender: preferences.preferred_gender,
      preferred_city: preferences.preferred_city,
      max_distance_km: preferences.max_distance_km,
      preferred_religion: preferences.preferred_religion,
      preferred_caste: preferences.preferred_caste,
      preferred_gotra: preferences.preferred_gotra,
      preferred_relationship_intent: preferences.preferred_relationship_intent,
      preferred_education: preferences.preferred_education,
      preferred_ethnicity: preferences.preferred_ethnicity,
      preferred_horoscope: preferences.preferred_horoscope,
      preferred_gan: preferences.preferred_gan,
      preferred_hobbies: preferences.preferred_hobbies,
      preferred_preferences: preferences.preferred_preferences,
    });
    setSelectedReligion(preferences.preferred_religion);
    setSelectedCaste(preferences.preferred_caste);
    setSelectedHobbies(
      preferences.preferred_hobbies
        ? preferences.preferred_hobbies.split(",").map(h => h.trim())
        : []
    );
  }, [preferences]);

  const set = (key: keyof PreferencesPayload, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const toggleHobby = (hobby: string) => {
    setSelectedHobbies(prev => {
      const updated = prev.includes(hobby)
        ? prev.filter(h => h !== hobby)
        : [...prev, hobby];
      set("preferred_hobbies", updated.join(","));
      return updated;
    });
  };

  const handleSave = async () => {
    await savePreferences(form);
  };

  return (
    <div className="flex flex-col gap-4 p-4">

      {/* Basic criteria */}
      <div className="card">
        <h3>Basic criteria</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label>Gender</label>
            <select value={form.preferred_gender} onChange={e => set("preferred_gender", e.target.value)}>
              <option value="">Any</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label>City</label>
            <input value={form.preferred_city} onChange={e => set("preferred_city", e.target.value)} placeholder="e.g. Kathmandu" />
          </div>
          <div>
            <label>Max distance (km)</label>
            <select value={form.max_distance_km} onChange={e => set("max_distance_km", Number(e.target.value))}>
              <option value={10}>Within 10 km</option>
              <option value={25}>Within 25 km</option>
              <option value={50}>Within 50 km</option>
              <option value={100}>Within 100 km</option>
            </select>
          </div>
        </div>

        {/* Age range */}
        <div className="mt-3">
          <label>Min age: {form.min_age}</label>
          <input type="range" min={18} max={60} step={1}
            value={form.min_age}
            onChange={e => set("min_age", Number(e.target.value))}
          />
          <label>Max age: {form.max_age}</label>
          <input type="range" min={18} max={60} step={1}
            value={form.max_age}
            onChange={e => set("max_age", Number(e.target.value))}
          />
        </div>
      </div>

      {/* Cultural */}
      <div className="card">
        <h3>Cultural background</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label>Religion</label>
            <select
              value={form.preferred_religion ?? ""}
              onChange={e => {
                const val = e.target.value ? Number(e.target.value) : null;
                set("preferred_religion", val);
                set("preferred_caste", null);
                set("preferred_gotra", null);
                setSelectedReligion(val);
                setSelectedCaste(null);
              }}
            >
              <option value="">Any</option>
              {religions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label>Caste</label>
            <select
              value={form.preferred_caste ?? ""}
              disabled={!selectedReligion}
              onChange={e => {
                const val = e.target.value ? Number(e.target.value) : null;
                set("preferred_caste", val);
                set("preferred_gotra", null);
                setSelectedCaste(val);
              }}
            >
              <option value="">Any</option>
              {castes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label>Gotra</label>
            <select
              value={form.preferred_gotra ?? ""}
              disabled={!selectedCaste}
              onChange={e => set("preferred_gotra", e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Any</option>
              {gotras.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Lifestyle */}
      <div className="card">
        <h3>Lifestyle & values</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label>Relationship intent</label>
            <select value={form.preferred_relationship_intent} onChange={e => set("preferred_relationship_intent", e.target.value)}>
              <option value="">Any</option>
              <option value="marriage">Marriage</option>
              <option value="long_term">Long-term</option>
              <option value="friendship">Friendship</option>
              <option value="not_sure">Not sure yet</option>
            </select>
          </div>
          <div>
            <label>Education</label>
            <select value={form.preferred_education} onChange={e => set("preferred_education", e.target.value)}>
              <option value="">Any</option>
              <option value="high_school">High school</option>
              <option value="bachelor">Bachelor's</option>
              <option value="master">Master's</option>
              <option value="phd">PhD</option>
            </select>
          </div>
          <div>
            <label>Ethnicity</label>
            <input value={form.preferred_ethnicity} onChange={e => set("preferred_ethnicity", e.target.value)} placeholder="e.g. Nepali" />
          </div>
        </div>
      </div>

      {/* Horoscope & personality */}
      <div className="card">
        <h3>Horoscope & personality</h3>

        <div className="mb-3">
          <label>Horoscope sign</label>
          <select value={form.preferred_horoscope} onChange={e => set("preferred_horoscope", e.target.value)}>
            <option value="">Any sign</option>
            {HOROSCOPE_OPTIONS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>

        <div className="mb-3">
          <label>Gan</label>
          <select value={form.preferred_gan} onChange={e => set("preferred_gan", e.target.value)}>
            <option value="">Any</option>
            {GAN_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div>
          <label>Hobbies</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {HOBBY_OPTIONS.map(hobby => (
              <button
                key={hobby}
                onClick={() => toggleHobby(hobby)}
                className={selectedHobbies.includes(hobby) ? "tag active" : "tag"}
              >
                {hobby}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save preferences"}
      </button>

    </div>
  );
};

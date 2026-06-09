"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Sparkles } from "lucide-react";
import { useMyProfile, useUpdateProfile } from "@/features/profile/hooks/useProfile";
import { useReligions, useCastes, useGotras } from "@/features/preference/hooks/usePreference";
import { updatePreferences } from "@/shared/api/preference.api";
import type { PreferencesPayload } from "@/shared/types/preference.types";
import { showError, showSuccess } from "@/shared/utils/toast";

type PreferenceScope = "your_hobbies" | "partners_type";

// Religion / caste / gotra are foreign keys on the backend, so we keep both the
// id (sent to the API) and the name (shown in the chip + stored in the JSON blob
// that repopulates this form on the next visit).
type ChoiceForm = {
  religion: string;
  religion_id: number | null;
  caste: string;
  caste_id: number | null;
  gotra: string;
  gotra_id: number | null;
  horoscope: string;

  preferences: string;
  hobbies: string;
};

type Filters = {
  preferred_gender: string;
  preferred_city: string;
  max_distance_km: number;
  min_age: number;
  max_age: number;
  preferred_education: string;
};

type PreferencePayload = {
  your_hobbies: ChoiceForm;
  partners_type: ChoiceForm;
  filters: Filters;
};

const emptyForm = (): ChoiceForm => ({
  religion: "",
  religion_id: null,
  caste: "",
  caste_id: null,
  gotra: "",
  gotra_id: null,
  horoscope: "",
  preferences: "",
  hobbies: "",
});

const emptyFilters = (): Filters => ({
  preferred_gender: "",
  preferred_city: "",
  max_distance_km: 50,
  min_age: 18,
  max_age: 60,
  preferred_education: "",
});

const GENDER_OPTIONS = [
  { value: "", label: "Any" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const DISTANCE_OPTIONS = [
  { value: 10, label: "Within 10 km" },
  { value: 25, label: "Within 25 km" },
  { value: 50, label: "Within 50 km" },
  { value: 100, label: "Within 100 km" },
];

const EDUCATION_OPTIONS = [
  { value: "", label: "Any" },
  { value: "high_school", label: "High school" },
  { value: "bachelor", label: "Bachelor's" },
  { value: "master", label: "Master's" },
  { value: "phd", label: "PhD" },
];

const HOROSCOPE_OPTIONS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];



function toPayload(input?: string): PreferencePayload {
  if (!input || !input.trim()) {
    return { your_hobbies: emptyForm(), partners_type: emptyForm(), filters: emptyFilters() };
  }

  try {
    const parsed = JSON.parse(input) as Partial<PreferencePayload>;
    const parsedFilters = parsed.filters ?? {};
    return {
      your_hobbies: { ...emptyForm(), ...(parsed.your_hobbies ?? {}) },
      partners_type: { ...emptyForm(), ...(parsed.partners_type ?? {}) },
      filters: {
        ...emptyFilters(),
        ...parsedFilters,
        max_age: typeof parsedFilters.max_age === 'number' && parsedFilters.max_age > 0 ? parsedFilters.max_age : 60,
        min_age: typeof parsedFilters.min_age === 'number' && parsedFilters.min_age > 0 ? parsedFilters.min_age : 18,
      },
    };
  } catch {
    return { your_hobbies: emptyForm(), partners_type: emptyForm(), filters: emptyFilters() };
  }
}

export default function PreferencesPage() {
  const router = useRouter();
  const { data } = useMyProfile();
  const updateMutation = useUpdateProfile();
  const [submitting, setSubmitting] = useState(false);

  const [activeScope, setActiveScope] = useState<PreferenceScope>("your_hobbies");
  const [saved, setSaved] = useState(false);
  const [formState, setFormState] = useState<PreferencePayload>({
    your_hobbies: emptyForm(),
    partners_type: emptyForm(),
    filters: emptyFilters(),
  });

  // Preferences were saved on a previous visit → show the "shortly" banner.
  const hasSavedPrefs = Boolean(data?.preferences && data.preferences.trim());

  useEffect(() => {
    if (!data) return;
    setFormState(toPayload(data.preferences));
  }, [data]);

  const current = formState[activeScope];
  const filters = formState.filters;

  // Cultural dropdowns cascade off the *active* tab's selections:
  // religion → its castes → that caste's gotras. Selecting "Hindu" therefore
  // only ever offers Hindu castes, never castes from other religions.
  const { religions, loading: religionsLoading } = useReligions();
  const { castes, loading: castesLoading } = useCastes(current.religion_id);
  const { gotras, loading: gotrasLoading } = useGotras(current.caste_id);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFormState((prev) => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
    }));
  };

  // String chips (horoscope) — toggle on/off.
  const setChoice = (key: "horoscope", value: string) => {
    setFormState((prev) => ({
      ...prev,
      [activeScope]: {
        ...prev[activeScope],
        [key]: prev[activeScope][key] === value ? "" : value,
      },
    }));
  };

  // Religion chip — toggles, and clears the dependent caste + gotra when it changes.
  const selectReligion = (id: number, name: string) => {
    setFormState((prev) => {
      const scope = prev[activeScope];
      const same = scope.religion_id === id;
      return {
        ...prev,
        [activeScope]: {
          ...scope,
          religion: same ? "" : name,
          religion_id: same ? null : id,
          caste: "",
          caste_id: null,
          gotra: "",
          gotra_id: null,
        },
      };
    });
  };

  // Caste chip — toggles, and clears the dependent gotra when it changes.
  const selectCaste = (id: number, name: string) => {
    setFormState((prev) => {
      const scope = prev[activeScope];
      const same = scope.caste_id === id;
      return {
        ...prev,
        [activeScope]: {
          ...scope,
          caste: same ? "" : name,
          caste_id: same ? null : id,
          gotra: "",
          gotra_id: null,
        },
      };
    });
  };

  const selectGotra = (id: number, name: string) => {
    setFormState((prev) => {
      const scope = prev[activeScope];
      const same = scope.gotra_id === id;
      return {
        ...prev,
        [activeScope]: {
          ...scope,
          gotra: same ? "" : name,
          gotra_id: same ? null : id,
        },
      };
    });
  };

  const setText = (key: "preferences" | "hobbies", value: string) => {
    setFormState((prev) => ({
      ...prev,
      [activeScope]: {
        ...prev[activeScope],
        [key]: value,
      },
    }));
  };

  const save = async () => {
    setSubmitting(true);

    // 1. "Your hobbies" describes YOU → write to your own profile so other
    //    people's filters can match you. The full form is also stored as the
    //    `preferences` JSON blob so this screen repopulates on the next visit.
    const yh = formState.your_hobbies;
    const formData = new FormData();
    const stateToSave = { ...formState, partners_type: formState.your_hobbies };
    formData.append("preferences", JSON.stringify(stateToSave));
    if (yh.religion_id != null) formData.append("religion", String(yh.religion_id));
    if (yh.caste_id != null) formData.append("caste", String(yh.caste_id));
    if (yh.gotra_id != null) formData.append("gotra", String(yh.gotra_id));
    if (yh.horoscope) formData.append("horoscope", yh.horoscope);

    if (yh.hobbies) formData.append("hobbies", yh.hobbies);

    // 2. "Partner's type" + match filters describe what you WANT → write to the
    //    preferences the matcher's My-Type deck filters on.
    const pt = formState.your_hobbies;
    const f = formState.filters;
    const prefsPayload: PreferencesPayload = {
      min_age: f.min_age,
      max_age: f.max_age,
      preferred_gender: f.preferred_gender as PreferencesPayload["preferred_gender"],
      preferred_city: f.preferred_city,
      max_distance_km: f.max_distance_km,
      preferred_education: f.preferred_education,
      preferred_religion: pt.religion_id,
      preferred_caste: pt.caste_id,
      preferred_gotra: pt.gotra_id,
      preferred_horoscope: pt.horoscope,

      preferred_hobbies: pt.hobbies,
      preferred_preferences: pt.preferences,
    };

    try {
      await Promise.all([
        updateMutation.mutateAsync(formData),
        updatePreferences(prefsPayload),
      ]);
      showSuccess("Preferences saved.");
      // Persist a flag so "My Type" permanently shows the saved state.
      if (typeof window !== "undefined") localStorage.setItem("loviq_prefs_saved", "1");
      setSaved(true);
      // Show the success screen briefly, then head home.
      setTimeout(() => router.push("/home"), 1500);
    } catch (error) {
      showError(error, "Could not save preferences.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen shown right after saving ──
  if (saved) {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-6 text-center text-[#2D2424]">
        <div className="max-w-sm">
          <Sparkles className="mx-auto mb-4 h-12 w-12 text-[#B78A3B]" />
          <h2 className="text-lg font-semibold tracking-[0.04em]">
            YOUR PREFERRED PARTNER WILL BE HERE SHORTLY
          </h2>
          <p className="mt-2 text-sm text-[#746767]">Preferences saved. Taking you home…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] px-4 pb-28 pt-4 text-[#2D2424]">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-5 rounded-full border border-white/55 bg-white/55 px-4 py-3 shadow-[0_8px_24px_rgba(16,24,40,0.10)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Go back"
              className="glass-btn grid h-10 w-10 shrink-0 place-items-center rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#B78A3B]">F I L T E R</p>
              <h1 className="text-lg font-semibold">Preferences</h1>
            </div>
          </div>
        </header>

        {hasSavedPrefs && (
          <div className="mb-4 flex items-center gap-3 rounded-3xl border border-white/60 bg-white/40 p-4 shadow-[0_10px_30px_rgba(16,24,40,0.08)] backdrop-blur-md">
            <Sparkles className="h-5 w-5 shrink-0 text-[#B78A3B]" />
            <p className="text-sm font-semibold tracking-[0.03em]">
              YOUR PREFERRED PARTNER WILL BE HERE SHORTLY
            </p>
          </div>
        )}


        <section className="mb-4 space-y-5 rounded-3xl border border-white/60 bg-white/40 p-4 shadow-[0_10px_30px_rgba(16,24,40,0.08)] backdrop-blur-md">
          <div>
            <h2 className="text-[22px] font-semibold leading-none">Match filters</h2>
            <p className="mt-1 text-xs text-[#746767]">Applies to everyone we recommend.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Gender"
              value={filters.preferred_gender}
              onChange={(value) => setFilter("preferred_gender", value)}
              options={GENDER_OPTIONS}
            />

            <TextField
              label="City"
              value={filters.preferred_city}
              onChange={(value) => setFilter("preferred_city", value)}
              placeholder="e.g. Kathmandu"
            />

            <SelectField
              label="Max distance"
              value={String(filters.max_distance_km)}
              onChange={(value) => setFilter("max_distance_km", Number(value))}
              options={DISTANCE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
            />

            <SelectField
              label="Education"
              value={filters.preferred_education}
              onChange={(value) => setFilter("preferred_education", value)}
              options={EDUCATION_OPTIONS}
            />
          </div>

          <RangeField
            label="Min age"
            value={filters.min_age}
            min={18}
            max={60}
            onChange={(value) => setFilter("min_age", Math.min(value, filters.max_age))}
          />

          <RangeField
            label="Max age"
            value={filters.max_age}
            min={18}
            max={60}
            onChange={(value) => setFilter("max_age", Math.max(value, filters.min_age))}
            reverseFill={true}
          />
        </section>

        <section className="space-y-5 rounded-3xl border border-white/60 bg-white/40 p-4 shadow-[0_10px_30px_rgba(16,24,40,0.08)] backdrop-blur-md">
          <CulturalChips
            title="Religion"
            options={religions}
            selectedId={current.religion_id}
            onSelect={selectReligion}
            loading={religionsLoading}
            emptyHint="No religions available."
          />

          <CulturalChips
            title="Caste"
            options={castes}
            selectedId={current.caste_id}
            onSelect={selectCaste}
            loading={castesLoading}
            emptyHint={current.religion_id ? "No castes found." : "Select a religion first."}
          />

          <CulturalChips
            title="Gotra"
            options={gotras}
            selectedId={current.gotra_id}
            onSelect={selectGotra}
            loading={gotrasLoading}
            emptyHint={current.caste_id ? "No gotras for this caste." : "Select a caste first."}
          />

          <ChipSection
            title="Horoscope"
            options={HOROSCOPE_OPTIONS}
            selected={current.horoscope}
            onSelect={(value) => setChoice("horoscope", value)}
          />

          <OpenQuestion
            label="Preferences"
            value={current.preferences}
            onChange={(value) => setText("preferences", value)}
            placeholder="Type your preference here"
          />

          <OpenQuestion
            label="Hobbies"
            value={current.hobbies}
            onChange={(value) => setText("hobbies", value)}
            placeholder="Type your hobbies"
          />

          <button
            onClick={save}
            disabled={submitting}
            style={{ backgroundColor: submitting ? "#A8D63A" : "#C5F04E", color: "#2D2424" }}
            className="mt-2 h-12 w-full rounded-full text-sm font-semibold shadow-[0_8px_24px_rgba(16,24,40,0.12)] transition hover:brightness-105 disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </section>
      </div>
    </main>
  );
}

// Same look as ChipSection, but options are id+name records from the API and
// selection is tracked by id (these map to backend foreign keys).
function CulturalChips({
  title,
  options,
  selectedId,
  onSelect,
  loading,
  emptyHint,
}: {
  title: string;
  options: { id: number; name: string }[];
  selectedId: number | null;
  onSelect: (id: number, name: string) => void;
  loading: boolean;
  emptyHint: string;
}) {
  return (
    <div>
      <h2 className="mb-2 text-[22px] font-semibold leading-none">{title}</h2>
      {options.length === 0 ? (
        <p className="text-sm text-[#746767]">{loading ? "Loading…" : emptyHint}</p>
      ) : (
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
          {options.map((option) => {
            const active = selectedId === option.id;
            return (
              <button
                key={option.id}
                onClick={() => onSelect(option.id, option.name)}
                style={
                  active
                     ? { backgroundColor: "#5FD08A", color: "#14532D" }
                     : { color: "#2D2424" }
                }
                className="glass-btn shrink-0 rounded-full px-4 py-2 text-sm font-medium transition"
              >
                {option.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChipSection({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <h2 className="mb-2 text-[22px] font-semibold leading-none">{title}</h2>
      <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
        {options.map((option) => {
          const active = selected === option;
          return (
            <button
              key={option}
              onClick={() => onSelect(option)}
              style={
                active
                  ? { backgroundColor: "#5FD08A", color: "#14532D" }
                  : { color: "#2D2424" }
              }
              className="glass-btn shrink-0 rounded-full px-4 py-2 text-sm font-medium transition"
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OpenQuestion({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xl font-semibold">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="glass-btn min-h-[86px] w-full rounded-2xl p-3 text-sm outline-none placeholder:text-[#9f9797]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#2D2424]">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="glass-btn h-11 w-full cursor-pointer appearance-none rounded-2xl pl-4 pr-10 text-sm font-medium text-[#2D2424] outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-white text-[#2D2424]">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#746767]" />
      </div>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#2D2424]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="glass-btn h-11 w-full rounded-2xl px-4 text-sm outline-none placeholder:text-[#9f9797]"
      />
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  onChange,
  reverseFill = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  reverseFill?: boolean;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-[#2D2424]">{label}</span>
        <span className="glass-btn rounded-full px-3 py-1 text-xs font-semibold text-[#7A2432]">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{
          background: reverseFill
            ? `linear-gradient(to right, rgba(255, 255, 255, 0.55) ${percentage}%, #7A2432 ${percentage}%)`
            : `linear-gradient(to right, #7A2432 ${percentage}%, rgba(255, 255, 255, 0.55) ${percentage}%)`
        }}
        className="h-2 w-full cursor-pointer appearance-none rounded-full accent-[#7A2432] shadow-[inset_0_1px_2px_rgba(16,24,40,0.12)]"
      />
    </div>
  );
}
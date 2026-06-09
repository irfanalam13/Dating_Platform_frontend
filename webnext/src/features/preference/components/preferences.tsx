"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Sparkles, X } from "lucide-react";
import { useMyProfile, useUpdateProfile } from "@/features/profile/hooks/useProfile";
import {
  useReligions,
  useCommunities,
  useCasteCategories,
  useCastesV2,
  useSubCastes,
  useClans,
  useGotrasV2,
} from "@/features/preference/hooks/usePreference";
import { updatePreferences } from "@/shared/api/preference.api";
import type { PreferencesPayload } from "@/shared/types/preference.types";
import {
  DIET_OPTIONS,
  FREQUENCY_OPTIONS,
  GOTRA_RULE_OPTIONS,
} from "@/shared/constants/profileOptions";
import { showError, showSuccess } from "@/shared/utils/toast";
import { getReligionRules } from "@/shared/constants/religionRules";

type PreferenceScope = "your_hobbies" | "partners_type";

// The seven cultural levels are foreign keys; we keep both the id (sent to the
// API) and the name (shown in the chip + stored in the JSON blob that
// repopulates this form on the next visit).
const LEVELS = [
  "religion",
  "community",
  "caste_category",
  "caste_v2",
  "sub_caste",
  "clan",
  "gotra_v2",
] as const;
type Level = (typeof LEVELS)[number];

type ChoiceForm = {
  religion: string; religion_id: number | null;
  community: string; community_id: number | null;
  caste_category: string; caste_category_id: number | null;
  caste_v2: string; caste_v2_id: number | null;
  sub_caste: string; sub_caste_id: number | null;
  clan: string; clan_id: number | null;
  gotra_v2: string; gotra_v2_id: number | null;
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
  preferred_min_height_cm: number | null;
  preferred_max_height_cm: number | null;
  preferred_diet: string[];
  preferred_alcohol: string;
  preferred_smoking: string;
  gotra_rule: string;
  accept_different_religion: boolean;
  accept_different_community: boolean;
  accept_different_caste: boolean;
  accept_different_gotra: boolean;
  deal_breakers: { must_have: string[]; nice_to_have: string[]; avoid: string[] };
};

type PreferencePayload = {
  your_hobbies: ChoiceForm;
  partners_type: ChoiceForm;
  filters: Filters;
};

const emptyForm = (): ChoiceForm => ({
  religion: "", religion_id: null,
  community: "", community_id: null,
  caste_category: "", caste_category_id: null,
  caste_v2: "", caste_v2_id: null,
  sub_caste: "", sub_caste_id: null,
  clan: "", clan_id: null,
  gotra_v2: "", gotra_v2_id: null,
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
  preferred_min_height_cm: null,
  preferred_max_height_cm: null,
  preferred_diet: [],
  preferred_alcohol: "",
  preferred_smoking: "",
  gotra_rule: "",
  accept_different_religion: true,
  accept_different_community: true,
  accept_different_caste: true,
  accept_different_gotra: true,
  deal_breakers: { must_have: [], nice_to_have: [], avoid: [] },
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
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];



const ANY_FREQUENCY = [{ value: "", label: "Any" }, ...FREQUENCY_OPTIONS];
const ANY_GOTRA_RULE = [{ value: "", label: "No preference" }, ...GOTRA_RULE_OPTIONS];

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
<<<<<<< HEAD
        ...parsedFilters,
        max_age: typeof parsedFilters.max_age === 'number' && parsedFilters.max_age > 0 ? parsedFilters.max_age : 60,
        min_age: typeof parsedFilters.min_age === 'number' && parsedFilters.min_age > 0 ? parsedFilters.min_age : 18,
=======
        ...(parsed.filters ?? {}),
        deal_breakers: { ...emptyFilters().deal_breakers, ...(parsed.filters?.deal_breakers ?? {}) },
>>>>>>> fbc04ca0e5e30436092d8402daceb9005bb59364
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

  const hasSavedPrefs = Boolean(data?.preferences && data.preferences.trim());

  useEffect(() => {
    if (!data) return;
    setFormState(toPayload(data.preferences));
  }, [data]);

  const current = formState[activeScope];
  const filters = formState.filters;

  // Religion-conditional cultural fields for the ACTIVE tab. The cascade stores
  // the religion name in `current.religion`, so the shared rules decide which
  // levels / horoscope to show (caste & gotra & horoscope are Hindu-only;
  // Islam/Christian show only the relabeled level-1 "Sect"/"Denomination").
  const culturalRules = getReligionRules(current.religion);

  // The cultural cascade depends on the *active* tab's selections, one level at
  // a time: religion → community → … → gotra.
  const { religions } = useReligions();
  const { communities } = useCommunities(current.religion_id);
  const { casteCategories } = useCasteCategories(current.community_id);
  const { castesV2 } = useCastesV2(current.caste_category_id);
  const { subCastes } = useSubCastes(current.caste_v2_id);
  const { clans } = useClans(current.sub_caste_id);
  const { gotras } = useGotrasV2(current.clan_id);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFormState((prev) => ({ ...prev, filters: { ...prev.filters, [key]: value } }));
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

  // Selecting any cultural level toggles it and clears every descendant level so
  // the cascade can never hold a child that doesn't belong to its parent.
  const selectCultural = (level: Level, id: number, name: string) => {
    setFormState((prev) => {
      const scope = { ...prev[activeScope] };
      const idField = `${level}_id` as `${Level}_id`;
      const same = scope[idField] === id;
      scope[level] = same ? "" : name;
      scope[idField] = same ? null : id;
      LEVELS.slice(LEVELS.indexOf(level) + 1).forEach((descendant) => {
        scope[descendant] = "";
        scope[`${descendant}_id` as `${Level}_id`] = null;
      });
      return { ...prev, [activeScope]: scope };
    });
  };

  const setText = (key: "preferences" | "hobbies", value: string) => {
    setFormState((prev) => ({
      ...prev,
      [activeScope]: { ...prev[activeScope], [key]: value },
    }));
  };

  const toggleDiet = (value: string) =>
    setFilter(
      "preferred_diet",
      filters.preferred_diet.includes(value)
        ? filters.preferred_diet.filter((v) => v !== value)
        : [...filters.preferred_diet, value],
    );

  const setDealBreaker = (bucket: keyof Filters["deal_breakers"], values: string[]) =>
    setFilter("deal_breakers", { ...filters.deal_breakers, [bucket]: values });

  const save = async () => {
    setSubmitting(true);

    // 1. "Your hobbies" describes YOU → write to your own profile (incl. the deep
    //    cultural taxonomy). The full form is also stored as the `preferences`
    //    JSON blob so this screen repopulates on the next visit.
    const yh = formState.your_hobbies;
    const formData = new FormData();
<<<<<<< HEAD
    const stateToSave = { ...formState, partners_type: formState.your_hobbies };
    formData.append("preferences", JSON.stringify(stateToSave));
    if (yh.religion_id != null) formData.append("religion", String(yh.religion_id));
    if (yh.caste_id != null) formData.append("caste", String(yh.caste_id));
    if (yh.gotra_id != null) formData.append("gotra", String(yh.gotra_id));
=======
    formData.append("preferences", JSON.stringify(formState));
    LEVELS.forEach((level) => {
      const id = yh[`${level}_id` as `${Level}_id`];
      if (id != null) formData.append(level, String(id));
    });
>>>>>>> fbc04ca0e5e30436092d8402daceb9005bb59364
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
      preferred_min_height_cm: f.preferred_min_height_cm,
      preferred_max_height_cm: f.preferred_max_height_cm,
      preferred_diet: f.preferred_diet,
      preferred_alcohol: f.preferred_alcohol,
      preferred_smoking: f.preferred_smoking,
      gotra_rule: f.gotra_rule,
      accept_different_religion: f.accept_different_religion,
      accept_different_community: f.accept_different_community,
      accept_different_caste: f.accept_different_caste,
      accept_different_gotra: f.accept_different_gotra,
      deal_breakers: f.deal_breakers,
      preferred_religion: pt.religion_id,
      preferred_community: pt.community_id,
      preferred_caste_category: pt.caste_category_id,
      preferred_caste_v2: pt.caste_v2_id,
      preferred_sub_caste: pt.sub_caste_id,
      preferred_clan: pt.clan_id,
      preferred_gotra_v2: pt.gotra_v2_id,
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
      if (typeof window !== "undefined") localStorage.setItem("loviq_prefs_saved", "1");
      setSaved(true);
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
            <SelectField label="Gender" value={filters.preferred_gender} onChange={(v) => setFilter("preferred_gender", v)} options={GENDER_OPTIONS} />
            <TextField label="City" value={filters.preferred_city} onChange={(v) => setFilter("preferred_city", v)} placeholder="e.g. Kathmandu" />
            <SelectField label="Max distance" value={String(filters.max_distance_km)} onChange={(v) => setFilter("max_distance_km", Number(v))} options={DISTANCE_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))} />
            <SelectField label="Education" value={filters.preferred_education} onChange={(v) => setFilter("preferred_education", v)} options={EDUCATION_OPTIONS} />
            <NumberField label="Min height (cm)" value={filters.preferred_min_height_cm} onChange={(v) => setFilter("preferred_min_height_cm", v)} />
            <NumberField label="Max height (cm)" value={filters.preferred_max_height_cm} onChange={(v) => setFilter("preferred_max_height_cm", v)} />
            <SelectField label="Alcohol" value={filters.preferred_alcohol} onChange={(v) => setFilter("preferred_alcohol", v)} options={ANY_FREQUENCY} />
            <SelectField label="Smoking" value={filters.preferred_smoking} onChange={(v) => setFilter("preferred_smoking", v)} options={ANY_FREQUENCY} />
            <SelectField label="Gotra rule" value={filters.gotra_rule} onChange={(v) => setFilter("gotra_rule", v)} options={ANY_GOTRA_RULE} />
          </div>

          <RangeField label="Min age" value={filters.min_age} min={18} max={60} onChange={(v) => setFilter("min_age", Math.min(v, filters.max_age))} />
          <RangeField label="Max age" value={filters.max_age} min={18} max={60} onChange={(v) => setFilter("max_age", Math.max(v, filters.min_age))} />

<<<<<<< HEAD
          <RangeField
            label="Max age"
            value={filters.max_age}
            min={18}
            max={60}
            onChange={(value) => setFilter("max_age", Math.max(value, filters.min_age))}
            reverseFill={true}
          />
=======
          <MultiChips title="Diet preference" options={DIET_OPTIONS} selected={filters.preferred_diet} onToggle={toggleDiet} />

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Religious compatibility</h3>
            <ToggleRow label="Accept different religion" checked={filters.accept_different_religion} onChange={(v) => setFilter("accept_different_religion", v)} />
            <ToggleRow label="Accept different community" checked={filters.accept_different_community} onChange={(v) => setFilter("accept_different_community", v)} />
            <ToggleRow label="Accept different caste" checked={filters.accept_different_caste} onChange={(v) => setFilter("accept_different_caste", v)} />
            <ToggleRow label="Accept different gotra" checked={filters.accept_different_gotra} onChange={(v) => setFilter("accept_different_gotra", v)} />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Deal breakers</h3>
            <TagListField label="Must have" values={filters.deal_breakers.must_have} onChange={(v) => setDealBreaker("must_have", v)} />
            <TagListField label="Nice to have" values={filters.deal_breakers.nice_to_have} onChange={(v) => setDealBreaker("nice_to_have", v)} />
            <TagListField label="Avoid" values={filters.deal_breakers.avoid} onChange={(v) => setDealBreaker("avoid", v)} />
          </div>
>>>>>>> fbc04ca0e5e30436092d8402daceb9005bb59364
        </section>

        <section className="space-y-5 rounded-3xl border border-white/60 bg-white/40 p-4 shadow-[0_10px_30px_rgba(16,24,40,0.08)] backdrop-blur-md">
          <CulturalChips title="Religion" options={religions} selectedId={current.religion_id} onSelect={(id, n) => selectCultural("religion", id, n)} emptyHint="No religions available." />
          {culturalRules.levels.includes("community") && (
            <CulturalChips title={culturalRules.communityLabel} options={communities} selectedId={current.community_id} onSelect={(id, n) => selectCultural("community", id, n)} emptyHint={current.religion_id ? `No ${culturalRules.communityLabel.toLowerCase()} found.` : "Select a religion first."} />
          )}
          {culturalRules.levels.includes("caste_category") && (
            <CulturalChips title="Caste category" options={casteCategories} selectedId={current.caste_category_id} onSelect={(id, n) => selectCultural("caste_category", id, n)} emptyHint={current.community_id ? "No categories found." : "Select a community first."} />
          )}
          {culturalRules.levels.includes("caste_v2") && (
            <CulturalChips title="Caste" options={castesV2} selectedId={current.caste_v2_id} onSelect={(id, n) => selectCultural("caste_v2", id, n)} emptyHint={current.caste_category_id ? "No castes found." : "Select a category first."} />
          )}
          {culturalRules.levels.includes("sub_caste") && (
            <CulturalChips title="Sub-caste" options={subCastes} selectedId={current.sub_caste_id} onSelect={(id, n) => selectCultural("sub_caste", id, n)} emptyHint={current.caste_v2_id ? "No sub-castes found." : "Select a caste first."} />
          )}
          {culturalRules.levels.includes("clan") && (
            <CulturalChips title="Clan" options={clans} selectedId={current.clan_id} onSelect={(id, n) => selectCultural("clan", id, n)} emptyHint={current.sub_caste_id ? "No clans found." : "Select a sub-caste first."} />
          )}
          {culturalRules.levels.includes("gotra_v2") && (
            <CulturalChips title="Gotra" options={gotras} selectedId={current.gotra_v2_id} onSelect={(id, n) => selectCultural("gotra_v2", id, n)} emptyHint={current.clan_id ? "No gotras for this clan." : "Select a clan first."} />
          )}

          {culturalRules.showHoroscope && (
            <>
              <ChipSection title="Horoscope" options={HOROSCOPE_OPTIONS} selected={current.horoscope} onSelect={(v) => setChoice("horoscope", v)} />
              <ChipSection title="Gans" options={GANS_OPTIONS} selected={current.gans} onSelect={(v) => setChoice("gans", v)} />
            </>
          )}

<<<<<<< HEAD
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
=======
          <OpenQuestion label="Preferences" value={current.preferences} onChange={(v) => setText("preferences", v)} placeholder="Type your preference here" />
          <OpenQuestion label="Hobbies" value={current.hobbies} onChange={(v) => setText("hobbies", v)} placeholder="Type your hobbies" />
>>>>>>> fbc04ca0e5e30436092d8402daceb9005bb59364

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

// Options are id+name records from the API; selection is tracked by id.
function CulturalChips({
  title,
  options,
  selectedId,
  onSelect,
  emptyHint,
}: {
  title: string;
  options: { id: number; name: string }[];
  selectedId: number | null;
  onSelect: (id: number, name: string) => void;
  emptyHint: string;
}) {
  return (
    <div>
      <h2 className="mb-2 text-[22px] font-semibold leading-none">{title}</h2>
      {options.length === 0 ? (
        <p className="text-sm text-[#746767]">{emptyHint}</p>
      ) : (
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
          {options.map((option) => {
            const active = selectedId === option.id;
            return (
              <button
                key={option.id}
                onClick={() => onSelect(option.id, option.name)}
<<<<<<< HEAD
                style={
                  active
                     ? { backgroundColor: "#5FD08A", color: "#14532D" }
                     : { color: "#2D2424" }
                }
=======
                style={active ? { backgroundColor: "#5FD08A", color: "#14532D" } : { color: "#2D2424" }}
>>>>>>> fbc04ca0e5e30436092d8402daceb9005bb59364
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
              style={active ? { backgroundColor: "#5FD08A", color: "#14532D" } : { color: "#2D2424" }}
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

// Multi-select chips backed by {value,label} options (e.g. diet preference).
function MultiChips({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              style={active ? { backgroundColor: "#5FD08A", color: "#14532D" } : { color: "#2D2424" }}
              className="glass-btn rounded-full px-4 py-2 text-sm font-medium transition"
            >
              {option.label}
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

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#2D2424]">{label}</span>
      <input
        type="number"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
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

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-[#2D2424]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{ backgroundColor: checked ? "#5FD08A" : "#D9CFC6" }}
        className="relative h-6 w-11 shrink-0 rounded-full transition"
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
          style={{ left: checked ? "1.5rem" : "0.125rem" }}
        />
      </button>
    </label>
  );
}

// Free-text tag list (deal-breaker buckets). Enter or the Add button appends.
function TagListField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed || values.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...values, trimmed]);
    setDraft("");
  };

  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#746767]">{label}</span>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder="Add and press Enter"
          className="glass-btn h-10 flex-1 rounded-2xl px-4 text-sm outline-none placeholder:text-[#9f9797]"
        />
        <button type="button" onClick={add} className="glass-btn h-10 shrink-0 rounded-2xl px-4 text-sm font-semibold">
          Add
        </button>
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <span key={value} className="glass-btn flex items-center gap-1 rounded-full px-3 py-1 text-sm">
              {value}
              <button type="button" onClick={() => onChange(values.filter((v) => v !== value))} aria-label={`Remove ${value}`}>
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronDown, Upload } from "lucide-react";
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
import {
  NATIONALITY_OPTIONS,
  CITIZENSHIP_OPTIONS,
  DIET_OPTIONS,
  FREQUENCY_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  INDUSTRY_OPTIONS,
  INCOME_RANGE_OPTIONS,
  LANGUAGE_OPTIONS,
  type Option,
} from "@/shared/constants/profileOptions";
import api from "@/shared/api/client";
import { getReligionRules } from "@/shared/constants/religionRules";

const steps = ["Identity", "Lifestyle", "Culture"];

// The deep cultural cascade tracked by FK id, separate from the string form
// because empty FK ids must NOT be sent to the backend.
type Culture = {
  religion: number | null;
  community: number | null;
  caste_category: number | null;
  caste_v2: number | null;
  sub_caste: number | null;
  clan: number | null;
  gotra_v2: number | null;
};

const emptyCulture = (): Culture => ({
  religion: null,
  community: null,
  caste_category: null,
  caste_v2: null,
  sub_caste: null,
  clan: null,
  gotra_v2: null,
});

export default function EditProfile() {
  const router = useRouter();
  const { data } = useMyProfile();
  const mutation = useUpdateProfile();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    full_name: "",
    date_of_birth: "",
    gender: "",
    city: "",
    height_cm: "",
    weight_kg: "",
    nationality: "",
    citizenship: "",
    education: "",
    education_level: "",
    career: "",
    industry: "",
    income_range: "",
    values: "",
    hobbies: "",
    bio: "",
    ethnicity: "",
    gan: "",
    horoscope: "",
    diet: "",
    alcohol: "",
    smoking: "",
    family_religious_practice: "",
    personal_religious_practice: "",
    temple_attendance: "",
    marriage_tradition_pref: "",
    family_type: "",
    family_values: "",
    parents_religion_importance: "",
    relationship_intent: "",
    wants_children: "",
    is_profile_public: "true",
  });
  const [languages, setLanguages] = useState<string[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [showDiscard, setShowDiscard] = useState(false);
  // Inline DoB validation: the very first step requires a valid date of birth
  // before the user can advance, so they never reach "Save" only to be told
  // the profile is incomplete.
  const [dobError, setDobError] = useState(false);

  const [culture, setCulture] = useState<Culture>(emptyCulture());

  // Religion → Community → CasteCategory → Caste → SubCaste → Clan → Gotra.
  // Each list depends on its parent's selected id (empty when the parent is unset).
  const { religions } = useReligions();
  const { communities } = useCommunities(culture.religion);
  const { casteCategories } = useCasteCategories(culture.community);
  const { castesV2 } = useCastesV2(culture.caste_category);
  const { subCastes } = useSubCastes(culture.caste_v2);
  const { clans } = useClans(culture.sub_caste);
  const { gotras } = useGotrasV2(culture.clan);

  // Religion-conditional cultural fields. Resolve the selected religion's NAME
  // (the cascade stores ids), then let the shared rules decide what to render —
  // e.g. caste/gotra/horoscope only for Hindu; "community" relabeled "Sect"/
  // "Denomination" for Islam/Christian; nothing extra for other religions.
  const religionName = religions?.find((r) => r.id === culture.religion)?.name ?? null;
  const rules = getReligionRules(religionName);

  // Hydrate the local form once the profile loads. This is the standard
  // "initialize editable state from fetched data" pattern; the multiple setState
  // calls run only when `data` arrives, not on every render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!data) return;
    setForm({
      full_name: data.full_name || "",
      date_of_birth: data.date_of_birth || "",
      gender: data.gender || "",
      city: data.city || "",
      height_cm: data.height_cm ? String(data.height_cm) : "",
      weight_kg: data.weight_kg ? String(data.weight_kg) : "",
      nationality: data.nationality || "",
      citizenship: data.citizenship || "",
      education: data.education || "",
      education_level: data.education_level || "",
      career: data.career || "",
      industry: data.industry || "",
      income_range: data.income_range || "",
      values: data.values || "",
      hobbies: data.hobbies || "",
      bio: data.bio || "",
      ethnicity: data.ethnicity || "",
      gan: data.gan || "",
      horoscope: data.horoscope || "",
      diet: data.diet || "",
      alcohol: data.alcohol || "",
      smoking: data.smoking || "",
      family_religious_practice: data.family_religious_practice || "",
      personal_religious_practice: data.personal_religious_practice || "",
      temple_attendance: data.temple_attendance || "",
      marriage_tradition_pref: data.marriage_tradition_pref || "",
      family_type: data.family_type || "",
      family_values: data.family_values || "",
      parents_religion_importance: data.parents_religion_importance || "",
      relationship_intent: data.relationship_intent || "",
      wants_children: data.wants_children || "",
      is_profile_public: String(data.is_profile_public ?? true),
    });
    setLanguages(data.languages_spoken || []);
    setCulture({
      religion: data.religion ?? null,
      community: data.community ?? null,
      caste_category: data.caste_category ?? null,
      caste_v2: data.caste_v2 ?? null,
      sub_caste: data.sub_caste ?? null,
      clan: data.clan ?? null,
      gotra_v2: data.gotra_v2 ?? null,
    });
  }, [data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  // Picking any level nulls every descendant, so the cascade can never hold a
  // child that doesn't belong to its newly-chosen parent.
  const selectReligion = (id: number | null) => setCulture({ ...emptyCulture(), religion: id });
  const selectCommunity = (id: number | null) =>
    setCulture((c) => ({ ...c, community: id, caste_category: null, caste_v2: null, sub_caste: null, clan: null, gotra_v2: null }));
  const selectCasteCategory = (id: number | null) =>
    setCulture((c) => ({ ...c, caste_category: id, caste_v2: null, sub_caste: null, clan: null, gotra_v2: null }));
  const selectCasteV2 = (id: number | null) =>
    setCulture((c) => ({ ...c, caste_v2: id, sub_caste: null, clan: null, gotra_v2: null }));
  const selectSubCaste = (id: number | null) =>
    setCulture((c) => ({ ...c, sub_caste: id, clan: null, gotra_v2: null }));
  const selectClan = (id: number | null) => setCulture((c) => ({ ...c, clan: id, gotra_v2: null }));
  const selectGotra = (id: number | null) => setCulture((c) => ({ ...c, gotra_v2: id }));

  const toggleLanguage = (lang: string) =>
    setLanguages((prev) => (prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]));

  const submit = async () => {
    if (photo) {
      const imageData = new FormData();
      imageData.append("image", photo);
      imageData.append("image_type", "profile");
      imageData.append("is_primary", "true");

      await api.post("/profile/images/upload/", imageData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }

    const formData = new FormData();
    // Integer fields must be sent as a clean integer, or omitted entirely.
    // "" / decimals / stray text all fail DRF's IntegerField, so coerce here.
    const numericKeys = new Set(["height_cm", "weight_kg"]);
    // Don't send cultural text fields hidden for the chosen religion (the
    // backend clears them anyway, but keep the request clean and consistent).
    const skipKeys = new Set<string>();
    if (!rules.showHoroscope) { skipKeys.add("gan"); skipKeys.add("horoscope"); }
    if (!rules.showTemple) skipKeys.add("temple_attendance");
    Object.entries(form).forEach(([key, value]) => {
      if (skipKeys.has(key)) return;
      if (numericKeys.has(key)) {
        const raw = String(value ?? "").trim();
        if (raw === "") return;                 // blank → omit (field is optional)
        const n = parseInt(raw, 10);
        if (Number.isNaN(n)) return;            // not a number → omit, don't 400
        formData.append(key, String(n));        // send a clean integer
        return;
      }
      formData.append(key, value);
    });

    // ArrayField over multipart: send one JSON-encoded value (the serializer's
    // JSONOrListField decodes it). Always sent so clearing all languages sticks.
    formData.append("languages_spoken", JSON.stringify(languages));

    // FK fields: only send when chosen — an empty value is invalid for a FK.
    // Skip cascade levels not allowed for the chosen religion (religion itself
    // always sends; the rest only when the religion permits that level).
    (Object.keys(culture) as (keyof Culture)[]).forEach((key) => {
      const id = culture[key];
      if (id == null) return;
      if (key !== "religion" && !rules.levels.includes(key as never)) return;
      formData.append(key, String(id));
    });

    mutation.mutate(formData, {
      onSuccess: () => router.push("/home"),
    });
  };

  return (
    <main className="min-h-[100dvh] px-4 py-5 text-[#2D2424]">
      <div className="mx-auto max-w-md">
        <header className="mb-5 rounded-3xl border border-white/55 bg-white/55 px-4 py-4 shadow-[0_8px_24px_rgba(16,24,40,0.10)] backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowDiscard(true)}
              aria-label="Go back"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/80 bg-white/85 text-[#1a1a2e] shadow-[0_4px_12px_rgba(16,24,40,0.08)]"
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-[#B78A3B]">Profile Setup</h1>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full ${i <= step ? "bg-[#7A2432]" : "bg-[#EADDD2]"}`} />
            ))}
          </div>
        </header>

        <section className="rounded-lg border border-[#EADDD2] p-5 shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-4">
              {step === 0 && (
                <>
                  <Field label="Full name" value={form.full_name} onChange={(v) => update("full_name", v)} />
                  <DobPicker
                    value={form.date_of_birth}
                    onChange={(v) => { update("date_of_birth", v); setDobError(false); }}
                    error={dobError}
                  />
                  <Select label="Gender" value={form.gender} onChange={(v) => update("gender", v)} options={["male", "female", "other"]} />
                  <Field label="City" value={form.city} onChange={(v) => update("city", v)} placeholder="Kathmandu, Pokhara..." />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Height (cm)" type="number" value={form.height_cm} onChange={(v) => update("height_cm", v)} optional />
                    <Field label="Weight (kg)" type="number" value={form.weight_kg} onChange={(v) => update("weight_kg", v)} optional />
                  </div>
                  <ChoiceSelect label="Nationality" value={form.nationality} onChange={(v) => update("nationality", v)} options={NATIONALITY_OPTIONS} optional />
                  <ChoiceSelect label="Citizenship" value={form.citizenship} onChange={(v) => update("citizenship", v)} options={CITIZENSHIP_OPTIONS} optional />
                  <MultiSelectChips label="Languages spoken" options={LANGUAGE_OPTIONS} selected={languages} onToggle={toggleLanguage} />
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-[#EADDD2] p-4 text-sm text-[#746767]">
                    <Upload className="h-5 w-5 text-[#7A2432]" />
                    <span>{photo ? photo.name : "Upload profile photo"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />
                  </label>
                </>
              )}

              {step === 1 && (
                <>
                  <ChoiceSelect label="Education level" value={form.education_level} onChange={(v) => update("education_level", v)} options={EDUCATION_LEVEL_OPTIONS} optional />
                  <Field label="Field / Institution" value={form.education} onChange={(v) => update("education", v)} optional />
                  <Field label="Occupation" value={form.career} onChange={(v) => update("career", v)} optional />
                  <ChoiceSelect label="Industry" value={form.industry} onChange={(v) => update("industry", v)} options={INDUSTRY_OPTIONS} optional />
                  <ChoiceSelect label="Income range" value={form.income_range} onChange={(v) => update("income_range", v)} options={INCOME_RANGE_OPTIONS} optional />
                  <ChoiceSelect label="Diet" value={form.diet} onChange={(v) => update("diet", v)} options={DIET_OPTIONS} optional />
                  <div className="grid grid-cols-2 gap-3">
                    <ChoiceSelect label="Alcohol" value={form.alcohol} onChange={(v) => update("alcohol", v)} options={FREQUENCY_OPTIONS} optional />
                    <ChoiceSelect label="Smoking" value={form.smoking} onChange={(v) => update("smoking", v)} options={FREQUENCY_OPTIONS} optional />
                  </div>
                  <Field label="Values and mindset" value={form.values} onChange={(v) => update("values", v)} placeholder="Family, honesty, growth" />
                  <TextArea label="Short bio" value={form.bio} onChange={(v) => update("bio", v)} />
                </>
              )}

              {step === 2 && (
                <>
                  <Field label="Ethnicity" value={form.ethnicity} onChange={(v) => update("ethnicity", v)} optional />
                  <CultureSelect label="Religion" value={culture.religion} onChange={selectReligion} options={religions} placeholder="Select religion" />
                  {rules.levels.includes("community") && (
                    <CultureSelect
                      label={rules.communityLabel}
                      value={culture.community}
                      onChange={selectCommunity}
                      options={communities}
                      placeholder={culture.religion ? `Select ${rules.communityLabel.toLowerCase()}` : "Select a religion first"}
                      disabled={!culture.religion}
                    />
                  )}
                  {rules.levels.includes("caste_category") && (
                    <CultureSelect
                      label="Caste category"
                      value={culture.caste_category}
                      onChange={selectCasteCategory}
                      options={casteCategories}
                      placeholder={culture.community ? "Select category" : "Select a community first"}
                      disabled={!culture.community}
                    />
                  )}
                  {rules.levels.includes("caste_v2") && (
                    <CultureSelect
                      label="Caste"
                      value={culture.caste_v2}
                      onChange={selectCasteV2}
                      options={castesV2}
                      placeholder={culture.caste_category ? "Select caste" : "Select a category first"}
                      disabled={!culture.caste_category}
                    />
                  )}
                  {rules.levels.includes("sub_caste") && (
                    <CultureSelect
                      label="Sub-caste"
                      value={culture.sub_caste}
                      onChange={selectSubCaste}
                      options={subCastes}
                      placeholder={culture.caste_v2 ? "Select sub-caste" : "Select a caste first"}
                      disabled={!culture.caste_v2}
                    />
                  )}
                  {rules.levels.includes("clan") && (
                    <CultureSelect
                      label="Clan"
                      value={culture.clan}
                      onChange={selectClan}
                      options={clans}
                      placeholder={culture.sub_caste ? "Select clan" : "Select a sub-caste first"}
                      disabled={!culture.sub_caste}
                    />
                  )}
                  {rules.levels.includes("gotra_v2") && (
                    <CultureSelect
                      label="Gotra"
                      value={culture.gotra_v2}
                      onChange={selectGotra}
                      options={gotras}
                      placeholder={culture.clan ? "Select gotra" : "Select a clan first"}
                      disabled={!culture.clan}
                    />
                  )}
                  {rules.showHoroscope && (
                    <>
                      <Field label="Gan" value={form.gan} onChange={(v) => update("gan", v)} optional />
                      <Field label="Horoscope" value={form.horoscope} onChange={(v) => update("horoscope", v)} optional />
                    </>
                  )}
                  <Field label="Interests" value={form.hobbies} onChange={(v) => update("hobbies", v)} placeholder="Music, hiking, reading" />
                </>
              )}

            </motion.div>
          </AnimatePresence>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button disabled={step === 0} onClick={() => setStep((value) => value - 1)} className="h-12 rounded-md border border-[#EADDD2] font-semibold disabled:opacity-40">
              Back
            </button>
            {step < steps.length - 1 ? (
              <button
                onClick={() => {
                  // Date of birth is mandatory and lives on the first step —
                  // block advancing (and flag the field) until it's filled.
                  if (step === 0 && !form.date_of_birth) {
                    setDobError(true);
                    return;
                  }
                  setStep((value) => value + 1);
                }}
                className="flex h-12 items-center justify-center gap-2 rounded-md bg-[#7A2432] font-semibold text-white"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={submit} disabled={mutation.isPending} className="h-12 rounded-md bg-[#7A2432] font-semibold text-white disabled:opacity-60">
                {mutation.isPending ? "Saving..." : "Save profile"}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* ── Discard changes confirmation ── */}
      <AnimatePresence>
        {showDiscard && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-[#2D2424]/60 px-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="w-full max-w-sm rounded-2xl border border-white/60 bg-white/85 p-6 text-center shadow-xl backdrop-blur-md"
            >
              <h2 className="text-lg font-bold text-[#2D2424]">Discard changes?</h2>
              <p className="mt-1.5 text-sm leading-6 text-[#746767]">
                Your changes won&apos;t be saved. Do you want to discard them?
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShowDiscard(false)}
                  className="h-11 rounded-xl border border-[#EADDD2] text-sm font-semibold text-[#746767]"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscard(false);
                    router.push("/profile");
                  }}
                  className="h-11 rounded-xl bg-[#7A2432] text-sm font-semibold text-white"
                >
                  Yes, discard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, optional }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; optional?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label} {optional && <span className="text-[#746767]">(optional)</span>}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-md border border-[#EADDD2] px-3 text-sm outline-none focus:border-[#7A2432]" />
    </label>
  );
}

// Date of birth: three Day / Month / Year combo fields (no native calendar).
// Each is an <input list> backed by a <datalist>, so the user can TYPE the
// value or PICK it from the dropdown. Local state holds the parts so partial
// entries accumulate; the value is only emitted as YYYY-MM-DD once all three
// are valid. Year range 1965–2008 maps to the 18–60 age window allowed.
const DOB_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
// Year range is derived from today, not hardcoded, so it never goes stale:
// newest = this year minus the 18-year minimum age, oldest = minus 80.
const DOB_MIN_AGE = 8;
const DOB_MAX_AGE = 80;
const DOB_THIS_YEAR = new Date().getFullYear();
const DOB_MAX_YEAR = DOB_THIS_YEAR - DOB_MIN_AGE;
const DOB_MIN_YEAR = DOB_THIS_YEAR - DOB_MAX_AGE;
const DOB_YEARS = Array.from({ length: DOB_MAX_YEAR - DOB_MIN_YEAR + 1 }, (_, i) => DOB_MAX_YEAR - i);

// Accept either a month name ("February") or a number ("2"); returns 1–12 or NaN.
const monthToNum = (m: string) => {
  const t = m.trim().toLowerCase();
  if (!t) return NaN;
  const idx = DOB_MONTHS.findIndex((n) => n.toLowerCase() === t);
  if (idx >= 0) return idx + 1;
  const n = Number(t);
  return n >= 1 && n <= 12 ? n : NaN;
};

function DobPicker({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: boolean }) {
  const split = (v: string) => {
    const [yy, mm, dd] = v ? v.split("-") : ["", "", ""];
    return {
      year: yy ?? "",
      month: mm ? DOB_MONTHS[Number(mm) - 1] ?? "" : "",
      day: dd ? String(Number(dd)) : "",
    };
  };
  const [parts, setParts] = useState(() => split(value));

  // Sync down only when the parent supplies a real date (e.g. loaded from the
  // API). Don't reset on an empty value, so clearing one field doesn't wipe
  // the in-progress entries in the others. Adjusting state during render via a
  // prev-value tracker avoids the extra render an effect would cause.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value) setParts(split(value));
  }

  const { year, month, day } = parts;

  // Day field always offers 1–31; commit() clamps impossible dates (e.g. a
  // chosen Feb 31 collapses to Feb 28/29).
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const commit = (next: { year: string; month: string; day: string }) => {
    setParts(next);
    const yn = Number(next.year);
    const mn = monthToNum(next.month);
    const dn = Number(next.day);
    if (!next.year || Number.isNaN(yn) || Number.isNaN(mn) || !dn || Number.isNaN(dn)) {
      onChange(""); // partial / invalid entry is treated as "no date yet"
      return;
    }
    // Clamp the day if the month/year has fewer days (e.g. 31 → Feb).
    const dim = new Date(yn, mn, 0).getDate();
    const cd = Math.min(dn, dim);
    onChange(`${yn}-${String(mn).padStart(2, "0")}-${String(cd).padStart(2, "0")}`);
  };

  const fieldClass = `h-12 w-full rounded-md border px-3 text-sm outline-none focus:border-[#7A2432] ${error ? "border-red-500" : "border-[#EADDD2]"}`;

  return (
    <div className="block">
      <span className="mb-1.5 block text-sm font-medium">Date of birth</span>
      <div className="grid grid-cols-3 gap-3">
        <input
          list="dob-days"
          value={day}
          onChange={(e) => commit({ ...parts, day: e.target.value })}
          placeholder="Day"
          inputMode="numeric"
          className={fieldClass}
        />
        <datalist id="dob-days">
          {days.map((dd) => <option key={dd} value={dd} />)}
        </datalist>

        <input
          list="dob-months"
          value={month}
          onChange={(e) => commit({ ...parts, month: e.target.value })}
          placeholder="Month"
          className={fieldClass}
        />
        <datalist id="dob-months">
          {DOB_MONTHS.map((name) => <option key={name} value={name} />)}
        </datalist>

        <input
          list="dob-years"
          value={year}
          onChange={(e) => commit({ ...parts, year: e.target.value })}
          placeholder="Year"
          inputMode="numeric"
          className={fieldClass}
        />
        <datalist id="dob-years">
          {DOB_YEARS.map((yy) => <option key={yy} value={yy} />)}
        </datalist>
      </div>
      {error && <span className="mt-1.5 block text-xs font-medium text-red-600">Please add your date of birth to continue.</span>}
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="w-full rounded-md border border-[#EADDD2] p-3 text-sm outline-none focus:border-[#7A2432]" />
    </label>
  );
}

// Cascading dropdown for the cultural taxonomy — options are id+name records
// from the API and the value is the selected id (a profile FK).
function CultureSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  options: { id: number; name: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label} <span className="text-[#746767]">(optional)</span></span>
      <div className="relative">
        <select
          value={value ?? ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
          className="h-12 w-full appearance-none rounded-md border border-[#EADDD2] px-3 pr-10 text-sm outline-none focus:border-[#7A2432] disabled:opacity-50"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>{option.name}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#746767]" />
      </div>
    </label>
  );
}

function Select({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-md border border-[#EADDD2] px-3 text-sm outline-none focus:border-[#7A2432]">
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>{labels?.[option] ?? option}</option>
        ))}
      </select>
    </label>
  );
}

// Select backed by {value,label} option records (the structured choice fields).
function ChoiceSelect({ label, value, onChange, options, optional }: { label: string; value: string; onChange: (value: string) => void; options: Option[]; optional?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label} {optional && <span className="text-[#746767]">(optional)</span>}</span>
      <div className="relative">
        <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full appearance-none rounded-md border border-[#EADDD2] px-3 pr-10 text-sm outline-none focus:border-[#7A2432]">
          <option value="">Select</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#746767]" />
      </div>
    </label>
  );
}

function MultiSelectChips({ label, options, selected, onToggle }: { label: string; options: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">{label} <span className="text-[#746767]">(optional)</span></span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              style={active ? { backgroundColor: "#7A2432", color: "#fff", borderColor: "#7A2432" } : undefined}
              className="rounded-full border border-[#EADDD2] px-3 py-1.5 text-sm font-medium transition"
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

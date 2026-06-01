"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useMyProfile, useUpdateProfile } from "@/features/profile/hooks/useProfile";
import { showError, showSuccess } from "@/shared/utils/toast";

type PreferenceScope = "your_hobbies" | "partners_type";

type ChoiceForm = {
  gotra: string;
  religion: string;
  caste: string;
  horoscope: string;
  gans: string;
  preferences: string;
  hobbies: string;
};

type PreferencePayload = {
  your_hobbies: ChoiceForm;
  partners_type: ChoiceForm;
};

const emptyForm = (): ChoiceForm => ({
  gotra: "",
  religion: "",
  caste: "",
  horoscope: "",
  gans: "",
  preferences: "",
  hobbies: "",
});

const GOTRA_OPTIONS = [
  "Not Sure",
  "Atri",
  "Bharadwaj",
  "Gautama",
  "Jamadagni",
  "Kashyap",
  "Vashistha",
  "Vishwamitra",
];

const RELIGION_OPTIONS = [
  "Hindu",
  "Islam",
  "Christian",
  "Buddhism",
  "Sikh",
  "Jain",
  "Others",
];

const CASTE_OPTIONS = [
  "Bahun",
  "Chhetri",
  "Newar",
  "Shah",
  "Yadav",
  "Muslim",
  "Rai",
  "Adivasi",
  "Janjati",
  "Dalit",
  "Others",
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

const GANS_OPTIONS = ["Dev", "Manushya", "Rakhshas", "Not sure"];

function toPayload(input?: string): PreferencePayload {
  if (!input || !input.trim()) {
    return { your_hobbies: emptyForm(), partners_type: emptyForm() };
  }

  try {
    const parsed = JSON.parse(input) as Partial<PreferencePayload>;
    return {
      your_hobbies: { ...emptyForm(), ...(parsed.your_hobbies ?? {}) },
      partners_type: { ...emptyForm(), ...(parsed.partners_type ?? {}) },
    };
  } catch {
    return { your_hobbies: emptyForm(), partners_type: emptyForm() };
  }
}

export default function PreferencesPage() {
  const router = useRouter();
  const { data } = useMyProfile();
  const updateMutation = useUpdateProfile();

  const [activeScope, setActiveScope] = useState<PreferenceScope>("your_hobbies");
  const [formState, setFormState] = useState<PreferencePayload>({
    your_hobbies: emptyForm(),
    partners_type: emptyForm(),
  });

  useEffect(() => {
    if (!data) return;
    setFormState(toPayload(data.preferences));
  }, [data]);

  const current = formState[activeScope];

  const setChoice = (key: keyof ChoiceForm, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [activeScope]: {
        ...prev[activeScope],
        [key]: prev[activeScope][key] === value ? "" : value,
      },
    }));
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

  const save = () => {
    const formData = new FormData();
    formData.append("preferences", JSON.stringify(formState));

    updateMutation.mutate(formData, {
      onSuccess: () => {
        showSuccess("Preferences saved.");
        router.push("/home");
      },
      onError: (error) => showError(error, "Could not save preferences."),
    });
  };

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

        <section className="mb-4 rounded-3xl border border-white/60 bg-white/45 p-2 shadow-[0_8px_24px_rgba(16,24,40,0.08)] backdrop-blur-md">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveScope("your_hobbies")}
              className={`glass-btn h-11 rounded-full text-sm font-semibold transition ${
                activeScope === "your_hobbies"
                  ? "text-[#2D2424]"
                  : "text-[#746767]"
              }`}
            >
              Your hobbies
            </button>
            <button
              onClick={() => setActiveScope("partners_type")}
              className={`glass-btn h-11 rounded-full text-sm font-semibold transition ${
                activeScope === "partners_type"
                  ? "text-[#2D2424]"
                  : "text-[#746767]"
              }`}
            >
              Partner&apos;s type
            </button>
          </div>
        </section>

        <section className="space-y-5 rounded-3xl border border-white/60 bg-white/40 p-4 shadow-[0_10px_30px_rgba(16,24,40,0.08)] backdrop-blur-md">
          <ChipSection
            title="Gotra"
            options={GOTRA_OPTIONS}
            selected={current.gotra}
            onSelect={(value) => setChoice("gotra", value)}
          />

          <ChipSection
            title="Religion"
            options={RELIGION_OPTIONS}
            selected={current.religion}
            onSelect={(value) => setChoice("religion", value)}
          />

          <ChipSection
            title="Caste"
            options={CASTE_OPTIONS}
            selected={current.caste}
            onSelect={(value) => setChoice("caste", value)}
          />

          <ChipSection
            title="Horoscope"
            options={HOROSCOPE_OPTIONS}
            selected={current.horoscope}
            onSelect={(value) => setChoice("horoscope", value)}
          />

          <ChipSection
            title="Gans"
            options={GANS_OPTIONS}
            selected={current.gans}
            onSelect={(value) => setChoice("gans", value)}
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
            disabled={updateMutation.isPending}
            className="glass-btn mt-2 h-12 w-full rounded-full text-sm font-semibold text-[#1f6f54] disabled:opacity-60"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </section>
      </div>
    </main>
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
              className={`glass-btn shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? "border border-[#7A2432]/60 bg-white/70 text-[#7A2432]"
                  : "text-[#2D2424]"
              }`}
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

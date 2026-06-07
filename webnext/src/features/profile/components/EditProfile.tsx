        "use client";

        import { useEffect, useState } from "react";
        import { useRouter } from "next/navigation";
        import { AnimatePresence, motion } from "framer-motion";
        import { ArrowLeft, ArrowRight, ChevronDown, Upload } from "lucide-react";
        import { useMyProfile, useUpdateProfile } from "@/features/profile/hooks/useProfile";
        import { useReligions, useCastes, useGotras } from "@/features/preference/hooks/usePreference";
        import api from "@/shared/api/client";

        const steps = ["Identity", "Lifestyle", "Culture"];

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
            education: "",
            career: "",
            values: "",
            hobbies: "",
            bio: "",
            ethnicity: "",
            gan: "",
            horoscope: "",
            is_profile_public: "true",
          });
          const [photo, setPhoto] = useState<File | null>(null);
          const [showDiscard, setShowDiscard] = useState(false);

          // Religion → caste → gotra are foreign keys; the caste list depends on
          // the chosen religion and the gotra list on the chosen caste (same
          // cascade as the preferences page). Tracked by id, separate from the
          // string form because empty FK ids must NOT be sent to the backend.
          const [culture, setCulture] = useState<{ religion: number | null; caste: number | null; gotra: number | null }>({
            religion: null,
            caste: null,
            gotra: null,
          });
          const { religions } = useReligions();
          const { castes } = useCastes(culture.religion);
          const { gotras } = useGotras(culture.caste);

          useEffect(() => {
            if (!data) return;
            setForm((current) => ({
              ...current,
              full_name: data.full_name || "",
              date_of_birth: data.date_of_birth || "",
              gender: data.gender || "",
              city: data.city || "",
              education: data.education || "",
              career: data.career || "",
              values: data.values || "",
              hobbies: data.hobbies || "",
              bio: data.bio || "",
              ethnicity: data.ethnicity || "",
              gan: data.gan || "",
              horoscope: data.horoscope || "",
              is_profile_public: String(data.is_profile_public ?? true),
            }));
            setCulture({
              religion: data.religion ?? null,
              caste: data.caste ?? null,
              gotra: data.gotra ?? null,
            });
          }, [data]);

          const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

          // Picking a religion clears the dependent caste + gotra; picking a caste clears gotra.
          const selectReligion = (id: number | null) => setCulture({ religion: id, caste: null, gotra: null });
          const selectCaste = (id: number | null) => setCulture((c) => ({ ...c, caste: id, gotra: null }));
          const selectGotra = (id: number | null) => setCulture((c) => ({ ...c, gotra: id }));

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
            Object.entries(form).forEach(([key, value]) => formData.append(key, value));

            // FK fields: only send when chosen — an empty value is invalid for a FK.
            if (culture.religion != null) formData.append("religion", String(culture.religion));
            if (culture.caste != null) formData.append("caste", String(culture.caste));
            if (culture.gotra != null) formData.append("gotra", String(culture.gotra));

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
                      className="glass-btn grid h-10 w-10 shrink-0 place-items-center rounded-full"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B78A3B]">Profile setup</p>
                      <h1 className="text-2xl font-semibold leading-tight">Build a trustworthy profile</h1>
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
                          <Field label="Date of birth" type="date" value={form.date_of_birth} onChange={(v) => update("date_of_birth", v)} />
                          <Select label="Gender" value={form.gender} onChange={(v) => update("gender", v)} options={["male", "female", "other"]} />
                          <Field label="City" value={form.city} onChange={(v) => update("city", v)} placeholder="Kathmandu, Pokhara..." />
                          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-[#EADDD2] p-4 text-sm text-[#746767]">
                            <Upload className="h-5 w-5 text-[#7A2432]" />
                            <span>{photo ? photo.name : "Upload profile photo"}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />
                          </label>
                        </>
                      )}

                      {step === 1 && (
                        <>
                          <Field label="Education" value={form.education} onChange={(v) => update("education", v)} />
                          <Field label="Career" value={form.career} onChange={(v) => update("career", v)} />
                          <Field label="Values and mindset" value={form.values} onChange={(v) => update("values", v)} placeholder="Family, honesty, growth" />
                          <TextArea label="Short bio" value={form.bio} onChange={(v) => update("bio", v)} />
                        </>
                      )}

                      {step === 2 && (
                        <>
                          <Field label="Ethnicity" value={form.ethnicity} onChange={(v) => update("ethnicity", v)} optional />
                          <CultureSelect
                            label="Religion"
                            value={culture.religion}
                            onChange={selectReligion}
                            options={religions}
                            placeholder="Select religion"
                          />
                          <CultureSelect
                            label="Caste"
                            value={culture.caste}
                            onChange={selectCaste}
                            options={castes}
                            placeholder={culture.religion ? "Select caste" : "Select a religion first"}
                            disabled={!culture.religion}
                          />
                          <CultureSelect
                            label="Gotra"
                            value={culture.gotra}
                            onChange={selectGotra}
                            options={gotras}
                            placeholder={culture.caste ? "Select gotra" : "Select a caste first"}
                            disabled={!culture.caste}
                          />
                          <Field label="Gan" value={form.gan} onChange={(v) => update("gan", v)} optional />
                          <Field label="Horoscope" value={form.horoscope} onChange={(v) => update("horoscope", v)} optional />
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
                      <button onClick={() => setStep((value) => value + 1)} className="flex h-12 items-center justify-center gap-2 rounded-md bg-[#7A2432] font-semibold text-white">
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

        function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
          return (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">{label}</span>
              <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="w-full rounded-md border border-[#EADDD2] p-3 text-sm outline-none focus:border-[#7A2432]" />
            </label>
          );
        }

        // Cascading dropdown for religion / caste / gotra — options are id+name
        // records from the API and the value is the selected id (a profile FK).
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

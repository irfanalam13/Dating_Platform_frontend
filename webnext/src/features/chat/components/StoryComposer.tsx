"use client";

import { useRef, useState } from "react";
import { X, ImagePlus, Loader2, Image as ImageIcon, Type } from "lucide-react";
import { useCreateStory } from "@/features/chat/hooks/useStories";

const MAX_BYTES = 10 * 1024 * 1024; // mirrors the backend cap
const TEXT_MAX = 500;

// Background choices for text stories (the CSS string is stored verbatim).
const BACKGROUNDS = [
  "linear-gradient(135deg, #4cc9f0, #4361ee)",
  "linear-gradient(135deg, #f72585, #b5179e)",
  "linear-gradient(135deg, #ff8a00, #e52e71)",
  "linear-gradient(135deg, #11998e, #38ef7d)",
  "linear-gradient(135deg, #232526, #414345)",
  "linear-gradient(135deg, #8e2de2, #4a00e0)",
];

type Mode = "photo" | "text";

interface StoryComposerProps {
  onClose: () => void;
}

/** Modal that posts a 24h story — either an image (+ caption) or a text card. */
export default function StoryComposer({ onClose }: StoryComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("photo");

  // Photo mode
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  // Text mode
  const [text, setText] = useState("");
  const [background, setBackground] = useState(BACKGROUNDS[0]);

  const [error, setError] = useState<string | null>(null);
  const createStory = useCreateStory();

  const pick = (f: File | null) => {
    setError(null);
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please choose an image.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("Image must be under 10 MB.");
      return;
    }
    setFile(f);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  };

  const canSubmit =
    !createStory.isPending &&
    (mode === "photo" ? !!file : text.trim().length > 0);

  const submit = () => {
    if (!canSubmit) return;
    const payload =
      mode === "photo"
        ? { image: file!, caption: caption.trim() || undefined }
        : { text: text.trim(), background };
    createStory.mutate(payload, {
      onSuccess: () => {
        if (preview) URL.revokeObjectURL(preview);
        onClose();
      },
      onError: () => setError("Couldn't post your story. Try again."),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-[#1a1a2e]">Add to your story</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 px-5 pt-4">
          <button
            type="button"
            onClick={() => { setMode("photo"); setError(null); }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors ${
              mode === "photo" ? "bg-[#4cc9f0] text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            <ImageIcon className="h-4 w-4" /> Photo
          </button>
          <button
            type="button"
            onClick={() => { setMode("text"); setError(null); }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors ${
              mode === "text" ? "bg-[#4cc9f0] text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            <Type className="h-4 w-4" /> Text
          </button>
        </div>

        <div className="p-5">
          {mode === "photo" ? (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0] ?? null)}
              />
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Story preview"
                  className="mb-4 max-h-72 w-full rounded-2xl bg-gray-50 object-contain"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mb-4 flex h-56 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 transition-colors hover:border-[#4cc9f0] hover:text-[#4cc9f0]"
                >
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-sm font-medium">Choose a photo</span>
                </button>
              )}
              {preview && (
                <>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value.slice(0, 200))}
                    placeholder="Add a caption…"
                    className="mb-2 w-full rounded-full border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#4cc9f0]"
                  />
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="mb-3 text-xs font-medium text-[#4cc9f0]"
                  >
                    Choose a different photo
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              {/* Live text-card preview */}
              <div
                className="mb-4 flex h-56 w-full items-center justify-center rounded-2xl p-5"
                style={{ background }}
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, TEXT_MAX))}
                  placeholder="Type something…"
                  rows={4}
                  className="w-full resize-none bg-transparent text-center text-lg font-semibold text-white placeholder-white/70 outline-none"
                />
              </div>
              {/* Background swatches */}
              <div className="mb-4 flex flex-wrap gap-2">
                {BACKGROUNDS.map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    aria-label="Background"
                    onClick={() => setBackground(bg)}
                    className={`h-8 w-8 rounded-full ${
                      background === bg ? "ring-2 ring-offset-2 ring-[#4cc9f0]" : ""
                    }`}
                    style={{ background: bg }}
                  />
                ))}
              </div>
            </>
          )}

          {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#4cc9f0] py-3 text-sm font-semibold text-white shadow disabled:opacity-50"
          >
            {createStory.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {createStory.isPending ? "Posting…" : "Share to story"}
          </button>
          <p className="mt-3 text-center text-xs text-gray-400">
            Your story is visible to your matches for 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}

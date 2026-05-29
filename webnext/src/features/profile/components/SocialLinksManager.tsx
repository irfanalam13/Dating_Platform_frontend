// components/profile/SocialLinksManager.tsx

"use client";

import { useState } from "react";
import type { SocialPlatform, SocialLink } from "@/shared/types/profile.types";
import { useSocialLinks } from "@/features/profile/hooks/useProfile";

const PLATFORMS: { value: SocialPlatform; label: string; icon: string; placeholder: string }[] = [
  { value: "instagram", label: "Instagram", icon: "📸", placeholder: "https://instagram.com/yourhandle" },
  { value: "spotify",   label: "Spotify",   icon: "🎵", placeholder: "https://open.spotify.com/user/..." },
  { value: "linkedin",  label: "LinkedIn",  icon: "💼", placeholder: "https://linkedin.com/in/yourname" },
  { value: "twitter",   label: "Twitter",   icon: "🐦", placeholder: "https://twitter.com/yourhandle" },
  { value: "facebook",  label: "Facebook",  icon: "📘", placeholder: "https://facebook.com/yourprofile" },
  { value: "snapchat",  label: "Snapchat",  icon: "👻", placeholder: "https://snapchat.com/add/yourhandle" },
  { value: "tiktok",    label: "TikTok",    icon: "🎬", placeholder: "https://tiktok.com/@yourhandle" },
];

export default function SocialLinksManager() {
  const { links, loading, saving, error, upsert, remove } = useSocialLinks();

  const [addingPlatform, setAddingPlatform] = useState<SocialPlatform | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [formError, setFormError] = useState("");

  const existingPlatforms = new Set(links.map((l) => l.platform));

  const handleAdd = async () => {
    if (!addingPlatform) return;
    if (!urlInput.startsWith("http")) {
      setFormError("URL must start with http:// or https://");
      return;
    }
    setFormError("");
    try {
      await upsert({ platform: addingPlatform, url: urlInput });
      setAddingPlatform(null);
      setUrlInput("");
    } catch {
      setFormError("Failed to save. Please try again.");
    }
  };

  const handleRemove = async (link: SocialLink) => {
    await remove(link.id);
  };

  const availablePlatforms = PLATFORMS.filter(
    (p) => !existingPlatforms.has(p.value) || p.value === addingPlatform
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
          Social Links
        </h3>
        <span className="text-xs text-gray-400">{links.length} / {PLATFORMS.length}</span>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">{error}</p>
      )}

      {/* Existing links */}
      {links.length > 0 && (
        <div className="space-y-2">
          {links.map((link) => {
            const meta = PLATFORMS.find((p) => p.value === link.platform);
            return (
              <div
                key={link.id}
                className="flex items-center gap-3 border border-gray-100 rounded-2xl px-4 py-3"
              >
                <span className="text-xl">{meta?.icon ?? "🔗"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">{meta?.label ?? link.platform}</p>
                  <p className="text-xs text-gray-400 truncate">{link.url}</p>
                </div>
                <button
                  onClick={() => handleRemove(link)}
                  disabled={saving}
                  className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                  aria-label={`Remove ${link.platform}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add new link form */}
      {addingPlatform ? (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {PLATFORMS.find((p) => p.value === addingPlatform)?.icon}
            </span>
            <span className="font-medium text-gray-700">
              {PLATFORMS.find((p) => p.value === addingPlatform)?.label}
            </span>
          </div>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={
              PLATFORMS.find((p) => p.value === addingPlatform)?.placeholder
            }
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            autoFocus
          />
          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => { setAddingPlatform(null); setUrlInput(""); setFormError(""); }}
              className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !urlInput}
              className="flex-1 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        availablePlatforms.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-2">Add a platform</p>
            <div className="flex flex-wrap gap-2">
              {availablePlatforms.map((p) => (
                <button
                  key={p.value}
                  onClick={() => { setAddingPlatform(p.value); setUrlInput(""); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-500 text-xs hover:border-rose-300 hover:text-rose-500 transition-colors"
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
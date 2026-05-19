"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, MapPin, Settings, Edit3, Eye, BadgeCheck } from "lucide-react";
import { Profile, ProfileStats, ProfileSettings, ProfileImage } from "@/shared/types/profile.types";

/* ================= TYPES ================= */

interface ProfileCardProps {
  profile: Profile;
  stats: ProfileStats;
  settings: ProfileSettings;
  images?: ProfileImage[];           // Cloudinary gallery images from /api/v1/profile/images/
  onSettingsClick: () => void;
}

/* ================= HELPERS ================= */

/**
 * Resolves the best available image URL in priority order:
 * 1. Primary Cloudinary image from gallery
 * 2. profile_image_url (resolved by Django serializer)
 * 3. Fallback avatar
 */
function resolveProfileImage(
  images?: ProfileImage[],
  profile_image_url?: string | null
): string {
  const primary = images?.find((img) => img.is_primary);
  if (primary?.url) return primary.url;

  const first = images?.[0];
  if (first?.url) return first.url;

  if (profile_image_url) return profile_image_url;

  return "/default-avatar.png";
}

/* ================= COMPONENT ================= */

export default function ProfileCard({
  profile,
  stats,
  settings,
  images,
  onSettingsClick,
}: ProfileCardProps) {
  const router = useRouter();

  const avatarUrl = resolveProfileImage(images, profile.profile_image_url);

  // Gallery = all non-primary images (up to 3 shown)
  const galleryImages = images?.filter((img) => !img.is_primary).slice(0, 3) ?? [];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-zinc-50 min-h-screen text-zinc-900">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-rose-600">
          Your Profile
        </h1>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/profile/edit")}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-full text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition"
          >
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </button>

          <button
            onClick={onSettingsClick}
            className="p-2 bg-white border border-zinc-200 rounded-full text-zinc-700 shadow-sm hover:bg-zinc-50 transition"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* ── Left: Profile Card ─────────────────────────── */}
        <div className="md:col-span-1 bg-white border rounded-2xl p-6 text-center shadow-sm">

          {/* Avatar */}
          <div className="relative w-36 h-36 mx-auto mb-4">
            <Image
              src={avatarUrl}
              alt={profile.full_name || "Profile"}
              fill
              className="object-cover rounded-full border-4 border-rose-100"
              sizes="144px"
              unoptimized={avatarUrl.includes("res.cloudinary.com")}
            />
            <span className="absolute bottom-2 right-2 bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
              {profile.age}
            </span>
          </div>

          {/* Name + Verified */}
          <div className="flex items-center justify-center gap-1">
            <h2 className="text-xl font-bold">{profile.full_name}</h2>
            {profile.verified && (
              <BadgeCheck className="w-5 h-5 text-rose-500" aria-label="Verified" />
            )}
          </div>

          {/* City */}
          <div className="flex justify-center items-center gap-1 text-sm text-zinc-500 mt-1">
            <MapPin className="w-4 h-4 text-rose-500" />
            <span>{profile.city || "Location not set"}</span>
          </div>

          {/* Bio */}
          <p className="text-sm italic mt-4 text-zinc-600 line-clamp-3">
            {profile.bio || "No bio provided"}
          </p>

          {/* Gallery strip */}
          {galleryImages.length > 0 && (
            <div className="mt-5 grid grid-cols-3 gap-2">
              {galleryImages.map((img) => (
                <div key={img.id} className="relative w-full h-20">
                  <Image
                    src={img.url}
                    alt="Gallery"
                    fill
                    className="object-cover rounded-lg border"
                    sizes="100px"
                    unoptimized={img.url.includes("res.cloudinary.com")}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right Side ─────────────────────────────────── */}
        <div className="md:col-span-2 space-y-6">

          {/* Stats */}
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <div className="grid grid-cols-3 text-center divide-x divide-zinc-100">

              <div className="px-4">
                <Heart className="mx-auto text-rose-500 mb-1" />
                <p className="text-2xl font-bold">{stats.matches}</p>
                <p className="text-xs text-zinc-500">Matches</p>
              </div>

              <div className="px-4">
                <MessageCircle className="mx-auto text-orange-500 mb-1" />
                <p className="text-2xl font-bold">{stats.likes}</p>
                <p className="text-xs text-zinc-500">Likes</p>
              </div>

              <div className="px-4">
                <Eye className="mx-auto text-indigo-500 mb-1" />
                <p className="text-2xl font-bold">{stats.views}</p>
                <p className="text-xs text-zinc-500">Views</p>
              </div>

            </div>
          </div>

          {/* Profile completeness */}
          {!profile.is_complete && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
              ⚠️ Your profile is incomplete. Fill in all required fields to appear in discovery.
            </div>
          )}

          {/* Settings toggles */}
          <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-zinc-700 mb-2">Privacy & Visibility</h3>

            {[
              { label: "Discoverable", value: settings.discoverable },
              { label: "Show Online Status", value: settings.show_online_status },
              { label: "Show Distance", value: settings.show_distance },
              { label: "Private Account", value: settings.is_private },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-sm text-zinc-600">{label}</span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    value
                      ? "bg-green-100 text-green-700"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {value ? "On" : "Off"}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

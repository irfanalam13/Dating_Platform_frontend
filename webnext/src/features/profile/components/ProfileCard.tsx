// "use client";

// import React from 'react';
// import { 
//   Heart, 
//   MessageCircle, 
//   MapPin, 
//   Settings, 
//   Edit3, 
//   ShieldCheck, 
//   Eye, 
//   Image as ImageIcon 
// } from 'lucide-react';
// import { useRouter } from 'next/navigation'; 

// // 🔹 Profile Core Interfaces
// export interface Profile {
//   id: number | string;
//   bio: string;
//   location: string;
//   age: number;
//   gender?: string;
//   profile_image: string | null;
//   interests?: string[];
//   about?: string;
// }

// export interface ProfileStats {
//   matches: number;
//   likes_received: number;
//   photos_count: number;
// }

// export interface ProfileSettings {
//   is_discoverable: boolean;
//   blur_sensitive_content: boolean;
//   distance_radius: number;
// }

// export interface ProfileData extends Profile, ProfileStats, ProfileSettings {
//   full_name: string;
// }

// // ✅ Added onSettingsClick to the interface
// interface ProfileCardProps {
//   data: ProfileData;
//   onSettingsClick: () => void; 
// }

// // ✅ Destructured onSettingsClick from props
// export default function MyProfilePage({ data, onSettingsClick }: ProfileCardProps) {
//   const router = useRouter();

//   return (
//     <div className="max-w-4xl mx-auto p-6 bg-zinc-50 min-h-screen text-zinc-900">
//       {/* 🔹 Header Section */}
//       <div className="flex justify-between items-center mb-8">
//         <h1 className="text-3xl font-bold tracking-tight text-rose-600">Your Profile</h1>
//         <div className="flex gap-3">
          
//           {/* Edit Profile Button */}
//           <button 
//             onClick={() => router.push('/profile/edit')}
//             className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-full text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition"
//           >
//             <Edit3 className="w-4 h-4" /> Edit Profile
//           </button>

//           {/* Settings Button */}
//           {/* ✅ Now uses the onSettingsClick prop to toggle the view in ProfileView.tsx */}
//           <button 
//             onClick={onSettingsClick}
//             className="p-2 bg-white border border-zinc-200 rounded-full text-zinc-700 shadow-sm hover:bg-zinc-50 transition"
//           >
//             <Settings className="w-4 h-4" />
//           </button>
          
//         </div>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         {/* 🔹 Left Column: Profile Card */}
//         <div className="md:col-span-1 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
//           <div className="relative w-36 h-36 mb-4">
//             <img
//               src={data.profile_image || "/default.png"}
//               alt={data.full_name}
//               className="w-full h-full object-cover rounded-full border-4 border-rose-100 shadow-sm"
//               loading="eager"
//             />
//             <span className="absolute bottom-2 right-2 bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold border-2 border-white">
//               {data.age}
//             </span>
//           </div>

//           <h2 className="text-xl font-bold mb-1">{data.full_name}</h2>
//           <div className="flex items-center justify-center gap-1.5 text-zinc-500 text-sm mb-4">
//             <MapPin className="w-4 h-4 text-rose-500" />
//             <span>{data.location}</span>
//           </div>

//           <p className="text-zinc-600 text-sm mb-6 leading-relaxed italic">
//             "{data.bio || "No bio provided"}"
//           </p>

//           <div className="w-full border-t border-zinc-100 pt-4">
//             <h3 className="text-xs uppercase tracking-wider font-bold text-zinc-400 mb-3 text-left">
//               Interests
//             </h3>
//             <div className="flex flex-wrap gap-1.5 justify-start">
//               {data.interests?.map((interest, index) => (
//                 <span
//                   key={index}
//                   className="bg-rose-50 text-rose-600 text-xs px-2.5 py-1 rounded-full font-medium"
//                 >
//                   {interest}
//                 </span>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* 🔹 Right Column: Stats, Settings & About */}
//         <div className="md:col-span-2 space-y-6">
          
//           {/* Stats Card */}
//           <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
//             <h3 className="text-sm font-bold tracking-wide text-zinc-400 uppercase mb-5">
//               Dating Overview
//             </h3>
//             <div className="grid grid-cols-3 gap-4 text-center">
//               <div className="p-4 bg-rose-50 rounded-xl">
//                 <Heart className="w-6 h-6 text-rose-500 mx-auto mb-2" />
//                 <p className="text-2xl font-bold text-rose-600">{data.matches}</p>
//                 <p className="text-xs text-zinc-500 mt-0.5 font-medium">Matches</p>
//               </div>
//               <div className="p-4 bg-orange-50 rounded-xl">
//                 <MessageCircle className="w-6 h-6 text-orange-500 mx-auto mb-2" />
//                 <p className="text-2xl font-bold text-orange-600">{data.likes_received}</p>
//                 <p className="text-xs text-zinc-500 mt-0.5 font-medium">Likes Received</p>
//               </div>
//               <div className="p-4 bg-indigo-50 rounded-xl">
//                 <ImageIcon className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
//                 <p className="text-2xl font-bold text-indigo-600">{data.photos_count}</p>
//                 <p className="text-xs text-zinc-500 mt-0.5 font-medium">Photos</p>
//               </div>
//             </div>
//           </div>

//           {/* About Card */}
//           <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
//             <h3 className="text-sm font-bold tracking-wide text-zinc-400 uppercase mb-3">
//               About Me
//             </h3>
//             <p className="text-zinc-700 leading-relaxed text-sm">
//               {data.about || "This user hasn't written an about section yet."}
//             </p>
//           </div>

//           {/* Settings Card */}
//           <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
//             <h3 className="text-sm font-bold tracking-wide text-zinc-400 uppercase mb-4">
//               Preferences & Settings
//             </h3>
//             <div className="space-y-4">
//               <div className="flex justify-between items-center py-2 border-b border-zinc-50">
//                 <div className="flex items-center gap-3">
//                   <ShieldCheck className="w-5 h-5 text-zinc-400" />
//                   <span className="text-sm font-medium text-zinc-700">Discoverable</span>
//                 </div>
//                 <span className={`text-sm font-semibold ${data.is_discoverable ? 'text-green-600' : 'text-zinc-400'}`}>
//                   {data.is_discoverable ? 'On' : 'Off'}
//                 </span>
//               </div>
//               <div className="flex justify-between items-center py-2 border-b border-zinc-50">
//                 <div className="flex items-center gap-3">
//                   <Eye className="w-5 h-5 text-zinc-400" />
//                   <span className="text-sm font-medium text-zinc-700">Blur sensitive content</span>
//                 </div>
//                 <span className={`text-sm font-semibold ${data.blur_sensitive_content ? 'text-indigo-600' : 'text-zinc-400'}`}>
//                   {data.blur_sensitive_content ? 'Active' : 'Inactive'}
//                 </span>
//               </div>
//               <div className="flex justify-between items-center pt-2">
//                 <span className="text-sm font-medium text-zinc-500">Distance Radius</span>
//                 <span className="text-sm font-bold text-zinc-800">{data.distance_radius} km</span>
//               </div>
//             </div>
//           </div>
          
//         </div>
//       </div>
//     </div>
//   );
// }





"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, MapPin, Settings, Edit3, Eye, BadgeCheck } from "lucide-react";
import { Profile, ProfileStats, ProfileSettings, ProfileImage } from "@/types/profile.types";

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
              <BadgeCheck className="w-5 h-5 text-rose-500" title="Verified" />
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

// components/profile/SocialLinkBadge.tsx

import type { SocialPlatform } from "@/shared/types/profile.types";

interface SocialLinkBadgeProps {
  platform: SocialPlatform;
  url: string;
}

const PLATFORM_META: Record<
  SocialPlatform,
  { label: string; color: string; icon: string }
> = {
  instagram: {
    label: "Instagram",
    color: "bg-pink-50 text-pink-600 border-pink-200 hover:bg-pink-100",
    icon: "📸",
  },
  spotify: {
    label: "Spotify",
    color: "bg-green-50 text-green-600 border-green-200 hover:bg-green-100",
    icon: "🎵",
  },
  linkedin: {
    label: "LinkedIn",
    color: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100",
    icon: "💼",
  },
  twitter: {
    label: "Twitter",
    color: "bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100",
    icon: "🐦",
  },
  facebook: {
    label: "Facebook",
    color: "bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100",
    icon: "📘",
  },
  snapchat: {
    label: "Snapchat",
    color: "bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100",
    icon: "👻",
  },
  tiktok: {
    label: "TikTok",
    color: "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100",
    icon: "🎬",
  },
  other: {
    label: "Link",
    color: "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100",
    icon: "🔗",
  },
};

export default function SocialLinkBadge({ platform, url }: SocialLinkBadgeProps) {
  const meta = PLATFORM_META[platform] ?? PLATFORM_META.other;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-colors duration-150 ${meta.color}`}
    >
      <span>{meta.icon}</span>
      <span>{meta.label}</span>
    </a>
  );
}

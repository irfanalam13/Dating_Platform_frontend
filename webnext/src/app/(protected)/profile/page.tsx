"use client";

import { useRouter } from "next/navigation"; // ✅ 1. Import useRouter
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import MyProfilePage, { ProfileData } from "@/features/profile/components/ProfileCard";

export default function ProfileRoutePage() {
  const { user, loading, isAuthenticated } = useCurrentUser();
  const router = useRouter(); // ✅ 2. Initialize router

  // Handle loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50">
        <p className="text-zinc-400 animate-pulse font-medium">Loading your dating profile...</p>
      </div>
    );
  }

  // Fallback for unauthenticated state
  if (!isAuthenticated || !user) {
    return null; 
  }

  // Map the API/DB data to the precise shape expected by the UI
  const profileData: ProfileData = {
    id: user.id || 1,
    full_name: user.name || user.full_name || "Your Name",
    profile_image: user.image || user.profile_image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
    location: user.location || "San Francisco, CA",
    age: user.age || 27,
    bio: user.bio || "Coffee enthusiast, loves outdoor hikes, and good conversation.",
    matches: user.matches || 42,
    likes_received: user.likes_received || 128,
    photos_count: user.photos_count || 4,
    about: user.about || "Let's grab a drink and see where things go! I work in design but spend my weekends exploring local restaurants. Looking for someone with a similar energy.",
    interests: user.interests || ["Coffee", "Hiking", "Photography", "Travel"],
    is_discoverable: user.settings?.is_discoverable ?? true,
    blur_sensitive_content: user.settings?.blur_sensitive_content ?? true,
    distance_radius: user.settings?.distance_radius ?? 25,
  };

  // ✅ 3. Pass the onSettingsClick prop to satisfy TypeScript and handle routing
  return (
    <MyProfilePage 
      data={profileData} 
      onSettingsClick={() => router.push('/settings')} 
    />
  );
}
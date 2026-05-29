// import type { Profile, ProfileImage, PublicProfile } from "@/shared/types/profile.types";

// export function toPublicProfile(
//   profile: Profile,
//   images: ProfileImage[] = [],
//   options?: { isOnline?: boolean; distanceKm?: number | null }
// ): PublicProfile {
//   const sorted = [
//     ...images.filter((img) => img.is_primary),
//     ...images.filter((img) => !img.is_primary),
//   ];

//   const photos =
//     sorted.length > 0
//       ? sorted.map((img) => img.url)
//       : profile.profile_image_url
//       ? [profile.profile_image_url]
//       : [];

//   return {
//     id: profile.id,
//     name: profile.full_name,
//     age: profile.age,
//     bio: profile.bio,
//     location: profile.city,
//     distance_km: options?.distanceKm ?? null,
//     is_online: options?.isOnline ?? false,
//     photos,
//     profession: profile.career,
//     education: profile.education,
//     looking_for: profile.relationship_intent,
//     languages: [],                          // not on Profile; extend if your API adds it
//     interests: profile.compatibility_tags ?? [],
//     social_links: [],                       // not on Profile; extend if your API adds it
//     profile_views_count: 0,
//   };
// }
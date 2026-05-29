// import ProfileClient from "./ProfileClient";

// export default function ProfileRoutePage() {
//   return <ProfileClient />;
// }

"use client";

import { useMyProfile } from "@/features/profile/hooks/useProfile";
import ProfileClient from "@/features/profile/components/ProfileClient";

export default function MyProfilePage() {
  const { data, isLoading } = useMyProfile(); // ✅ no args needed

  return (
    <ProfileClient
      mode="own"
      data={data}
      isLoading={isLoading}
    />
  );
}
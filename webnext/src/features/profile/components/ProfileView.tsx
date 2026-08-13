'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProfileCard from './ProfileCard';
import SettingsPage from './SettingsPage';
import { useMyProfile } from '@/features/profile/hooks/useProfile';

export default function ProfileView() {
  const [showSettings] = useState(false);
  const router = useRouter();
  const { data } = useMyProfile();

  if (showSettings) {
    return <SettingsPage />;
  }

  return (
    <div>
      <ProfileCard />
      <button onClick={() => router.push(`/profile/${data?.id}`)}>
        View Public Profile
      </button>
    </div>
  );
}
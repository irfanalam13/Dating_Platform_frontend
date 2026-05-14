'use client';

import { useState } from 'react';
import ProfileCard from './ProfileCard';
import SettingsPage from './SettingsPage';
import type { Profile } from '@/shared/types/profile.types';

export default function ProfileView({ data }: { data: Profile }) {
  const [showSettings, setShowSettings] = useState(false);

  if (showSettings) {
    return <SettingsPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <ProfileCard
        profile={data}          // 👈 change data to profile
        stats={{                // 👈 required prop
          likes: 0,
          matches: 0,
          views: 0,
        }}
        settings={{             // 👈 required prop
          discoverable: true,
          show_online_status: true,
          show_distance: true,
          is_private: false,
        }}
        onSettingsClick={() => setShowSettings(true)}
      />
    </div>
  );
}

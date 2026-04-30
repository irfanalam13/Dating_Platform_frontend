"use client";

import Image from "next/image";

export default function ProfileCard({ data }: any) {
  if (!data) return <p>Loading...</p>;

  const { profile, stats, settings } = data;

  if (data.is_private) {
    return <p>This account is private 🔒</p>;
  }

  return (
    <div className="p-4 border rounded-xl shadow-md w-full max-w-md">
      <div className="flex items-center gap-4">
        <Image
          src={profile.profile_image || "/default.png"}
          alt="profile"
          width={80}
          height={80}
          className="rounded-full"
        />
        <div>
          <p className="font-bold text-lg">{profile.bio}</p>
          <p className="text-sm text-gray-500">{profile.location}</p>
        </div>
      </div>

      <div className="flex justify-around mt-4 text-center">
        <div>
          <p className="font-bold">{stats.followers}</p>
          <p>Followers</p>
        </div>
        <div>
          <p className="font-bold">{stats.following}</p>
          <p>Following</p>
        </div>
        <div>
          <p className="font-bold">{stats.posts}</p>
          <p>Posts</p>
        </div>
      </div>
    </div>
  );
}